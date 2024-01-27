
//const sqlite3 = require('sqlite3').verbose()
const sqlite3 = require('better-sqlite3-multiple-ciphers')
const sanitizeHtml = require('sanitize-html')

const Store = require('electron-store')
const store = new Store()

let database
//CREATE DB
const loadDB = (userDataDir, dbPath) => {
    database = new sqlite3(dbPath)
    //database = require('better-sqlite3-multiple-ciphers')(dbPath)

    createTables()
}


//CREATE TABLES

const createTables = () => {
    boardMessageTable()
    messagesTable()
    knownTxsTable()
    contactsTable()
    boardsSubscriptionsTable()
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

const boardMessageTable = () => {
    const boardTable = `
                CREATE TABLE IF NOT EXISTS boards (
                     message TEXT,
                     key TEXT,
                     signature TEXT,
                     board TEXT,
                     time TEXT,
                     name TEXT,
                     reply TEXT,
                     poll TEXT,
                     thread TEXT,
                     hash TEXT UNIQUE,
                     sent BOOLEAN
                    )`
    return new Promise(
        (resolve, reject) => {
            database.prepare(boardTable).run()
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

const boardsSubscriptionsTable = () => {
    const subscriptionTable = `
            CREATE TABLE IF NOT EXISTS subscription (
              board TEXT,
              UNIQUE (board)
          )`
    return new Promise(
        (resolve, reject) => {
            database.prepare(subscriptionTable).run()
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
    const blockList = `
                  CREATE TABLE IF NOT EXISTS channelmessage (
                     hash TEXT,
                     time TEXT,
                     channel TEXT,
                     room TEXT,
                     UNIQUE (hash)
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

const welcomeBoardMessage = () => {
    let sent = false
    const boardMessage = `INSERT INTO boards  (
            message,
            key,
            signature,
            board,
            time,
            name,
            reply,
            hash,
            sent
           )
        VALUES
            (? ,?, ?, ?, ?, ?, ?, ?, ?)`
    return new Promise(
        (resolve, reject) => {
            database.prepare(boardMessage).run([
                    'Welcome to Hugin',
                    'SEKReSxkQgANbzXf4Hc8USCJ8tY9eN9eadYNdbqb5jUG5HEDkb2pZPijE2KGzVLvVKTniMEBe5GSuJbGPma7FDRWUhXXDVSKHWc',
                    'lol',
                    'Home',
                    '1650919475',
                    'Hugin Messenger',
                    '',
                    'b80a4dc4fa60bf26dd31161702a165e43295adc1895f7333ad9eeeb819e20936',
                    sent,
                ])
            console.log('created board msg')
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
                ['Welcome to hugin', welcomeAddress, false, '1650919475320'],
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

const loadGroups = async () => {
    const rows = []
    return new Promise((resolve, reject) => {
        const getAllGroups = `SELECT * FROM pgroups`
        const groups = database.prepare(getAllGroups).all()

        for(const group of groups) {
            rows.push(group)
        }
        resolve(rows)
        // database.each(
        //     getAllGroups,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         rows.push(row)
        //     },
        //     () => {
        //         resolve(rows)
        //     }
        // )
    })
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
        // database.each(
        //     getAllknownTxs,
        //     (err, txs) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         knownTransactions.push(txs)
        //     },
        //     () => {
        //         resolve(knownTransactions)
        //     }
        // )
    })
}

const loadBlockList = async () => {
    const blockList = []
    return new Promise((resolve, reject) => {
        const getBlockList = `SELECT * FROM blocklist`
        const blockLists = database.prepare(getBlockList).all()
        for(const block in blockLists) {
            blockList.push(block)
        }
        resolve(blockList)
        // database.each(
        //     getBlockList,
        //     (err, blocked) => {
        //         if (err) {
        //         }
        //         blockList.push(blocked)
        //     },
        //     () => {
        //         resolve(blockList)
        //     }
        // )
    })
}

//Get one message from every unique user sorted by latest timestmap.
const getGroups = async () => {
    let my_groups = await loadGroups()
    let name
    let newRow
    let key
    const myGroups = []
    return new Promise((resolve, reject) => {
        const getMyGroups = `
          SELECT *
          FROM groupmessages D
          WHERE time = (SELECT MAX(time) FROM groupmessages WHERE grp = D.grp)
          ORDER BY
              time
          ASC
          `
        const stmt = database.prepare(getMyGroups)
        for (const group of stmt.iterate()) {
                my_groups.some(function (chat) {
                    if (chat.key === group.grp) {
                        name = chat.name
                        key = chat.key
                        newRow = {
                            name: name,
                            msg: group.message,
                            chat: group.grp,
                            timestamp: group.time,
                            sent: group.sent,
                            key: key,
                            hash: group.hash,
                            nick: group.name,
                        }
                        myGroups.push(newRow)
                    }
                })
            }
            resolve(myGroups)
        })
    }   


const saveBoardMessage = (msg, hash) => {

    return

    let to_board = sanitizeHtml(msg.brd)
    let text = sanitizeHtml(msg.m)
    let addr = sanitizeHtml(msg.k)
    let reply = sanitizeHtml(msg.r)
    let sig = sanitizeHtml(msg.s)
    let timestamp = sanitizeHtml(msg.t)
    let nick = sanitizeHtml(msg.n)
    let txHash = sanitizeHtml(hash)
    if (nick === '') {
        nick = 'Anonymous'
    }

    let message = {
        message: text,
        key: addr,
        signature: sig,
        board: to_board,
        time: timestamp,
        name: nick,
        reply: reply,
        hash: txHash,
        sent: msg.sent,
    }

    database.run(
        `REPLACE INTO boards  (
               message,
               key,
               signature,
               board,
               time,
               name,
               reply,
               hash,
               sent
              )
           VALUES
               (? ,?, ?, ?, ?, ?, ?, ?, ?)`,
        [text, addr, sig, to_board, timestamp, nick, reply, txHash, msg.sent]
    )
    return message
}

const saveGroupMsg = async (msg, hash, time, offchain, channels = false) => {

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
    let timestamp = sanitizeHtml(time)
    if (timestamp.length > 20) return false
    let nick = sanitizeHtml(msg.n)
    if (nick.length > 50) return false
    let txHash = sanitizeHtml(hash)
    if (txHash.length > 64) return false
    let channel = false
    if (await groupMessageExists(timestamp)) return false

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
    msg.sent = 0
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

const addBoard = (brd) => {
    database.prepare(
        `REPLACE INTO subscription
      (board)
        VALUES
          (?)`
    ).run([brd])

    console.log('saved board', brd)
}

const removeBoard = (brd) => {
    database.run(
        `DELETE FROM
        subscription
      WHERE
        board = ?`
    ).run([brd])

    console.log('removed brd', brd)
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
        // database.each(
        //     getAllMessages,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         rows.push(row)
        //     },
        //     () => {
        //         resolve(rows)
        //     }
        // )
    })
}

//Get all boardmessages from db.
const getBoardMsgs = () => {
    const allBoards = []
    return new Promise((resolve, reject) => {
        const getAllBrds = `SELECT * FROM boards`
        const boards = database.prepare(getAllBrds).all()

        for(const board of boards) {
            allBoards.unshift(board)
        }
        resolve(allBoards)
        // database.each(
        //     getAllBrds,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         allBoards.unshift(row)
        //     },
        //     () => {
        //         resolve(allBoards)
        //     }
        // )
    })
}

//Get one message from every unique board sorted by latest timestmap.
const getMyBoardList = () => {
    const myBoards = []
    return new Promise((resolve, reject) => {
        const getMyBoards = `
          SELECT *
          FROM subscription
          `
        const boards = database.prepare(getMyBoards).all()

        for(const board of boards) {
            myBoards.push(board.board)
        }
        resolve(myBoards)
        // database.each(
        //     getMyBoards,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         myBoards.push(row.board)
        //     },
        //     () => {
        //         resolve(myBoards)
        //     }
        // )
    })
}


//Get one message from every unique user sorted by latest timestmap.
const getConversations = async () => {
    let contacts = await getContacts()
    //Remove Hugin welcome message and contact if new contact was added.
    if (contacts.length > 1 && contacts.some((a) => a.address === welcomeAddress)) {
        removeContact(welcomeAddress)
        removeMessages(welcomeAddress)
    }

    let name
    let newRow
    let key
    const myConversations = []
    return new Promise((resolve, reject) => {
        const getMyConversations = `
          SELECT *
          FROM messages D
          WHERE timestamp = (SELECT MAX(timestamp) FROM messages WHERE chat = D.chat)
          ORDER BY
              timestamp
          ASC
          `
        const stmt = database.prepare(getMyConversations)

        for(const conversation in stmt.iterate()) {
            contacts.some(function (chat) {
                if (chat.address == conversation.chat) {
                    name = chat.name
                    key = chat.key
                    newRow = {
                        name: name,
                        msg: conversation.msg,
                        chat: conversation.chat,
                        timestamp: conversation.timestamp,
                        sent: conversation.sent,
                        key: key,
                    }
                    myConversations.push(newRow)
                }
            })
        }
        resolve(myConversations)
        // database.each(
        //     getMyConversations,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         contacts.some(function (chat) {
        //             if (chat.address == row.chat) {
        //                 name = chat.name
        //                 key = chat.key
        //                 newRow = {
        //                     name: name,
        //                     msg: row.msg,
        //                     chat: row.chat,
        //                     timestamp: row.timestamp,
        //                     sent: row.sent,
        //                     key: key,
        //                 }
        //                 myConversations.push(newRow)
        //             }
        //         })
        //     },
        //     () => {
        //         resolve(myConversations)
        //     }
        // )
    })
}

//Get a chosen conversation from the reciepients xkr address.
const getConversation = async (chat = false) => {
    const thisConversation = []
    return new Promise((resolve, reject) => {
        const getChat = `SELECT
            msg,
            chat,
            sent,
            timestamp
        FROM
            messages
        ${chat ? 'WHERE chat = "' + chat + '"' : ''}
        ORDER BY
            timestamp
        DESC`
        const stmt = database.prepare(getChat)

        for(const row of stmt.iterate()) {
            thisConversation.push(row)
        }
        resolve(thisConversation)
        // database.each(
        //     getChat,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         thisConversation.push(row)
        //     },
        //     () => {
        //         resolve(thisConversation)
        //     }
        // )
    })
}

//Print a chosen group from the shared key.
const printGroup = async (group = false) => {
    const channels = await getChannels()

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
        ${group ? 'WHERE grp = "' + group + '"' : ''}
        ORDER BY
            time
        DESC`
        const stmt = database.prepare(getGroup)

        for(row of stmt.iterate()) {
            if (row.address.length === 0) row.address = row.grp
                    
                const msg = channels.find(a => a.hash === row.hash)

                if (msg) {
                    row.channel = msg.channel
                }
                
                thisGroup.push(row)
        }
        resolve(thisGroup)
        // database.each(
        //     getGroup,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }

        //         if (row.address.length === 0) row.address = row.grp
                    
        //         const msg = channels.find(a => a.hash === row.hash)

        //         if (msg) {
        //             row.channel = msg.channel
        //         }
                
        //         thisGroup.push(row)
        //     },
        //     () => {
        //         resolve(thisGroup)
        //     }
        // )
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
        // database.each(
        //     getChannelsMessages,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         rows.push(row)
        //     },
        //     () => {
        //         resolve(rows)
        //     }
        // )
    })
}

//Get all messages from a specific board from db
const printBoard = async (board = false) => {
    const boardArray = []
    return new Promise((resolve, reject) => {
        const getBoard = `SELECT
               message,
               key,
               signature,
               board,
               time,
               name,
               reply,
               hash,
               sent
        FROM boards
        ${board ? 'WHERE board = "' + board + '"' : ''}
        ORDER BY
            time
        ASC`
        const board = database.prepare(getBoard).all()

        for(row of board) {
            boardArray.push(row)
        }
        resolve(boardArray)
        // database.each(
        //     getBoard,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         boardArray.push(row)
        //     },
        //     () => {
        //         boardArray.reverse()
        //         resolve(boardArray)
        //     }
        // )
    })
}

//Get original messsage from a chosen reply hash
const getReply = async (reply = false) => {
    let thisReply
    return new Promise((resolve, reject) => {
        let sql = `SELECT
             message,
             key,
             signature,
             board,
             time,
             name,
             reply,
             hash,
             sent
      FROM boards
      ${reply ? 'WHERE hash = "' + reply + '"' : ''}
      ORDER BY
          time
      ASC`
        const stmt = database.prepare(sql)
        for(row of stmt.iterate()) {
            thisReply = row
        }
        resolve(thisReply)
        // database.each(
        //     sql,
        //     (err, row) => {
        //         thisReply = row
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //     },
        //     () => {
        //         resolve(thisReply)
        //     }
        // )
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
      ${reply ? 'WHERE hash = "' + reply + '"' : ''}
      ORDER BY
          time
      ASC`
        const stmt = database.prepare(sql)

        for(row in stmt.iterate()) {
            thisReply = row
        }
        resolve(thisReply)
        // database.each(
        //     sql,
        //     (err, row) => {
        //         thisReply = row
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //     },
        //     () => {
        //         resolve(thisReply)
        //     }
        // )
    })
}

//Get all replies to a specific post
const getReplies = async (hash = false) => {
    const replies = []
    return new Promise((resolve, reject) => {
        let sql = `SELECT
               message,
               key,
               signature,
               board,
               time,
               name,
               reply,
               hash,
               sent
        FROM boards
        ${hash ? 'WHERE r = "' + hash + '"' : ''}
        ORDER BY
            time
        ASC`
        const stmt = database.prepare(sql)

        for(row in stmt.iterate()) {
            replies.push(row)
        }
        resolve(replies)
        // database.each(
        //     sql,
        //     (err, row) => {
        //         console.log(row)
        //         if (err) {
        //             console.log('Error', err)
        //         }
        //         replies.push(row)
        //     },
        //     () => {
        //         resolve(replies)
        //     }
        // )
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
            let newRow = contact
                newRow.chat = contact.address
                if (!contact.key) return
                myContactList.push(newRow)
        }
        resolve(myContactList)
        // database.each(
        //     getMyContacts,
        //     (err, row) => {
        //         if (err) {
        //             console.log('Error', err)
        //         }
                
        //         let newRow = row
        //         newRow.chat = row.address
        //         if (!row.key) return
        //         myContactList.push(newRow)
        //     },
        //     () => {
        //         resolve(myContactList)
        //     }
        // )
    })
}


const knownTxExists = async (hash) => {
    let exists = false
    return new Promise((resolve, reject) => {
        const hashExists = 
        `SELECT *
        FROM knownTxs
        WHERE hash = ${hash}
        `
        const row = database.prepare(hashExists).get()
        if(row) {
            exists = true
        }
        resolve(exists)
        // database.each(
        //     hashExists,
        //     (err, row) => {
        //         if (row) {
        //             exists = true
        //         }
        //     },
        //     () => {
        //         resolve(exists)
        //     }
        // )
    })
}

const messageExists = async (time) => {
    let exists = false
    return new Promise((resolve, reject) => {
        const messageExists = 
        `SELECT *
        FROM messages
        WHERE timestamp = ${time}
        `
        const row = database.prepare(messageExists).get()
        if(row) {
            exists = true
        }
        resolve(exists)
        // database.each(
        //     messageExists,
        //     (err, row) => {
        //         if (row) {
        //             exists = true
        //         }
        //     },
        //     () => {
        //         resolve(exists)
        //     }
        // )
    })
}

const groupMessageExists = async (time) => {
    let exists = false
    return new Promise((resolve, reject) => {
        const groupMessageExists = 
        `SELECT *
        FROM groupmessages
        WHERE time = ${time}
        `
        const row = database.prepare(groupMessageExists).get()
        if(row) {
            exists = true
        }
        resolve(exists)
        // database.each(
        //     groupMessageExists,
        //     (err, row) => {
        //         if (row) {
        //             exists = true
        //         }
        //     },
        //     () => {
        //         resolve(exists)
        //     }
        // )
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



module.exports = {saveHash, addBoard, firstContact, welcomeMessage, welcomeBoardMessage, loadDB, loadGroups, loadKeys, getGroups, saveGroupMsg, unBlockContact, blockContact, removeMessages, removeContact, removeGroup, addGroup, removeBoard, loadBlockList, getConversation, getConversations, loadKnownTxs, getMyBoardList, getBoardMsgs, getMessages, getReplies, getGroupReply, getReply, printGroup, printBoard, saveMsg, saveBoardMessage, saveThisContact, groupMessageExists, messageExists, getContacts, getChannels}
