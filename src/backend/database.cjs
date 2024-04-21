const { ipcMain } = require('electron')

const sqlite3 = require('better-sqlite3-multiple-ciphers')
const sanitizeHtml = require('sanitize-html')
const Store = require('electron-store')
const store = new Store()
const {sleep} = require('./utils.cjs')

const closeDB = async () => {
    database.close();    
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
    try {
    const welcome = database.prepare('SELECT msg FROM messages WHERE timestamp = 1650919475320').get()
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
    
     database.prepare(`DELETE FROM groupmessages WHERE time < ?`).run(removeAfter)
    }
}


//CREATE TABLES

const createTables = () => {
    messagesTable()
    knownTxsTable()
    contactsTable()
    groupMessageTable()
    groupsTable()
    blockListTable()
    groupChannelsMessagesTable()
}

const welcomeAddress =
    'SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1'

const contactsTable = () => {
    const contactsTable = `
                    CREATE TABLE IF NOT EXISTS contacts (
                       address TEXT,
                       key TEXT,
                       name TEXT,
                       UNIQUE (key)
                   )`
    return new Promise(
        (resolve, reject) => {
           database.prepare(contactsTable).run()

        },
        () => {
            resolve()
        }
    )
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
                   msg TEXT,
                   chat TEXT,
                   sent BOOLEAN,
                   timestamp TEXT,
                   UNIQUE (timestamp)
               )`
    return new Promise(
        (resolve, reject) => {
           database.prepare(messageTable).run()
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

const groupMessageTable = () => {
    const groupTable = `
            CREATE TABLE IF NOT EXISTS groupmessages (
              message TEXT,
              address TEXT,
              signature TEXT,
              grp TEXT,
              time TEXT,
              name TEXT,
              thread TEXT,
              reply TEXT,
              hash TEXT UNIQUE,
              sent BOOLEAN
            )`
    return new Promise(
        (resolve, reject) => {
            database.prepare(groupTable).run()
        },
        () => {
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
                     UNIQUE (hash)
                 )`
    return new Promise(
        (resolve, reject) => {
            database.prepare(channelMessage).run()
        },
        () => {
            resolve()
        }
    )
}

