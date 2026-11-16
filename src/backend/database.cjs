const { ipcMain } = require('electron')

const sqlite3 = require('better-sqlite3-multiple-ciphers')
const Store = require('electron-store')
const store = new Store()
const {sleep, containsOnlyEmojis} = require('./utils.cjs')
const { isHex64 } = require('./validate.cjs')
const { Hugin } = require('./account.cjs')
const { sanitizeText } = require('hugin-network/sanitize')

// Room and feed rows keep the text as it was signed. What the renderer reads from them is plain
// text (hugin-network `sanitizeText`, desktop's sanitize-html policy), with an empty room name shown
// as 'Anonymous'.
const displayText = (v) => (typeof v === 'string' ? sanitizeText(v) : v)
const displayName = (v) => (v === '' || v === undefined || v === null ? 'Anonymous' : displayText(v))
const displayRow = (row) => {
    if (!row || typeof row !== 'object') return row
    const out = { ...row }
    for (const k of ['message', 'reply', 'nickname']) {
        if (k in out) out[k] = displayText(out[k])
    }
    if ('name' in out) out.name = displayName(out.name)
    return out
}

// A stored tip ('' / JSON) as hugin-network takes it: false or { amount, receiver }.
const parseTip = (tip) => {
    if (!tip) return false
    if (typeof tip === 'object') return tip
    try {
        const t = JSON.parse(tip)
        return t && typeof t === 'object' ? t : false
    } catch (e) {
        return false
    }
}

// A room message row as hugin-network serves it to peers (joined.messages, send-history,
// missing-messages): every signed field unchanged, the timestamp as the integer it was stored as.
const hostRoomRow = (row) => {
    if (!row || typeof row !== 'object') return null
    const timestamp = typeof row.timestamp === 'number' ? row.timestamp : Number(row.timestamp)
    return {
        message: row.message,
        address: row.address,
        signature: row.signature,
        room: row.room,
        timestamp,
        name: typeof row.name === 'string' ? row.name : '',
        reply: typeof row.reply === 'string' ? row.reply : '',
        hash: row.hash,
        tip: parseTip(row.tip)
    }
}

const ROOM_ROW_COLUMNS = 'message, address, signature, room, timestamp, name, reply, hash, tip'

const closeDB = async () => {
    if (!database) return
    try {
      database.close()
    } catch (e) {
      // Ignore shutdown close errors on partially initialized startup.
    }
}

let database
//CREATE DB
const loadDB = async (userDataDir, dbPath, privKey) => {
    database = new sqlite3(dbPath)
    //If db is encrypted. Read with key
    try {
    if (store.get('sql.encrypted')) database.key(Buffer.from(privKey[0]))
    else  {
        store.set({
            sql: {
                encrypted: true
            }
        });
    }

    database.rekey(Buffer.from(privKey[0]))
    } catch(e) {
        Hugin.send('error-notify-message', 'Database could not load...')
        return
    }
    if(!store.get('delete.after')) {
        store.set({
            delete: {
                after: 0
            }
        })
    }
    const removeAfter = parseInt(Date.now()) - store.get('delete.after') * 86400000

    createTables()
    migrateSchema()
    try {
    const welcome = database.prepare('SELECT message FROM messages WHERE timestamp = 1650919475320').get()
    // If the message doesnt already exist, create it
    if(!welcome) {
        
        //Create welcome PM message
        welcomeMessage()
        //Create Hugin welcome contact
        firstContact()
        await sleep(100)

    }
    } catch(e) {
        console.log(e)
    }
    if(store.get('delete.after') !== 0) {
    
     database.prepare(`DELETE FROM groupmessages WHERE timestamp < ?`).run(removeAfter)
    }

    markMessagesReadByChat(welcomeAddress)
}


//CREATE TABLES

const createTables = () => {
    messagesTable()
    knownTxsTable()
    contactsTable()
    kemIdentityTable()
    groupMessageTable()
    groupsTable()
    roomsTable()
    blockListTable()
    groupChannelsMessagesTable()
    roomKeysTable()
    roomUserTable()
    feedMessageTable()
    friendRequestsTable()
}

const migrateSchema = () => {
    try {
        const info = database.prepare('PRAGMA table_info(groupmessages)').all()
        const hasGrp = info.some(c => c.name === 'grp')
        if (hasGrp) {
            database.prepare('ALTER TABLE groupmessages RENAME COLUMN grp TO room').run()
            database.prepare('ALTER TABLE groupmessages RENAME COLUMN time TO timestamp').run()
        }
    } catch (e) {}
    try {
        const info = database.prepare('PRAGMA table_info(messages)').all()
        const hasMsg = info.some(c => c.name === 'msg')
        if (hasMsg) {
            database.prepare('ALTER TABLE messages RENAME COLUMN msg TO message').run()
            database.prepare('ALTER TABLE messages RENAME COLUMN chat TO conversation').run()
        }
    } catch (e) {}
    try { database.prepare('ALTER TABLE messages ADD COLUMN hash TEXT').run() } catch (e) {}
    try { database.prepare('ALTER TABLE messages ADD COLUMN reply TEXT DEFAULT ""').run() } catch (e) {}
    try { database.prepare('ALTER TABLE messages ADD COLUMN tip TEXT').run() } catch (e) {}
    try { database.prepare('ALTER TABLE messages ADD COLUMN status TEXT DEFAULT "success"').run() } catch (e) {}
    // Restore any contact row that was silently wiped by the pre-fix
    // saveThisContact -> REPLACE INTO / UNIQUE(key) collision path. If we
    // have message history for an address but no contacts row for it, mint
    // a stub row so the DM shows up in the sidebar again. Name will be
    // 'Anon' — the peer will get their real name back the next time they
    // send a message (check_for_pm_message updates it via save_contact).
    try {
        const orphans = database.prepare(`
            SELECT DISTINCT conversation AS address
            FROM messages
            WHERE conversation IS NOT NULL
              AND length(conversation) = 99
              AND conversation NOT IN (SELECT address FROM contacts WHERE address IS NOT NULL)
        `).all()
        for (const row of orphans) {
            try {
                database.prepare(
                    'INSERT INTO contacts (address, key, name) VALUES (?, NULL, ?)'
                ).run([row.address, 'Anon'])
                console.log(`[db] Backfilled orphaned conversation as contact: ${row.address}`)
            } catch (err) {
                console.log(`[db] Backfill failed for ${row.address}:`, err)
            }
        }
    } catch (err) {
        console.log('[db] Orphaned-contact backfill migration failed:', err)
    }
    migrateMessagesUniqueHash()
    dmCryptoTable()
}

