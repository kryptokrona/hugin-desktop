
const sqlite3 = require('sqlite3').verbose()
const sanitizeHtml = require('sanitize-html')
let database
//CREATE DB
const loadDB = (userDataDir, dbPath) => {
    database = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.log('Err', err)
    }
})
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

let welcomeAddress =
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
            database.run(contactsTable, (err) => {})
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
            database.run(knownTxTable, (err) => {})
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
            database.run(boardTable, (err) => {})
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
            database.run(messageTable, (err) => {})
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
            database.run(subscriptionTable, (err) => {})
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
            database.run(groupsTable, (err) => {})
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
            database.run(groupTable, (err) => {})
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
            database.run(blockList, (err) => {})
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
            database.run(blockList, (err) => {})
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
            database.run(
                boardMessage,
                [
                    'Welcome to Hugin',
                    'SEKReSxkQgANbzXf4Hc8USCJ8tY9eN9eadYNdbqb5jUG5HEDkb2pZPijE2KGzVLvVKTniMEBe5GSuJbGPma7FDRWUhXXDVSKHWc',
                    'lol',
                    'Home',
                    '1650919475',
                    'Hugin Messenger',
                    '',
                    'b80a4dc4fa60bf26dd31161702a165e43295adc1895f7333ad9eeeb819e20936',
                    sent,
                ],
                (err) => {
                    console.log('Error creating msg', err)
                }
            )
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
            database.run(
                huginMessage,
                ['Welcome to hugin', welcomeAddress, false, '1650919475320'],
                (err) => {
                    console.log('Error creating msg', err)
                }
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
            database.run(
                first_Contact,
                [
                    welcomeAddress,
                    '133376bcb04a2b6c62fc9ebdd719fbbc0c680aa411a8e5fd76536915371bba7f',
                    'Hugin',
                ],
                (err) => {
                    console.log('Error creating contact msg', err)
                }
            )
            console.log('created first contact msg')
        },
        () => {
            resolve()
        }
    )
}



//DATABAS REQUESTS

const loadGroups = async () => {
    const rows = []
    return new Promise((resolve, reject) => {
        const getAllGroups = `SELECT * FROM pgroups`
        database.each(
            getAllGroups,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                rows.push(row)
            },
            () => {
                resolve(rows)
            }
        )
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
        database.each(
            getAllknownTxs,
            (err, txs) => {
                if (err) {
                    console.log('Error', err)
                }
                knownTransactions.push(txs)
            },
            () => {
                resolve(knownTransactions)
            }
        )
    })
}