const welcomeMessage = () => {
    const huginMessage = `INSERT INTO messages (msg, chat, sent, timestamp)
                          VALUES (?, ?, ?, ?)`
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
    //Load known txs from db and then load them in to known_pool_txs
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

//Get one message from every unique user sorted by latest timestmap.
const getGroups = async () => {
    const my_groups = loadGroups()
    const groupInfo = []
    const myGroups = []
    for (const chat of my_groups) {
    const getThis = `
        SELECT *
        FROM groupmessages
        WHERE grp = ?
        ORDER BY time
        DESC
        LIMIT 1
    `
    const got = database.prepare(getThis).get(chat.key)
    groupInfo.push(got)
    }
    for (const group of groupInfo.sort((a, b) => a.time - b.time)) {
        if (group === undefined) continue 
        const chat = my_groups.find(a => a.key === group.grp)
        if (chat === undefined) continue 
            const newRow = {
            name: chat.name,
            msg: group.message,
            chat: group.grp,
            timestamp: group.time,
            sent: group.sent,
            key: chat.key,
            hash: group.hash,
            nick: group.name,
            }
        myGroups.push(newRow)
    }
        
    return myGroups
}   

const saveGroupMsg = async (msg, hash, time, offchain, channels = false) => {

    let timestamp = sanitizeHtml(time)
    if (timestamp.length > 20) return false
    if (await groupMessageExists(timestamp)) return false
    let group = sanitizeHtml(msg.g)
    if (group.length > 64) return false
    let text = sanitizeHtml(msg.m)
    if (text.length > 777) return false
    let addr = sanitizeHtml(msg.k)
    if (addr.length > 99) return false
    let reply = sanitizeHtml(msg.r)
    if (reply.length > 64) return false
    let sig = sanitizeHtml(msg.s)
    if (sig.length > 200) return false
    let nick = sanitizeHtml(msg.n)
    if (nick.length > 50) return false
    let txHash = sanitizeHtml(hash)
    if (txHash.length > 64) return false
    let channel = false

    if (channels) {
        channel = sanitizeHtml(msg.c)
        saveChannelMessage(txHash, timestamp, channel, group) 
    }

    if (nick === '') {
        nick = 'Anonymous'
    }
    
    let message = {
        message: text,
        address: addr,
        signature: "",
        group: group,
        time: timestamp,
        name: nick,
        reply: reply,
        hash: txHash,
        sent: msg.sent,
        channel: channel
    }

    if (offchain) {
        return message
    } 
    msg.sent = changeBool(msg.sent)
try {
    database.prepare(
        `REPLACE INTO groupmessages  (
    message,
    address,
    signature,
    grp,
    time,
    name,
    reply,
    hash,
    sent
          )
       VALUES
           (? ,?, ?, ?, ?, ?, ?, ?, ?)`
        
    ).run(text, addr, sig, group, timestamp, nick, reply, txHash, msg.sent)

        } catch(a) {
            console.log("Sql lite", a)
        }

    return message
}

const changeBool = (b) => {
    return b ? 1 : 0
}

const saveMsg = async (message, addr, sent, timestamp, offchain) => {

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
    
    //Save to DB
        database.prepare(
            `REPLACE INTO messages
                (msg, chat, sent, timestamp)
            VALUES
                (?, ?, ?, ?)`
        ).run([message, addr, sent, timestamp])
    
        
    let newMsg = {
        msg: message,
        chat: addr,
        sent: sent,
        timestamp: timestamp,
        offchain: offchain,
    }

    return newMsg
}

//Saves txHash as checked to avoid syncing old messages from mempool in Munin upgrade.
const saveHash = async (txHash) => {

    if (await knownTxExists(txHash)) return false
    if (txHash == undefined) return false
    if (txHash.length !== 64) return false

    database.prepare(
        `REPLACE INTO knownTxs (
                 hash
               )
               VALUES
                   ( ? )`
    ).run([txHash])

    return true
}

const saveChannelMessage = (hsh, timestamp, chnl, grp) => {

    try {
        //Save to DB
        database.prepare(
            `REPLACE INTO channelmessage
                (hash, time, channel, room)
            VALUES
                (?, ?, ?, ?)`
        ).run([hsh, timestamp, chnl, grp])

    } catch (a) {
        console.log("database err", a)
    }
    
}

const addGroup = (group) => {
    console.log('adding', group)
    database.prepare(
        `REPLACE INTO pgroups
      (key, name)
        VALUES
          (?, ?)`
    ).run([group.k, group.n])

    console.log('saved group', group)
}

const removeGroup = (group) => {
    database.prepare(
        `DELETE FROM
        pgroups
      WHERE
        key = ?`
    ).run([group])

    console.log('removed grp', group)
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
        chat = ?`
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
    //Remove Hugin welcome message and contact if new contact was added.
    if (contacts.length > 1 && contacts.some((a) => a.address === welcomeAddress)) {
        removeContact(welcomeAddress)
       // removeMessages(welcomeAddress)
    }
    let row
    const myConversations = []
    for (const chat of contacts) {
        if (chat === undefined) continue
        const getThis = `
            SELECT *
            FROM messages
            WHERE chat = ?
            ORDER BY timestamp
            ASC
            LIMIT 1
        `
        const conv = database.prepare(getThis).get(chat.address)
        row = {
            name: chat.name,
            msg: conv.msg,
            chat: conv.chat,
            timestamp: conv.timestamp,
            sent: conv.sent,
            key: chat.key,
        }
        myConversations.push(row)
    }

    return myConversations
}

//Get a chosen conversation from the reciepients xkr address.
const getConversation = async (chat) => {
    const thisConversation = []
    return new Promise((resolve, reject) => {
        const getChat = `SELECT
            msg,
            chat,
            sent,
            timestamp
        FROM
            messages
        WHERE chat = ?
        ORDER BY
            timestamp
        DESC`
        const stmt = database.prepare(getChat)
        for(const row of stmt.iterate(chat)) {
            if (row === undefined) continue
            thisConversation.push(row)
        }
        resolve(thisConversation)
    })
}

ipcMain.handle('print-group', async (e, grp, page) => {
    return await printGroup(grp, page)
})

//Print a chosen group from the shared key.
const printGroup = async (group, page) => {

    //const channels = await getChannels()
    let limit = 50
    let offset = 0
    if (page !== 0) offset = page * limit
    const thisGroup = []
    return new Promise((resolve, reject) => {
        const getGroup = `SELECT
          message,
          address,
          signature,
          grp,
          time,
          name,
          reply,
          hash,
          sent
        FROM
            groupmessages
        WHERE grp = ?
        ORDER BY
            time
        DESC
        LIMIT ${offset}, ${limit}`
        const stmt = database.prepare(getGroup)

        for(const row of stmt.iterate(group)) {
            if (row.address.length === 0) row.address = row.grp
                    
                thisGroup.push(row)
        }
        resolve(thisGroup)
    })
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
             grp,
             time,
             name,
             reply,
             hash,
             sent
      FROM groupmessages
      WHERE hash = ?
      ORDER BY
          time
      ASC`
        thisReply = database.prepare(sql).get(reply)

        resolve(thisReply)
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
                newRow.chat = contact.address
                myContactList.push(newRow)
        }
        resolve(myContactList)
    })
}