// The DM crypto state of each address (hugin-network/dm: message key, pending ML-KEM capsule, the
// contact's ML-KEM public key, handshake time, previous keys) as one JSON object. Kept apart from
// `contacts`: a first message from an address that is not a contact yet has state too.
const dmCryptoTable = () => {
    try {
        database.prepare(`
            CREATE TABLE IF NOT EXISTS dm_crypto (
                address TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                updated INTEGER NOT NULL
            )`).run()
    } catch (e) {
        console.log('[db] dm_crypto table not created:', e.message)
    }
}

// The stored state of `address`, or null (none, or not readable as JSON). Throws when the
// database cannot be read, so the caller can try again later.
const loadDmCrypto = (address) => {
    if (typeof address !== 'string' || address.length !== 99) return null
    const row = database.prepare('SELECT state FROM dm_crypto WHERE address = ?').get(address)
    if (!row || typeof row.state !== 'string') return null
    try {
        return JSON.parse(row.state)
    } catch (e) {
        return null
    }
}

const saveDmCrypto = (address, state) => {
    if (typeof address !== 'string' || address.length !== 99) throw new Error('not an address')
    database.prepare(
        `INSERT INTO dm_crypto (address, state, updated) VALUES (?, ?, ?)
         ON CONFLICT(address) DO UPDATE SET state = excluded.state, updated = excluded.updated`
    ).run([address, JSON.stringify(state), Date.now()])
}

// Messages are unique on their hash. Rows without a hash (local notices) are not covered by
// the index; saveMsg dedupes those itself.
const createMessageHashIndex = () => {
    try {
        database.prepare(
            `CREATE UNIQUE INDEX IF NOT EXISTS messages_hash_unique
             ON messages (hash) WHERE hash IS NOT NULL AND hash != ''`
        ).run()
    } catch (e) {
        console.log('[db] messages hash index not created:', e.message)
    }
}

// Tables created by earlier versions carry UNIQUE(timestamp). Rebuild them once without it
// (keeping the first row per hash), then add the hash index.
const migrateMessagesUniqueHash = () => {
    try {
        const uniqueOnTimestamp = database.prepare('PRAGMA index_list(messages)').all()
            .filter((ix) => ix.unique && ix.origin === 'u')
            .some((ix) => {
                const cols = database.prepare('SELECT name FROM pragma_index_info(?)').all(ix.name)
                return cols.length === 1 && cols[0].name === 'timestamp'
            })
        if (!uniqueOnTimestamp) {
            createMessageHashIndex()
            return
        }
        database.transaction(() => {
            database.prepare(`
                CREATE TABLE messages_rebuild (
                   message TEXT,
                   conversation TEXT,
                   sent BOOLEAN,
                   timestamp TEXT,
                   read INTEGER DEFAULT 0,
                   hash TEXT,
                   reply TEXT DEFAULT '',
                   tip TEXT,
                   status TEXT DEFAULT 'success'
                )`).run()
            database.prepare(`
                INSERT INTO messages_rebuild
                    (message, conversation, sent, timestamp, read, hash, reply, tip, status)
                SELECT message, conversation, sent, timestamp, read, hash, reply, tip, status
                FROM messages
                WHERE hash IS NULL OR hash = '' OR rowid IN (
                    SELECT min(rowid) FROM messages WHERE hash IS NOT NULL AND hash != '' GROUP BY hash
                )`).run()
            database.prepare('DROP TABLE messages').run()
            database.prepare('ALTER TABLE messages_rebuild RENAME TO messages').run()
            createMessageHashIndex()
        })()
        console.log('[db] messages table rebuilt with a unique hash index')
    } catch (err) {
        console.log('[db] messages table rebuild failed:', err)
    }
}

const welcomeAddress =
    'SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1'

const contactsTable = () => {
    const contactsTable = `
                    CREATE TABLE IF NOT EXISTS contacts (
                       address TEXT,
                       key TEXT,
                       name TEXT,
                       -- pending_kem_capsule, peer_kem_pub (and the ML-KEM key
                       -- earlier versions kept in "key") are no longer read or
                       -- written: the DM crypto state is in dm_crypto.
                       pending_kem_capsule TEXT DEFAULT '',
                       peer_kem_pub TEXT DEFAULT '',
                       UNIQUE (key)
                   )`
    return new Promise(
        (resolve, reject) => {
           database.prepare(contactsTable).run()
           // Idempotent migrations for installs created before the columns.
           try {
             database.prepare(
               "ALTER TABLE contacts ADD COLUMN pending_kem_capsule TEXT DEFAULT ''"
             ).run()
           } catch (_) {
             // Column already exists.
           }
           try {
             database.prepare(
               "ALTER TABLE contacts ADD COLUMN peer_kem_pub TEXT DEFAULT ''"
             ).run()
           } catch (_) {
             // Column already exists.
           }
        },
        () => {
            resolve()
        }
    )
}