const loadBlockList = async () => {
    const blockList = []
    return new Promise((resolve, reject) => {
        const getBlockList = `SELECT * FROM blocklist`
        database.each(
            getBlockList,
            (err, blocked) => {
                if (err) {
                }
                blockList.push(blocked)
            },
            () => {
                resolve(blockList)
            }
        )
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
        database.each(
            getMyGroups,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                my_groups.some(function (chat) {
                    if (chat.key === row.grp) {
                        name = chat.name
                        key = chat.key
                        newRow = {
                            name: name,
                            msg: row.message,
                            chat: row.grp,
                            timestamp: row.time,
                            sent: row.sent,
                            key: key,
                            hash: row.hash,
                            nick: row.name,
                        }
                        myGroups.push(newRow)
                    }
                })
            },
            () => {
                resolve(myGroups)
            }
        )
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
        signature: sig,
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

try {
    database.run(
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
           (? ,?, ?, ?, ?, ?, ?, ?, ?)`,
        [text, addr, sig, group, timestamp, nick, reply, txHash, msg.sent]
    )

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
        database.run(
            `REPLACE INTO messages
                (msg, chat, sent, timestamp)
            VALUES
                (?, ?, ?, ?)`,
            [message, addr, sent, timestamp]
        )
    
        
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

    database.run(
        `REPLACE INTO knownTxs (
                 hash
               )
               VALUES
                   ( ? )`,
        [txHash]
    )

    return true
}

const saveChannelMessage = (hsh, timestamp, chnl, grp) => {

    try {
        //Save to DB
        database.run(
            `REPLACE INTO channelmessage
                (hash, time, channel, room)
            VALUES
                (?, ?, ?, ?)`,
            [hsh, timestamp, chnl, grp]
        )

    } catch (a) {
        console.log("database err", a)
    }
    
}

const addBoard = (brd) => {
    database.run(
        `REPLACE INTO subscription
      (board)
        VALUES
          (?)`,
        [brd]
    )

    console.log('saved board', brd)
}

const removeBoard = (brd) => {
    database.run(
        `DELETE FROM
        subscription
      WHERE
        board = ?`,
        [brd]
    )

    console.log('removed brd', brd)
}

const addGroup = (group) => {
    console.log('adding', group)
    database.run(
        `REPLACE INTO pgroups
      (key, name)
        VALUES
          (?, ?)`,
        [group.k, group.n]
    )

    console.log('saved group', group)
}

const removeGroup = (group) => {
    database.run(
        `DELETE FROM
        pgroups
      WHERE
        key = ?`,
        [group]
    )

    console.log('removed brd', group)
}

const removeContact = (contact) => {
    database.run(
        `DELETE FROM
        contacts
      WHERE
        address = ?`,
        [contact]
    )

    console.log('removed contact', contact)
}

const removeMessages = (contact) => {
    database.run(
        `DELETE FROM
        messages
      WHERE
        chat = ?`,
        [contact]
    )
}

const blockContact = (address, name) => {
    database.run(
        `REPLACE INTO blocklist
      (address, name)
        VALUES
          (?, ?)`,
        [address, name]
    )
    console.log('Blocked contact', address)
}

const unBlockContact = (address) => {
    database.run(
        `DELETE FROM
        blocklist
      WHERE
        address = ?`,
        [address]
    )

    console.log('Removed from block list', address)
}

//Get all messages from db
const getMessages = () => {
    const rows = []
    return new Promise((resolve, reject) => {
        const getAllMessages = `SELECT * FROM messages`
        database.each(
            getAllMessages,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                rows.push(row)
            },
            () => {
                resolve(rows)
            }
        )
    })
}

//Get all boardmessages from db.
const getBoardMsgs = () => {
    const allBoards = []
    return new Promise((resolve, reject) => {
        const getAllBrds = `SELECT * FROM boards`
        database.each(
            getAllBrds,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                allBoards.unshift(row)
            },
            () => {
                resolve(allBoards)
            }
        )
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
        database.each(
            getMyBoards,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                myBoards.push(row.board)
            },
            () => {
                resolve(myBoards)
            }
        )
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
        database.each(
            getMyConversations,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                contacts.some(function (chat) {
                    if (chat.address == row.chat) {
                        name = chat.name
                        key = chat.key
                        newRow = {
                            name: name,
                            msg: row.msg,
                            chat: row.chat,
                            timestamp: row.timestamp,
                            sent: row.sent,
                            key: key,
                        }
                        myConversations.push(newRow)
                    }
                })
            },
            () => {
                resolve(myConversations)
            }
        )
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
        database.each(
            getChat,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                thisConversation.push(row)
            },
            () => {
                resolve(thisConversation)
            }
        )
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
        database.each(
            getGroup,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }

                if (row.address.length === 0) row.address = row.grp
                    
                const msg = channels.find(a => a.hash === row.hash)

                if (msg) {
                    row.channel = msg.channel
                }
                
                thisGroup.push(row)
            },
            () => {
                resolve(thisGroup)
            }
        )
    })
}


//DATABAS REQUESTS

const getChannels = async () => {
    const rows = []
    return new Promise((resolve, reject) => {
        const getChannelsMessages = `SELECT * FROM channelmessage`
        database.each(
            getChannelsMessages,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                rows.push(row)
            },
            () => {
                resolve(rows)
            }
        )
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
        database.each(
            getBoard,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                boardArray.push(row)
            },
            () => {
                boardArray.reverse()
                resolve(boardArray)
            }
        )
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
        database.each(
            sql,
            (err, row) => {
                thisReply = row
                if (err) {
                    console.log('Error', err)
                }
            },
            () => {
                resolve(thisReply)
            }
        )
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
        database.each(
            sql,
            (err, row) => {
                thisReply = row
                if (err) {
                    console.log('Error', err)
                }
            },
            () => {
                resolve(thisReply)
            }
        )
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
        database.each(
            sql,
            (err, row) => {
                console.log(row)
                if (err) {
                    console.log('Error', err)
                }
                replies.push(row)
            },
            () => {
                resolve(replies)
            }
        )
    })
}


//Get all contacts from db
const getContacts = async () => {
    const myContactList = []
    return new Promise((resolve, reject) => {
        const getMyContacts = `SELECT * FROM contacts`
        database.each(
            getMyContacts,
            (err, row) => {
                if (err) {
                    console.log('Error', err)
                }
                
                let newRow = row
                newRow.chat = row.address
                if (!row.key) return
                myContactList.push(newRow)
            },
            () => {
                resolve(myContactList)
            }
        )
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
        database.each(
            hashExists,
            (err, row) => {
                if (row) {
                    exists = true
                }
            },
            () => {
                resolve(exists)
            }
        )
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
        database.each(
            messageExists,
            (err, row) => {
                if (row) {
                    exists = true
                }
            },
            () => {
                resolve(exists)
            }
        )
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
        database.each(
            groupMessageExists,
            (err, row) => {
                if (row) {
                    exists = true
                }
            },
            () => {
                resolve(exists)
            }
        )
    })

}


const saveThisContact = async (addr, key, name) => {

    let contacts = await getContacts()
    //Remove the old contact key if we have the address saved, we assume the new key is valid since the message is signed.
    if (contacts.some((a) => a.address === addr && a.key !== key)) {
        removeContact(addr)
    }

    database.run(
        `REPLACE INTO contacts
         (address, key, name)
      VALUES
          (?, ?, ?)`,
        [addr, key, name]
    )
}



module.exports = {saveHash, addBoard, firstContact, welcomeMessage, welcomeBoardMessage, loadDB, loadGroups, loadKeys, getGroups, saveGroupMsg, unBlockContact, blockContact, removeMessages, removeContact, removeGroup, addGroup, removeBoard, loadBlockList, getConversation, getConversations, loadKnownTxs, getMyBoardList, getBoardMsgs, getMessages, getReplies, getGroupReply, getReply, printGroup, printBoard, saveMsg, saveBoardMessage, saveThisContact, groupMessageExists, messageExists, getContacts, getChannels}