const knownTxExists = async (hash) => {
    let exists = false
    return new Promise((resolve, reject) => {
        const hashExists = 
        `SELECT *
        FROM knownTxs
        WHERE hash = '${hash}'
        `
        const row = database.prepare(hashExists).get()
        if(row) {
            exists = true
        }
        resolve(exists)
    })
}

const messageExists = async (time) => {
    let exists = false
    return new Promise((resolve, reject) => {
        const messageExists = 
        `SELECT *
        FROM messages
        WHERE timestamp = '${time}'
        `
        const row = database.prepare(messageExists).get()
        if(row) {
            exists = true
        }
        resolve(exists)
    })
}

const groupMessageExists = async (time) => {
    let exists = false
    return new Promise((resolve, reject) => {
        const groupMessageExists = 
        `SELECT *
        FROM groupmessages
        WHERE time = '${time}'
        `
        const row = database.prepare(groupMessageExists).get()
        if(row) {
            exists = true
        }
        resolve(exists)
    })

}


const saveThisContact = async (addr, key, name) => {

    let contacts = await getContacts()
    //Remove the old contact key if we have the address saved, we assume the new key is valid since the message is signed.
    if (contacts.some((a) => a.address === addr && a.key !== key)) {
        removeContact(addr)
    }

    database.prepare(
        `REPLACE INTO contacts
         (address, key, name)
      VALUES
          (?, ?, ?)`
    ).run([addr, key, name])
}

const deleteMessage = async (hash) => {
    console.log("Deleting message", hash)
    database.prepare(`DELETE FROM groupmessages WHERE hash = ?`).run(hash)
}

process.on('exit', async () => await closeDB());
process.on('SIGHUP', async () => process.exit(128 + 1));
process.on('SIGINT', async () => process.exit(128 + 2));
process.on('SIGTERM', async () => process.exit(128 + 15));

module.exports = {saveHash, firstContact, welcomeMessage, loadDB, loadGroups, loadKeys, getGroups, saveGroupMsg, unBlockContact, blockContact, removeMessages, removeContact, removeGroup, addGroup, loadBlockList, getConversation, getConversations, loadKnownTxs, getMessages, getGroupReply, printGroup, saveMsg, saveThisContact, groupMessageExists, messageExists, getContacts, getChannels, deleteMessage}