// Single-row store for the device's long-lived ML-KEM-512 identity keypair.
// Both halves persisted hex-encoded. The whole DB is at-rest encrypted via
// better-sqlite3-multiple-ciphers (wallet passphrase), so this is the right
// home for the secret — no separate OS-keystore dance.
const kemIdentityTable = () => {
    const sql = `
        CREATE TABLE IF NOT EXISTS kem_identity (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            public_key TEXT NOT NULL,
            secret_key TEXT NOT NULL,
            alg TEXT NOT NULL DEFAULT 'ml_kem512',
            created INTEGER NOT NULL
        )
    `
    database.prepare(sql).run()
}

const loadKemIdentity = () => {
    const row = database.prepare('SELECT * FROM kem_identity WHERE id = 1').get()
    if (!row) return null
    return {
        publicKey: row.public_key,
        secretKey: row.secret_key,
        alg: row.alg,
        created: row.created,
    }
}

const saveKemIdentity = ({ publicKey, secretKey }) => {
    database.prepare(
        `REPLACE INTO kem_identity (id, public_key, secret_key, alg, created)
         VALUES (1, ?, ?, 'ml_kem512', ?)`
    ).run([publicKey, secretKey, Date.now()])
}

const knownTxsTable = () => {
    const knownTxTable = `
                  CREATE TABLE IF NOT EXISTS knownTxs (
                     hash TEXT,
                     UNIQUE (hash)
                 )`
    return new Promise(
        (resolve, reject) => {
          database.prepare(knownTxTable).run()
        },
        () => {
            resolve()
        }
    )
}

function messagesTable() {
    const messageTable = `
                CREATE TABLE IF NOT EXISTS messages (
                   message TEXT,
                   conversation TEXT,
                   sent BOOLEAN,
                   timestamp TEXT,
                   read INTEGER DEFAULT 0,
                   hash TEXT,
                   reply TEXT DEFAULT '',
                   tip TEXT,
                   status TEXT DEFAULT 'success'
               )`
    return new Promise(
        (resolve, reject) => {
           database.prepare(messageTable).run()
           try {
               database.prepare('ALTER TABLE messages ADD COLUMN read INTEGER DEFAULT 0').run()
           } catch (e) {}
           createMessageHashIndex()
        },
        () => {
            resolve()
        }
    )
}

const groupsTable = () => {
    const groupsTable = `
            CREATE TABLE IF NOT EXISTS pgroups (
              key TEXT,
              name TEXT,
              UNIQUE (key)
          )`
    return new Promise(
        (resolve, reject) => {
           database.prepare(groupsTable).run()
        },
        () => {
            resolve()
        }
    )
}

const roomsTable = () => {
    const roomTable = `
            CREATE TABLE IF NOT EXISTS rooms (
              key TEXT,
              name TEXT,
              UNIQUE (key)
          )`
    return new Promise(
        (resolve, reject) => {
           database.prepare(roomTable).run()
        },
        () => {
            resolve()
        }
    )
}

const groupMessageTable = () => {
    const groupTable = `
            CREATE TABLE IF NOT EXISTS groupmessages (
              message TEXT,
              address TEXT,
              signature TEXT,
              room TEXT,
              timestamp TEXT,
              name TEXT,
              thread TEXT,
              reply TEXT,
              hash TEXT UNIQUE,
              sent BOOLEAN
            )`

        
    return new Promise(
        (resolve, reject) => {
            database.prepare(groupTable).run()
            console.log("R:D::DSA:DA:DA:DA:AD:A:_------")
            try {
                const update = `ALTER TABLE groupmessages ADD tip TEXT`
                 database.prepare(update).run()
             } catch(e) {
             }
            try {
                database.prepare('ALTER TABLE groupmessages ADD COLUMN read INTEGER DEFAULT 0').run()
            } catch (e) {}
        },
        () => {
            console.log("WOOOOOO OR:D::DSA:DA:DA:DA:AD:A:_------")
            try {
                const update = `ALTER TABLE groupmessages ADD tip TEXT`
                 database.prepare(update).run()
             } catch(e) {
             }
            try {
                database.prepare('ALTER TABLE groupmessages ADD COLUMN read INTEGER DEFAULT 0').run()
            } catch (e) {}

            resolve()
        }
    )
}

const blockListTable = () => {
    const blockList = `
                  CREATE TABLE IF NOT EXISTS blocklist (
                     address TEXT,
                     name TEXT,
                     UNIQUE (address)
                 )`
    return new Promise(
        (resolve, reject) => {
            database.prepare(blockList).run()
        },
        () => {
            resolve()
        }
    )
}

const groupChannelsMessagesTable = () => {
    const channelMessage = `
                  CREATE TABLE IF NOT EXISTS channelmessage (
                     hash TEXT,
                     time TEXT,
                     channel TEXT,
                     room TEXT,
                     read INTEGER DEFAULT 0,
                     UNIQUE (hash)
                 )`
    return new Promise(
        (resolve, reject) => {
            database.prepare(channelMessage).run()
            try {
                database.prepare('ALTER TABLE channelmessage ADD COLUMN read INTEGER DEFAULT 0').run()
            } catch (e) {}
        },
        () => {
            resolve()
        }
    )
}

const welcomeMessage = () => {
    const huginMessage = `INSERT INTO messages (message, conversation, sent, timestamp, read)
                          VALUES (?, ?, ?, ?, 1)`
    return new Promise(
        (resolve, reject) => {
            database.prepare(huginMessage).run(
                ['Welcome to hugin', welcomeAddress, 0, '1650919475320']
            )
            console.log('created welcome msg')
        },
        () => {
            resolve()
        }
        
    )
}

const firstContact = () => {
    const first_Contact = `INSERT INTO contacts (address, key, name)
                          VALUES (?, ?, ?)`
    return new Promise(
        (resolve, reject) => {
            database.prepare(first_Contact).run(
                [
                    welcomeAddress,
                    '133376bcb04a2b6c62fc9ebdd719fbbc0c680aa411a8e5fd76536915371bba7f',
                    'Hugin',
                ]
            )
            console.log('created first contact msg')
        },
        () => {
            resolve()
        }
    )
}

const roomKeysTable = () => {
    const roomKeys = `
    CREATE TABLE IF NOT EXISTS roomkeys (
       priv TEXT,
       invite TEXT,
       UNIQUE (invite)
   )`
   return new Promise(
    (resolve, reject) => {
        database.prepare(roomKeys).run()
    },
    () => {
        resolve()
    })
}

const roomUserTable = () => {

    const roomUsers =  `CREATE TABLE IF NOT EXISTS roomusers (
        name TEXT NOT NULL,
        address TEXT NOT NULL,
        room TEXT NOT NULL,
        avatar TEXT,
        lastseen INT DEFAULT 0,
        PRIMARY KEY (address, room)
    )`;

   return new Promise(
    (resolve, reject) => {
        database.prepare(roomUsers).run()
    },
    () => {
        resolve()
    })

}

const feedMessageTable = () => {
    
   const feedMessage = `CREATE TABLE IF NOT EXISTS feedmessages ( 
        address TEXT,
        message TEXT,
        reply TEXT,
        timestamp INT,
        nickname TEXT,
        hash TEXT,
        signature TEXT,
        read INTEGER DEFAULT 0,
        UNIQUE (hash)
    )`
   return new Promise(
    (resolve, reject) => {
        database.prepare(feedMessage).run()
        try {
            database.prepare('ALTER TABLE feedmessages ADD COLUMN read INTEGER DEFAULT 0').run()
        } catch (e) {}
        // The tip is part of what a feed post's signature covers, so it is stored with the
        // post (JSON, '' for none) and served back unchanged in feed history.
        try {
            database.prepare('ALTER TABLE feedmessages ADD COLUMN tip TEXT').run()
        } catch (e) {}
    })
}



//DATABASE REQUESTS

const loadGroups = () => {
    const rows = []
    const getAllGroups = `SELECT * FROM pgroups`
    const groups = database.prepare(getAllGroups).all()

    for(const group of groups) {
        rows.push(group)
    }
    return rows
}

const loadRooms = () => {
    const rows = []
    const getAllRooms = `SELECT * FROM rooms`
    const rooms = database.prepare(getAllRooms).all()

    for(const room of rooms) {
        rows.push(room)
    }
    return rows
}

const loadRoomUsers = async (key) => {
    const rows = []
    const getAllUsers = `
        SELECT *
        FROM roomusers
        WHERE room = ?
    `
    const users = database.prepare(getAllUsers)
    for(const user of users.iterate(key)) {
        const avatar = Buffer.from(user.avatar, 'base64')
        user.avatar = avatar
        rows.push(user)
    }
    return rows
}

const saveRoomUser = (user) => {
    console.log("Save this user", user.name)
    try {
        const avatarBase64 = Buffer.from(user.avatar).toString('base64')
        database.prepare(`
            INSERT INTO roomusers (name, address, room, avatar, lastseen) VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(address, room) DO UPDATE SET
                name=excluded.name,
                lastseen=excluded.lastseen,
                avatar=CASE WHEN excluded.avatar = '' OR excluded.avatar IS NULL THEN roomusers.avatar ELSE excluded.avatar END
        `).run(user.name, user.address, user.room, avatarBase64, Date.now())
    }catch (e) {
        console.log("Error saving user:", e)
    }
}

const loadRoomKeys = () => {
    const rows = []
    const getAllRooms = `SELECT * FROM roomkeys`
    const rooms = database.prepare(getAllRooms).all()

    for(const keys of rooms) {
        rows.push(keys)
    }
    return rows
}

const loadKeys = async (start = false) => {
    //Load known public keys from db and push them to known_keys
    let contacts = await getContacts()
    let known_keys = []
    if (start) {
        contacts.forEach(function (keys) {
            known_keys.push(keys.key)
        })
        return [contacts, known_keys]
        
    }

    return contacts
}

const loadKnownTxs = async () => {
    //The node pool hashes already handled (oldest first), for the DM crypto session
    const knownTransactions = []
    return new Promise((resolve, reject) => {
        const getAllknownTxs = `SELECT * FROM knownTxs`
        const txs = database.prepare(getAllknownTxs).all()
        for(const tx of txs) {
            knownTransactions.push(tx)
        }
        resolve(knownTransactions)
    })
}

const loadBlockList = async () => {
    const blockList = []
    return new Promise((resolve, reject) => {
        const getBlockList = `SELECT * FROM blocklist`
        const blockLists = database.prepare(getBlockList).all()
        for(const block of blockLists) {
            blockList.push(block)
        }
        resolve(blockList)
    })
}

ipcMain.handle('get-groups', async (e) => {
    const groups = await getGroups()
    return groups.reverse()
})


ipcMain.handle('get-rooms', async (e) => {
    const rooms = await getRooms()
    return rooms.reverse()
})

//Get one message from every unique user from Group sorted by latest timestmap.
const getGroups = async () => {
    const my_groups = loadGroups()
    return getLatestList(my_groups)
}

//Get one message from every unique user from Room sorted by latest timestmap.
const getRooms = async () => {
    const my_rooms = loadRooms()
    return getLatestList(my_rooms)
}   


const getLatestList = async (list) => {
    const myGroups = []
    for (const chat of list) {
        const getThis = `
            SELECT *
            FROM groupmessages
            WHERE room = ?
            ORDER BY timestamp
            DESC
            LIMIT 1
        `
        const group = database.prepare(getThis).get(chat.key)
        if (group === undefined) continue 
            const newRow = {
            name: chat.name,
            message: displayText(group.message),
            room: group.room,
            timestamp: group.timestamp,
            sent: group.sent,
            key: chat.key,
            hash: group.hash,
            nick: displayName(group.name),
        }
        myGroups.push(newRow)
    }  
    return myGroups.sort((a, b) => a.timestamp - b.timestamp)
}

// Feed posts are stored as they were signed (text as sent, tip as JSON), so they can be served
// to peers in feed history and verify there.
async function saveFeedMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (await feedMessageExists(msg.hash)) return;
    const tip = msg.tip ? JSON.stringify(msg.tip) : ''
    try {
    database.prepare(
        'INSERT OR IGNORE INTO feedmessages (address, message, reply, timestamp, nickname, signature, hash, tip, read) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)',
    ).run(msg.address, msg.message, msg.reply, msg.timestamp, msg.nickname, msg.signature, msg.hash, tip)

    } catch(a) {
        console.log("Sql lite", a)
    }

  }

// Room messages are stored with every field as signed: text as sent, `name` as sent (also ''),
// `signature`, and the integer timestamp unchanged. `getRoomHistoryRows` / `getRoomMessageRow`
// hand them to hugin-network as they are; the renderer reads go through `displayRow`.
const saveGroupMsg = async (msg, offchain, channels = false) => {
    if (!msg || typeof msg !== 'object') return false
    // Room messages are unique on their hash (INSERT OR IGNORE below). Rows without a hash fall
    // back to a timestamp check.
    const hasHash = typeof msg.hash === 'string' && msg.hash.length > 0
    if (!hasHash && await groupMessageExists(msg.timestamp)) return false
   
    let channel = false

    // if (channels) {
    //     channel = sanitizeText(msg.c)
    //     saveChannelMessage(txHash, timestamp, channel, group) 
    // }

    if (typeof msg.name !== 'string') msg.name = ''

    let tip = ""
    
    if (msg.tip) {
        tip = JSON.stringify(msg.tip)
    }

    msg.sent = changeBool(msg.sent)
    // The timestamp column is TEXT: an integer goes in as its digits (a bound JS number would be
    // stored as REAL text, '1700000000000.0').
    const timestamp = typeof msg.timestamp === 'number' && Number.isSafeInteger(msg.timestamp) ? String(msg.timestamp) : msg.timestamp
    
    try {
    const result = database.prepare(
        `INSERT OR IGNORE INTO groupmessages  (
    message,
    address,
    signature,
    room,
    timestamp,
    name,
    reply,
    hash,
    sent,
    tip,
    read
          )
       VALUES
           (? ,?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        
    ).run(msg.message, msg.address, typeof msg.signature === 'string' ? msg.signature : '', msg.room, timestamp, msg.name, msg.reply, hasHash ? msg.hash : null, msg.sent, tip, msg.sent)
    if (result.changes === 0) return false
    // The returned object is what the renderer gets: an empty name is shown as 'Anonymous'.
    msg.name = displayName(msg.name)
    saveRoomUser({
        name: msg.name,
        address: msg.address,
        room: msg.room,
        avatar: '',
      });
        } catch(a) {
            console.log("Sql lite", a)
            return false
        }
    
    return msg
}

const changeBool = (b) => {
    return b ? 1 : 0
}

// Page number from the renderer -> row offset (a non-negative integer).
const pageOffset = (page, limit) => {
    const n = Number(page)
    if (!Number.isSafeInteger(n) || n <= 0) return 0
    return n * limit
}

// p2p === true  → message came via the swarm/beam channel.
// p2p === false → message came via the push node relay.
// Note: the value is echoed back on the returned object for the UI; it is
// NOT persisted (no `p2p`/`offchain` column on the messages table).
// `hash` is the content-addressed id `hc.messageHash(wireHex)` — same value
// the sender computed before shipping. Both clients agree on it without
// coordinating. Stored on the existing `messages.hash` column (added by a
// prior ALTER, see top of file). Pass '' when called from a path that has
// no wire bytes (legacy / synthetic messages).
const saveMsg = async (message, addr, sent, timestamp, p2p, hash = '') => {

    //Call offer message
    switch (message.substring(0, 1)) {
        case 'Δ':
        // Fall through
        case 'Λ':
            message = `${message.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`
            break
        default:
            message = message
    }

    sent = changeBool(sent)
    if (typeof hash !== 'string') hash = ''

    //Save to DB. Messages are unique on their hash, so a row is never replaced by a later
    //message; rows without a hash are deduped on conversation and timestamp.
    if (hash === '') {
        const existing = database.prepare(
            `SELECT 1 FROM messages
             WHERE conversation = ? AND timestamp = ? AND (hash IS NULL OR hash = '')
             LIMIT 1`
        ).get([addr, String(timestamp)])
        if (!existing) {
            database.prepare(
                `INSERT INTO messages
                    (message, conversation, sent, timestamp, read, hash)
                VALUES
                    (?, ?, ?, ?, ?, ?)`
            ).run([message, addr, sent, timestamp, sent, hash])
        }
    } else {
        database.prepare(
            `INSERT OR IGNORE INTO messages
                (message, conversation, sent, timestamp, read, hash)
            VALUES
                (?, ?, ?, ?, ?, ?)`
        ).run([message, addr, sent, timestamp, sent, hash])
    }

    let newMsg = {
        message: message,
        conversation: addr,
        sent: sent,
        timestamp: timestamp,
        hash: hash,
        p2p: p2p,
    }

    return newMsg
}

//Saves txHash as checked to avoid syncing old messages from mempool in Munin upgrade.
//Returns true when the hash was new and is now stored, false otherwise (never throws).
const saveHash = async (txHash) => {
    if (!isHex64(txHash)) return false
    try {
        const result = database.prepare(
            `INSERT OR IGNORE INTO knownTxs (hash) VALUES (?)`
        ).run([txHash])
        return result.changes > 0
    } catch (err) {
        console.log('[db] saveHash failed:', err.message)
        return false
    }
}

const saveChannelMessage = (hsh, timestamp, chnl, grp) => {

    try {
        //Save to DB
        database.prepare(
            `REPLACE INTO channelmessage
                (hash, time, channel, room, read)
            VALUES
                (?, ?, ?, ?, 0)`
        ).run([hsh, timestamp, chnl, grp])

    } catch (a) {
        console.log("database err", a)
    }
    
}

const addGroup = (group) => {
    console.log('adding', group)
    const key = group?.key
    const name = group?.name
    if (typeof key !== 'string' || key.length === 0) return
    if (typeof name !== 'string' || name.length === 0) return
    database.prepare(
        `REPLACE INTO pgroups
      (key, name)
        VALUES
          (?, ?)`
    ).run([key, name])

    console.log('saved group', group)
}

ipcMain.on('remove-group', async (e, grp) => {
    removeGroup(grp)
})

const removeGroup = (group) => {
    database.prepare(
        `DELETE FROM
        pgroups
      WHERE
        key = ?`
    ).run([group])

    console.log('removed grp', group)
}

//ADD ROOM

const addRoom = (room) => {
    console.log('adding', room)
    const key = room?.key
    const name = room?.name
    if (typeof key !== 'string' || key.length === 0) return
    if (typeof name !== 'string' || name.length === 0) return
    database.prepare(
        `REPLACE INTO rooms
      (key, name)
        VALUES
          (?, ?)`
    ).run([key, name])

    console.log('saved room', room)
}

const addRoomKeys = (invite, priv) => {
    database.prepare(
        `REPLACE INTO roomkeys
      (invite, priv)
        VALUES
          (?, ?)`
    ).run([invite, priv])

}

//REMOVE ROOM

const removeRoom = (room) => {
    database.prepare(
        `DELETE FROM
        rooms
      WHERE
        key = ?`
    ).run([room])

    console.log('removed grp', room)
}

const removeContact = (contact) => {
    database.prepare(
        `DELETE FROM
        contacts
      WHERE
        address = ?`
    ).run([contact])

    console.log('removed contact', contact)
}

const removeMessages = (contact) => {
    database.prepare(
        `DELETE FROM
        messages
      WHERE
        conversation = ?`
    ).run([contact])
}

const blockContact = (address, name) => {
    database.prepare(
        `REPLACE INTO blocklist
      (address, name)
        VALUES
          (?, ?)`
    ).run([address, name])
    console.log('Blocked contact', address)
}

const unBlockContact = (address) => {
    database.prepare(
        `DELETE FROM
        blocklist
      WHERE
        address = ?`
    ).run([address])

    console.log('Removed from block list', address)
}

//Get all messages from db
const getMessages = () => {
    const rows = []
    return new Promise((resolve, reject) => {
        const getAllMessages = `SELECT * FROM messages`
        const messages = database.prepare(getAllMessages).all()

        for(const message of messages) {
            rows.push(message)
        }
        resolve(rows)
    })
}

//Get one message from every unique user sorted by latest timestmap.
const getConversations = async () => {
    let contacts = await getContacts()
    if (contacts.length > 1 && contacts.some((a) => a.address === welcomeAddress)) {
        removeContact(welcomeAddress)
        removeMessages(welcomeAddress)
    }
    let row
    const myConversations = []
    for (const chat of contacts) {
        if (chat === undefined) continue
        const getThis = `
            SELECT *
            FROM messages
            WHERE conversation = ?
            ORDER BY timestamp
            DESC
            LIMIT 1
        `
        const conv = database.prepare(getThis).get(chat.conversation)
        if (conv === undefined) continue
        row = {
            name: chat.name,
            message: conv.message,
            conversation: conv.conversation,
            timestamp: conv.timestamp,
            sent: conv.sent,
            key: chat.key,
        }
        myConversations.push(row)
    }

    return myConversations.sort((a,b) => a.timestamp - b.timestamp)
}

//Get a chosen conversation from the reciepients xkr address.
const getConversation = async (chat, page) => {
    const limit = 100
    const offset = pageOffset(page, limit)
    
    const thisConversation = []
    return new Promise((resolve, reject) => {
        const getChat = `SELECT
            message,
            conversation,
            sent,
            timestamp,
            hash,
            reply
        FROM
            messages
        WHERE conversation = ?
        ORDER BY
            timestamp
        DESC
        LIMIT ? OFFSET ?`
        
        const stmt = database.prepare(getChat)
        for(const row of stmt.iterate(chat, limit, offset)) {
            if (row === undefined) continue
            thisConversation.push(row)
        }
        resolve(thisConversation)
    })
}

const getUnreadMessages = () => {
    return database.prepare('SELECT * FROM messages WHERE read = 0 ORDER BY timestamp DESC').all()
}

const getUnreadGroupMessages = () => {
    return database.prepare("SELECT * FROM groupmessages WHERE read = 0 AND (reply IS NULL OR reply = '') ORDER BY timestamp DESC").all()
}

const getUnreadFeedMessages = () => {
    return database.prepare("SELECT * FROM feedmessages WHERE read = 0 AND (reply IS NULL OR reply = '') ORDER BY timestamp DESC").all();
}

const getUnreadChannelMessages = () => {
    return database.prepare('SELECT * FROM channelmessage WHERE read = 0').all()
}


const markMessageRead = (timestamp) => {
    database.prepare('UPDATE messages SET read = 1 WHERE timestamp = ?').run(timestamp)
}

const markGroupMessageRead = (hash) => {
    database.prepare('UPDATE groupmessages SET read = 1 WHERE hash = ?').run(hash)
}

const markChannelMessageRead = (hash) => {
    database.prepare('UPDATE channelmessage SET read = 1 WHERE hash = ?').run(hash)
}

const markFeedMessageRead = (hash) => {
    database.prepare('UPDATE feedmessages SET read = 1 WHERE hash = ?').run(hash)
}

const markMessagesReadByChat = (chat) => {
    database.prepare('UPDATE messages SET read = 1 WHERE conversation = ?').run(chat)
}

const markGroupMessagesReadByGroup = (grp) => {
    database.prepare('UPDATE groupmessages SET read = 1 WHERE room = ?').run(grp)
}

const markAllFeedMessagesRead = () => {
    database.prepare('UPDATE feedmessages SET read = 1 WHERE 1 = 1').run()
}

ipcMain.handle('print-group', async (e, grp, page) => {
    return await printGroup(grp, page)
})

const getFeedMessageReplies = async (hash) => {

    const replies = [];
    const reactions = [];

    return new Promise((resolve, reject) => {
        const feed = `SELECT
          *
        FROM
            feedmessages
        WHERE
            reply = ?
        ORDER BY
            timestamp
        DESC
        `
        const stmt = database.prepare(feed)

        for(const stored of stmt.iterate(hash)) {
            const row = displayRow(stored)

            if (containsOnlyEmojis(row.message) && row.message.length < 9) {
                reactions.push(row);
            } else {
                replies.push(row);
                reactions.push({message: "💬"});
            }

        }
        resolve({replies, reactions});
    })

}

const printFeed = async (page=0, sync=false) => {
    const limit = 50
    const offset = pageOffset(page, limit)
    const thisFeed = []
    return new Promise(async (resolve, reject) => {
        const feed = `SELECT
          *
        FROM
            feedmessages 
        ${sync ? '' : "WHERE reply = '' "}
        ORDER BY
            timestamp
        DESC
        LIMIT ? OFFSET ?`

        const stmt = database.prepare(feed)

        for (const row of stmt.iterate(limit, offset)) {
            if (!sync) {
                const {replies, reactions} = await getFeedMessageReplies(row.hash);
                const shown = displayRow(row)
                shown.replies = replies;
                shown.react = reactions;
                thisFeed.push(shown)
                continue
            }
            // sync: the rows as signed, for feed history to peers
            thisFeed.push(row)
        }

        resolve(thisFeed)
    })
}

//Print a chosen group from the shared key.
const printGroup = async (group, page) => {

    const limit = 50
    const offset = pageOffset(page, limit)
    const thisGroup = []
    return new Promise((resolve, reject) => {
        const getGroup = `SELECT
          message,
          address,
          signature,
          room,
          timestamp,
          name,
          reply,
          hash,
          sent,
          tip
        FROM
            groupmessages
        WHERE room = ?
        ORDER BY
            timestamp
        DESC
        LIMIT ? OFFSET ?`
        const stmt = database.prepare(getGroup)

        for(const row of stmt.iterate(group, limit, offset)) {
            if (row.address.length === 0) row.address = row.room
                    
                thisGroup.push(displayRow(row))
        }
        resolve(thisGroup)
    })
}

// The newest room messages with a stored signature, as hugin-network sends them as history
// (`host.getRoomHistory`).
const getRoomHistoryRows = async (key, limit = 50) => {
    if (typeof key !== 'string' || key.length === 0) return []
    try {
        const rows = database.prepare(
            `SELECT ${ROOM_ROW_COLUMNS} FROM groupmessages WHERE room = ? AND length(signature) = 128 ORDER BY timestamp DESC LIMIT ?`
        ).all(key, limit)
        return rows.map(hostRoomRow).filter(Boolean)
    } catch (err) {
        console.log('[db] room history lookup failed:', err.message)
        return []
    }
}

// One stored room message by hash, as hugin-network answers `request-messages` (`host.getRoomMessage`).
const getRoomMessageRow = async (hash) => {
    if (!isHex64(hash)) return null
    try {
        const row = database.prepare(`SELECT ${ROOM_ROW_COLUMNS} FROM groupmessages WHERE hash = ? LIMIT 1`).get(hash)
        return row ? hostRoomRow(row) : null
    } catch (err) {
        console.log('[db] room message lookup failed:', err.message)
        return null
    }
}


//DATABASE REQUESTS

const getChannels = async () => {
    const rows = []
    return new Promise((resolve, reject) => {
        const getChannelsMessages = `SELECT * FROM channelmessage`
        const channels = database.prepare(getChannelsMessages).all()
        
        for(const row of channels) {
            rows.push(row)
        }
        resolve(rows)
    })
}

//Get original messsage from a chosen reply hash
const getGroupReply = async (reply) => {
    let thisReply
    return new Promise((resolve, reject) => {
        let sql = `SELECT
             message,
             address,
             signature,
             room,
             timestamp,
             name,
             reply,
             hash,
             sent,
             tip
      FROM groupmessages
      WHERE hash = ?
      ORDER BY
          timestamp
      ASC`
        thisReply = database.prepare(sql).get(reply)

        resolve(thisReply ? displayRow(thisReply) : thisReply)
    })
}


//Get all contacts from db
const getContacts = async () => {
    const myContactList = []
    return new Promise((resolve, reject) => {
        const getMyContacts = `SELECT * FROM contacts`
        const stmt = database.prepare(getMyContacts)
        const contacts = stmt.all()

        for(const contact of contacts) {
            if (contact === undefined) continue
            let newRow = contact
                newRow.conversation = contact.address
                myContactList.push(newRow)
        }
        resolve(myContactList)
    })
}


// The *Exists helpers use bound parameters and resolve false on any error.
const rowExists = (sql, value) => {
    if (typeof value !== 'string' && typeof value !== 'number') return false
    try {
        return !!database.prepare(sql).get(String(value))
    } catch (err) {
        console.log('[db] lookup failed:', err.message)
        return false
    }
}

const knownTxExists = async (hash) => {
    return rowExists('SELECT 1 FROM knownTxs WHERE hash = ? LIMIT 1', hash)
}

// Dedup by the content-addressed message hash (hc.messageHash(wireHex)) so
// two PMs that happen to share a millisecond timestamp no longer collide,
// and so beam-delivered duplicates are detected reliably. When called with
// a non-empty hash we match on hash; when called with a timestamp string
// (legacy callers / hash-less rows) we fall back to timestamp matching.
const messageExists = async (hashOrTime) => {
    let exists = false
    return new Promise((resolve, reject) => {
        const arg = String(hashOrTime ?? '')
        // 64 lowercase-hex chars = a hugin-crypto messageHash. Anything
        // else (typically a numeric ms timestamp) hits the legacy path.
        const isHash = /^[0-9a-f]{64}$/.test(arg)
        const row = isHash
            ? database.prepare('SELECT 1 FROM messages WHERE hash = ?').get(arg)
            : database.prepare('SELECT 1 FROM messages WHERE timestamp = ?').get(arg)
        if (row) exists = true
        resolve(exists)
    })
}

const groupMessageExists = async (timestamp) => {
    return rowExists('SELECT 1 FROM groupmessages WHERE timestamp = ? LIMIT 1', timestamp)
}

const feedMessageExists = async (hash) => {
    return rowExists('SELECT 1 FROM feedmessages WHERE hash = ? LIMIT 1', hash)
}

const roomMessageExists = async (hash) => {
    return rowExists('SELECT 1 FROM groupmessages WHERE hash = ? LIMIT 1', hash)
}

const getLatestRoomHashes = async (key) => {
    const offset = 0
    const limit = 25
    const hashes = []
    return new Promise((resolve, reject) => {
        // only messages that can be served to peers (stored with their signature)
        const latestRoomHashes = 
        `SELECT *
        FROM groupmessages
        WHERE room = ? AND length(signature) = 128
        ORDER BY
            timestamp
        DESC
        LIMIT ? OFFSET ?`

        const hashList = database.prepare(latestRoomHashes)
        for(const row of hashList.iterate(key, limit, offset)) {
            if(row) {
                if (row.message === "Joined room") continue
                hashes.push(row.hash)
            }
        }
        resolve(hashes)
    })

}


const saveThisContact = async (addr, key, name) => {
    // Never REPLACE INTO on `contacts` — the UNIQUE(key) constraint on the
    // key column causes REPLACE to DELETE any other row whose `key` matches
    // what we're inserting. With every fresh contact being seeded with
    // key='' (or key=NULL) that path silently wiped existing pre-handshake
    // chats each time a new contact arrived.
    //
    // Semantics now:
    //   - Row exists for `addr` → UPDATE the display name only.
    //   - Row does NOT exist → INSERT with key=NULL (multiple NULL keys are
    //     allowed under UNIQUE(key), whereas '' would collide across
    //     contacts).
    //
    // The `key` parameter is preserved in the signature for backwards
    // compatibility with any external caller, but it is deliberately not
    // written — the sole existing caller (save_contact in messages.cjs)
    // always passes '' anyway.
    const existing = database
        .prepare('SELECT 1 FROM contacts WHERE address = ? LIMIT 1')
        .get(addr)
    if (existing) {
        database.prepare('UPDATE contacts SET name = ? WHERE address = ?').run([name, addr])
        return
    }
    database.prepare(
        'INSERT INTO contacts (address, key, name) VALUES (?, NULL, ?)'
    ).run([addr, name])
}

const friendRequestsTable = () => {
    database.prepare(`
        CREATE TABLE IF NOT EXISTS friend_requests (
            address TEXT,
            hugin TEXT,
            name TEXT,
            room TEXT,
            room_name TEXT DEFAULT '',
            timestamp INTEGER,
            UNIQUE (address)
        )
    `).run()
    try { database.prepare(`ALTER TABLE friend_requests ADD COLUMN room_name TEXT DEFAULT ''`).run() } catch (e) {}
}

const saveFriendRequest = async (req) => {
    database.prepare(
        `REPLACE INTO friend_requests (address, hugin, name, room, room_name, timestamp)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).run([req.address, req.hugin, req.name, req.room || '', req.roomName || '', req.timestamp])
}

const getFriendRequests = async () => {
    return database.prepare('SELECT * FROM friend_requests ORDER BY timestamp DESC').all()
}

const removeFriendRequest = async (address) => {
    database.prepare('DELETE FROM friend_requests WHERE address = ?').run(address)
}

const deleteMessage = async (hash) => {
    console.log("Deleting message", hash)
    database.prepare(`DELETE FROM groupmessages WHERE hash = ?`).run(hash)
}

const deletePrivateMessage = (timestamp) => {
    if (timestamp === undefined || timestamp === null) return
    database.prepare(`DELETE FROM messages WHERE timestamp = ?`).run(String(timestamp))
}

process.on('exit', async () => await closeDB());
process.on('SIGHUP', async () => process.exit(128 + 1));
process.on('SIGINT', async () => process.exit(128 + 2));
process.on('SIGTERM', async () => process.exit(128 + 15));


module.exports = {getRoomHistoryRows, getRoomMessageRow, getFeedMessageReplies, feedMessageExists, loadRoomUsers, printFeed, saveFeedMessage, saveRoomUser, saveHash, roomMessageExists,  getLatestRoomHashes, loadRoomKeys, removeRoom, getRooms ,addRoomKeys, firstContact, welcomeMessage, loadDB, loadGroups, loadRooms, loadKeys, getGroups, saveGroupMsg, unBlockContact, blockContact, removeMessages, removeContact, removeGroup, addGroup, loadBlockList, getConversation, getConversations, loadKnownTxs, getMessages, getUnreadMessages, getUnreadGroupMessages, getUnreadChannelMessages, getUnreadFeedMessages, markMessageRead, markGroupMessageRead, markChannelMessageRead, markFeedMessageRead, markMessagesReadByChat, markGroupMessagesReadByGroup, markAllFeedMessagesRead, getGroupReply, printGroup, saveMsg, saveThisContact, loadKemIdentity, saveKemIdentity, loadDmCrypto, saveDmCrypto, knownTxExists, groupMessageExists, messageExists, getContacts, getChannels, deleteMessage, deletePrivateMessage, addRoom, saveFriendRequest, getFriendRequests, removeFriendRequest}
