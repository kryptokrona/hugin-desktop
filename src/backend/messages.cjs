const { keychain } = require('./crypto.cjs')
const {
    loadKnownTxs, 
    saveHash, 
    saveGroupMsg, 
    messageExists, 
    saveMsg, 
    saveThisContact, 
    getConversation, 
    getConversations, 
    getMessages, 
    removeMessages, 
    removeContact, 
    addGroup, 
    unBlockContact,
    loadBlockList,
    blockContact,
    getGroupReply,
    loadGroups,
    deleteMessage,
    addRoom,
    addRoomKeys,
    removeRoom} = require("./database.cjs")
const {
    trimExtra, 
    sanitize_pm_message,
    sleep, 
    hexToUint,
    randomKey,
    nonceFromTimestamp,
    toHex,
    sanitize_group_message
} = require('./utils.cjs')

const { send_beam_message, new_beam} = require("./beam.cjs")
const { send_swarm_message, new_swarm, end_swarm } = require("./swarm.cjs")

const { Address, Crypto, CryptoNote} = require('kryptokrona-utils')
const { extraDataToMessage } = require('hugin-crypto')
const { default: fetch } = require('electron-fetch')
const naclUtil = require('tweetnacl-util')
const nacl = require('tweetnacl')
const naclSealed = require('tweetnacl-sealed-box')
const sanitizeHtml = require('sanitize-html')
const crypto = new Crypto()
const xkrUtils = new CryptoNote()
const { ipcMain, powerMonitor } = require('electron')
const Store = require('electron-store');
const { Hugin } = require('./account.cjs')
const { expand_sdp_offer, parse_sdp } = require('./sdp.cjs')
const store = new Store()
// const WebTorrent = require('webtorrent')
let known_pool_txs = []
let known_keys = []
let block_list = []
let incoming_messages = []
let incoming_pm_que = []
let incoming_group_que = []
//IPC MAIN LISTENERS
//MISC

ipcMain.on('optimize', async (e) => {
    optimize_message_inputs(force = true)
})
//GROUPS MESSAGES

ipcMain.on('send-group-message', (e, msg, offchain, swarm) => {
    send_group_message(msg, offchain, swarm)
})

ipcMain.on('send-room-message', (e, m) => {
    send_room_message(m)
})

ipcMain.handle('get-group-reply', async (e, data) => {
    return await getGroupReply(data)
})

ipcMain.handle('create-group', async () => {
    return randomKey()
})

ipcMain.on('add-group', async (e, grp) => {
    addGroup(grp)
    const message = sanitize_group_message(grp, true)
    save_group_message(message, grp.hash, parseInt(Date.now()), false, false, true)
})


ipcMain.on('add-room', async (e, room, admin) => {
    addRoom(room)
    //Make sure the format is correct to save.
    const message = sanitize_group_message(room, true)
    message.address = Hugin.address
    message.name = Hugin.nickname
    message.message = "Joined room"
    message.sent = true
    save_group_message(message, room.hash, parseInt(message.timestamp), false, false, true, true)
    if (admin) addRoomKeys(room.k, admin)
    // sender('joined-room', room)
    new_swarm({key: room.k})
})

ipcMain.on('remove-room', async (e, room) => {
    end_swarm(room)
    removeRoom(room)
})


ipcMain.on('unblock', async (e, address) => {
    unBlockContact(address)
    block_list = await loadBlockList()
    Hugin.block_list = block_list
    Hugin.send('update-blocklist', block_list)
})

ipcMain.on('block', async (e, block) => {
    blockContact(block.address, block.name)
    block_list = await loadBlockList()
    Hugin.block_list = block_list
    Hugin.send('update-blocklist', block_list)
})

ipcMain.on('delete-message', async (e, hash) => {
    deleteMessage(hash)
})

ipcMain.on('delete-messages-after', async (e, days) => {
    if (days === 0) days = 100000
    store.set({
        delete: {
            after: days
        }
    })
})


//PRIVATE MESSAGES

ipcMain.handle('get-conversations', async (e) => {
    let contacts = await getConversations()
    return contacts.reverse()
})

ipcMain.handle('get-messages', async (data) => {
    return await getMessages()
})

ipcMain.on('send-msg', (e, msg, receiver, off_chain, grp, beam) => {
    send_message(msg, receiver, off_chain, grp, beam)
})

//Listens for event from frontend and saves contact and nickname.
ipcMain.on('add-chat', async (e, hugin_address, nickname, first) => {
    save_contact(hugin_address, nickname, first)
    const chat = hugin_address.substring(0,99)
    const key = await key_derivation_hash(chat)
    console.log("hugin_address", hugin_address)
    new_swarm({key}, true, hugin_address);
})


ipcMain.on('remove-contact', (e, contact) => {
    removeContact(contact)
    removeMessages(contact)
    Hugin.send('sent')
})

//WEBRTC MESSAGES

ipcMain.on('decrypt_message', async (e, message) => {
    decryptRtcMessage(message)
})

ipcMain.on('decrypt_rtc_group_message', async (e, message, key) => {
    decryptGroupRtcMessage(message, key)
})

ipcMain.on('get-sdp', (e, data) => {
    get_sdp(data)
})

ipcMain.on('expand-sdp', (e, data, address) => {
    let recovered_data = expand_sdp_offer(data, true)
    let expanded_data = [recovered_data, address]
    Hugin.send('got-expanded', expanded_data)
})

//BEAM

ipcMain.on("end-beam", async (e, chat) => {
    console.log("end beam");
    end_swarm(chat, true);
})


ipcMain.on("beam", async (e, chat) => {
    const key = await key_derivation_hash(chat.substring(0,99))
    let beamMessage = new_swarm({key}, true, chat);
    if (beamMessage === "Error") return
    if (!beamMessage) return
    // if (beam) send_message(beamMessage.msg, beamMessage.chat, offchain)
});

//SWARM


ipcMain.on('new-swarm', async (e, data) => {
    new_swarm(data)
})
ipcMain.on('end-swarm', async (e, key) => {
    end_swarm(key)
})

const peer_dms = async () => {
    const contacts = await getConversations()
    for (const c of contacts) {
        if (c.chat?.length !== 99) continue
        const hashDerivation = await key_derivation_hash(c.chat)
        const beam = new_swarm({key: hashDerivation}, true, c.chat + c.key)
        if (beam === "Error") continue
        if (!beam) continue
    } 
}

async function key_derivation_hash(chat) {
    const [privateSpendKey, privateViewKey] = keychain.getPrivKeys()
    const recvAddr = await Address.fromAddress(chat)
    const recvPubKey = recvAddr.m_keys.m_viewKeys.m_publicKey
    const derivation = await crypto.generateKeyDerivation(recvPubKey, privateViewKey);
    return await crypto.cn_fast_hash(derivation)
}

const start_message_syncer = async () => {
    //Load knownTxsIds to backgroundSyncMessages on startup
    peer_dms()
    known_keys = Hugin.known_keys
    block_list = Hugin.block_list
    await background_sync_messages(await load_checked_txs())
     while (true) {
         try {
            //Start syncing
            await sleep(1000 * 3)
            await background_sync_messages()

            const idle = powerMonitor.getSystemIdleTime();
            Hugin.send('idle', idle)

            const [walletBlockCount, localDaemonBlockCount, networkBlockCount] = await Hugin.wallet.getSyncStatus()

            Hugin.send('node-sync-data', {
                walletBlockCount,
                localDaemonBlockCount,
                networkBlockCount,
            })

            if (localDaemonBlockCount - walletBlockCount < 2) {
                // Diff between wallet height and node height is 1 or 0, we are synced
                console.log('**********SYNCED**********')
                console.log('My Wallet ', walletBlockCount)
                console.log('The Network', networkBlockCount)
                Hugin.send('sync', 'Synced')
            } else {
                //If wallet is somehow stuck at block 0 for new users due to bad node connection, reset to the last 100 blocks.
                if (walletBlockCount === 0) {
                    await Hugin.wallet.reset(networkBlockCount - 100)
                }
                console.log('*.[~~~].SYNCING BLOCKS.[~~~].*')
                console.log('My Wallet ', walletBlockCount)
                console.log('The Network', networkBlockCount)
                Hugin.send('sync', 'Syncing')
            }
        } catch (err) {
            console.log(err)
        }
    }
}

async function background_sync_messages(checkedTxs = false) {
    console.log('Background syncing...')
    const incoming = incoming_messages.length > 0 ? true : false
    //First start, set known pool txs
    if (checkedTxs) {
        known_pool_txs = await set_known_pooltxs(checkedTxs)
    }
    const transactions = await fetch_hugin_messages()
    if (!transactions && !incoming) return
    const large_batch = transactions.length > 299 ? true : false

    if (large_batch || (large_batch && incoming)) {
        //Add to que
        console.log("Adding que:", transactions.length)
        const known_hashes = transactions.map(a => {return a.transactionPrefixInfotxHash})
        incoming_messages = transactions
        known_pool_txs = [...known_pool_txs, ...known_hashes]
        Hugin.send('incoming-que', true)
    }

    if (incoming_pm_que.length) {
       clear_pm_que()
    }

    if(incoming || large_batch) {
        console.log("Checking incoming messages:", incoming_messages.length)
        await decrypt_hugin_messages(update_que(), true)
        if (incoming_group_que.length) {
            await clear_group_que()
        }
        return
    }

    if (transactions.length < 5) Hugin.send('incoming-que', false)
    console.log("Incoming transactions", transactions.length)
    decrypt_hugin_messages(transactions, false)
}

function update_que() {
    const decrypt = incoming_messages.slice(0,299)
    const update = incoming_messages.slice(decrypt.length)
    incoming_messages = update
    return decrypt
}

async function decrypt_hugin_messages(transactions, que = false) {
    console.log("Checking nr of txs:", transactions.length)
    for (const transaction of transactions) {
        try {
            const thisExtra = transaction.transactionPrefixInfo.extra
            const thisHash = transaction.transactionPrefixInfotxHash
            if (!validate_extra(thisExtra, thisHash, que)) continue
            if (thisExtra !== undefined && thisExtra.length > 200) {
                if (!saveHash(thisHash)) continue
                //Check for viewtag
                 
                if (await check_for_viewtag(thisExtra)) {
                    await check_for_pm_message(thisExtra, que)
                    continue
                }
                //Check for private message //TODO remove this when viewtags are active
                if (await check_for_pm_message(thisExtra, que)) continue
                //Check for group message
                if (await check_for_group_message(thisExtra, thisHash, que)) continue
            }
        } catch (err) {
            console.log(err)
        }
    }
}

//Try decrypt extra data
async function check_for_pm_message(thisExtra, que = false) {
    let message = await extraDataToMessage(thisExtra, known_keys, keychain.getXKRKeypair())
    if (!message) return false
    if (message.type === 'sealedbox' || 'box') {
        message.sent = false
        if (que) {
            incoming_pm_que.push(message)
            return true
        }
        save_message(message)
        return true
    }
}

async function clear_pm_que() {
    const sorted = incoming_pm_que.sort((a, b) => a.t - b.t );
    for (const message of sorted) {
        save_message(message)
    }
    incoming_pm_que = []
}

async function clear_group_que() {
    const sorted = incoming_group_que.sort((a, b) => a.t - b.t );
    for (const message of sorted) {
        await decrypt_group_message(message, message.hash)
    }
    incoming_group_que = []
}
//Checks the message for a view tag
async function check_for_viewtag(extra) {
    try {
    const rawExtra = trimExtra(extra)
    const parsed_box = JSON.parse(rawExtra)
        if (parsed_box.vt) {
            const [privateSpendKey, privateViewKey] = keychain.getPrivKeys()
            const derivation = await crypto.generateKeyDerivation(parsed_box.txKey, privateViewKey);
            const hashDerivation = await crypto.cn_fast_hash(derivation)
            const possibleTag = hashDerivation.substring(0,2)
            const view_tag = parsed_box.vt
            if (possibleTag === view_tag) {
                console.log('**** FOUND VIEWTAG ****')
                return true
            }
        }
    } catch (err) {
    }
    return false
}

//Checks if hugin message is from a group
async function check_for_group_message(thisExtra, thisHash, que = false)  {
    try {
    let group = trimExtra(thisExtra)
    let message = JSON.parse(group)
    if (message.sb) {
        if (que) {
            message.hash = thisHash
            incoming_group_que.push(message)
            return true
        }
            await decrypt_group_message(message, thisHash)
            return true
    }
    } catch {
        
    }
    return false
}

//Validate extradata, here we can add more conditions
function validate_extra(thisExtra, thisHash, que) {
    if (typeof thisExtra !== "string") return false
    if (typeof thisHash !== "string") return false
    //Extra too long
    if (thisExtra.length > 7000) {
        known_pool_txs.push(thisHash)
        if (!saveHash(thisHash)) return false
        return false;
    }
    //Check if known tx, if que is true we already know it but should check anyway
    if (que) return true
    if (known_pool_txs.indexOf(thisHash) === -1) {
        known_pool_txs.push(thisHash)
        return true
    } else {
        //Tx already known
        return false
    }
}

async function load_checked_txs() {

    //Load known pool txs from db.
    let checkedTxs = await loadKnownTxs()
    let arrayLength = checkedTxs.length

    if (arrayLength > 500) {
        checkedTxs = checkedTxs.slice(arrayLength - 500, arrayLength - 1).map(function (knownTX) {
            return knownTX.hash
        })
        
    } else {
        checkedTxs = []
    }

    return checkedTxs
}


//Set known pool txs on start
function set_known_pooltxs(checkedTxs) {
    //Here we can adjust number of known we send to the node
    known_pool_txs = checkedTxs
    //Can't send undefined to node, it wont respond
    let known = known_pool_txs.filter(a => a !== undefined)
    return known
}

async function trimTxs(json) {
    json = JSON.stringify(json)
    .replaceAll('.txPrefix', '')
    .replaceAll('transactionPrefixInfo.txHash', 'transactionPrefixInfotxHash')

    json = JSON.parse(json)

    return json.addedTxs
}

async function check_node_version(node) {
    try {
    const version =  await fetch('http://' + node.node + ':' + node.port.toString() + '/getinfo')
    const json = await version.json()
    if (json.version === "1.1.4") return true
    else return false
    } catch(e) {
        return false
    }
}

async function get_pool_changes_lite(node) {
    try {
    const resp = await fetch(
        'http://' + node.node + ':' + node.port.toString() + '/get_pool_changes_lite',
        {
            method: 'POST',
            body: JSON.stringify({ knownTxsIds: known_pool_txs }),
        }
    )
    return await resp.json()

    } catch(e) {
        //Node error
        return false
    }
}


async function get_pool(node) {
    try {
    const lastChecked = store.get('pool.checked')
    store.set({
        pool: {
            checked: Math.floor(Date.now() / 1000)
        }
    })
    const resp = await fetch(
        'http://' + node.node + ':' + node.port.toString() + '/get_pool',
        {
            method: 'POST',
            body: JSON.stringify({ timestampBegin: lastChecked }),
        }
    )
    return await resp.json()

    } catch (e) {
        //Node error
        return false
    }
}

async function fetch_hugin_messages() {
    const node = Hugin.node
    const incoming = incoming_messages.length > 0 ? true : false
    let json
    try {
        const latest = await check_node_version(node)
        if (latest) {
            //If we already have pending incoming unchecked messages, return
            //So we do not update the latest checked timestmap and miss any messages.
            if (incoming) return false
            //Latest version, fetch more messages with last checked timestamp
            json = await get_pool(node)
        } else {
            //Old node version, use get pool changes endpoint
            json = await get_pool_changes_lite(node)
        }
        if (!json) {
            Hugin.send('sync', 'Error')
            return false
        }
        const transactions = trimTxs(json)
        //Try clearing known pool txs from checked
        if (!latest) known_pool_txs = known_pool_txs.filter((n) => !json.deletedTxsIds.includes(n))
        if (transactions.length === 0) {
            console.log('No incoming messages...')
            return false
        }
        
        return transactions

    } catch (e) {
        Hugin.send('sync', 'Error')
        console.log("Sync error", e)
        return false
    }
}


async function send_message(message, receiver, off_chain = false, group = false, beam_this = false) {
    //Assert address length
    if (receiver.length !== 163) {
        return
    }
    if (message.length === 0) {
        return
    }

    //Split address and check history
    let address = receiver.substring(0, 99)
    let messageKey = receiver.substring(99, 163)
    let has_history = await check_history(messageKey, address)
    if (!beam_this) {
        let balance = await check_balance()
        if (!balance) return
    }

    let timestamp = Date.now()
    let payload_hex
    const seal = has_history ? false : true
    
    payload_hex = await encrypt_hugin_message(message, messageKey, seal, address)
    //Choose subwallet with message inputs
    let messageWallet = Hugin.wallet.getAddresses()[1]
    let messageSubWallet = Hugin.wallet.getAddresses()[2]

    if (!off_chain) {
        let result = await Hugin.wallet.sendTransactionAdvanced(
            [[messageWallet, 1000]], // destinations,
            3, // mixin
            { fixedFee: 1000, isFixedFee: true }, // fee
            undefined, //paymentID
            [messageWallet, messageSubWallet], // subWalletsToTakeFrom
            undefined, // changeAddresss
            true, // relayToNetwork
            false, // sneedAll
            Buffer.from(payload_hex, 'hex')
        )
        let sentMsg = {
            msg: message,
            k: messageKey,
            sent: true,
            t: timestamp,
            chat: address,
        }
        if (result.success) {
            known_pool_txs.push(result.transactionHash)
            saveHash(result.transactionHash)
            save_message(sentMsg)
            optimize_message_inputs()
        } else {
            let error = {
                message: `Failed to send, please wait a couple of minutes.`,
                name: 'Error',
                hash: Date.now(),
            }
            optimize_message_inputs(true)
            console.log(`Failed to send transaction: ${result.error.toString()}`)
            Hugin.send('error_msg', error)
            Hugin.send('pm-send-error', {message, address})
        }
    } else if (off_chain) {
        //Offchain messages
        let random_key = randomKey()
        let sentMsg = Buffer.from(payload_hex, 'hex')
        let sendMsg = random_key + '99' + sentMsg
        if (beam_this) {
            send_swarm_message(sendMsg, address, true)
        }
    else {
        let saveThisMessage = {
            msg: message,
            k: messageKey,
            sent: true,
            t: timestamp,
            chat: address,
        }
        save_message(saveThisMessage, true)
        }
    }
}

async function optimize_message_inputs(force = false) {

    let [mainWallet, subWallet, messageSubWallet] = Hugin.wallet.getAddresses()
    const [walletHeight, localHeight, networkHeight] = await Hugin.wallet.getSyncStatus()

    let inputs = await Hugin.wallet.subWallets.getSpendableTransactionInputs(
        [subWallet, messageSubWallet],
        networkHeight
    )

    if (inputs.length > 25 && !force) {
        Hugin.send('optimized', true)
        return
    }

    if (store.get('wallet.optimized')) {
        return
    }

    let subWallets = Hugin.wallet.subWallets.subWallets
    let txs
    subWallets.forEach((value, name) => {
        txs = value.unconfirmedIncomingAmounts.length
    })

    let payments = []
    let i = 0
    /* User payment */
    while (i <= 49) {
        payments.push([messageSubWallet, 1000])
        i += 1
    }

    let result = await Hugin.wallet.sendTransactionAdvanced(
        payments, // destinations,
        3, // mixin
        { fixedFee: 1000, isFixedFee: true }, // fee
        undefined, //paymentID
        [mainWallet], // subWalletsToTakeFrom
        undefined, // changeAddress
        true, // relayToNetwork
        false, // sneedAll
        undefined
    )

    if (result.success) {
        Hugin.send('optimized', true)

        store.set({
            wallet: {
                optimized: true
            }
        });

        reset_optimize()

        let sent = {
            message: 'Your wallet is creating message inputs, please wait',
            name: 'Optimizing',
            hash: parseInt(Date.now()),
            key: mainWallet,
            optimized: true
        }

        Hugin.send('sent_tx', sent)
        console.log('optimize completed')
        return true
    } else {

        store.set({
            wallet: {
                optimized: false
            }
        });

        Hugin.send('optimized', false)
        let error = {
            message: 'Optimize failed',
            name: 'Optimizing wallet failed',
            hash: parseInt(Date.now()),
            key: mainWallet,
        }
        Hugin.send('error_msg', error)
        return false
    }

}

async function reset_optimize() {
    await sleep(600 * 1000)
    store.set({
        wallet: {
            optimized: false
        }
    });
}


async function encrypt_hugin_message(message, messageKey, sealed = false, toAddr) {
    let timestamp = Date.now()
    let my_address = Hugin.wallet.getPrimaryAddress()
    const addr = await Address.fromAddress(toAddr)
    const [privateSpendKey, privateViewKey] = keychain.getPrivKeys()
    let xkr_private_key = privateSpendKey
    let box

    //Create the view tag using a one time private key and the receiver view key
    const keys = await crypto.generateKeys();
    const toKey = addr.m_keys.m_viewKeys.m_publicKey
    const outDerivation = await crypto.generateKeyDerivation(toKey, keys.private_key);
    const hashDerivation = await crypto.cn_fast_hash(outDerivation)
    const viewTag = hashDerivation.substring(0,2)

    if (sealed) {

        let signature = await xkrUtils.signMessage(message, xkr_private_key)
        let payload_json = {
            from: my_address,
            k: Buffer.from(keychain.getKeyPair().publicKey).toString('hex'),
            msg: message,
            s: signature,
        }
        let payload_json_decoded = naclUtil.decodeUTF8(JSON.stringify(payload_json))
        box = new naclSealed.sealedbox(
            payload_json_decoded,
            nonceFromTimestamp(timestamp),
            hexToUint(messageKey)
        )
    } else if (!sealed) {
        console.log('Has history, not using sealedbox')
        let payload_json = { from: my_address, msg: message }
        let payload_json_decoded = naclUtil.decodeUTF8(JSON.stringify(payload_json))

        box = nacl.box(
            payload_json_decoded,
            nonceFromTimestamp(timestamp),
            hexToUint(messageKey),
            keychain.getKeyPair().secretKey
        )
    }
    //Box object
    let payload_box = { box: Buffer.from(box).toString('hex'), t: timestamp, txKey: keys.public_key, vt: viewTag  }
    // Convert json to hex
    let payload_hex = toHex(JSON.stringify(payload_box))
    return payload_hex
}

async function send_room_message(message) {
    console.log("Send this!", message)
    const swarmMessage = JSON.stringify(message)
    //Swarm message is already encrypted over the connection
    send_swarm_message(swarmMessage, message.g)
    const save = sanitize_group_message(message, true)
    save_group_message(save, message.hash, message.t, false, true, false, true)
}


async function send_group_message(message, offchain = false, swarm = false) {
    console.log("Sending group msg!")
    if (message.m.length === 0) return
    const my_address = Hugin.wallet.getPrimaryAddress()
    const [privateSpendKey, privateViewKey] = keychain.getPrivKeys()
    const signature = await xkrUtils.signMessage(message.m, privateSpendKey)
    const timestamp = message.t
    const group = message.g
    const nonce = nonceFromTimestamp(timestamp)
    let reply = ''
    
    if (group === undefined) return
    if (group.length !== 64) {
        return
    }

    if (!offchain) {
        const balance = await check_balance()
        if (!balance) return
    }
 
    let message_json = {
        m: message.m,
        k: my_address,
        s: signature,
        g: group,
        n: Hugin.nickname,
        r: reply,
    }

    if (message.r) {
        message_json.r = message.r
    }

    if (message.c) {
        message_json.c = message.c
    }

    let [mainWallet, subWallet, messageSubWallet] = Hugin.wallet.getAddresses()
    const payload_unencrypted = naclUtil.decodeUTF8(JSON.stringify(message_json))
    const secretbox = nacl.secretbox(payload_unencrypted, nonce, hexToUint(group))

    const payload_encrypted = {
        sb: Buffer.from(secretbox).toString('hex'),
        t: timestamp,
    }

    const payload_encrypted_hex = toHex(JSON.stringify(payload_encrypted))

    if (!offchain) {
        let result = await Hugin.wallet.sendTransactionAdvanced(
            [[messageSubWallet, 1000]], // destinations,
            3, // mixin
            { fixedFee: 1000, isFixedFee: true }, // fee
            undefined, //paymentID
            [subWallet, messageSubWallet], // subWalletsToTakeFrom
            undefined, // changeAddress
            true, // relayToNetwork
            false, // sneedAll
            Buffer.from(payload_encrypted_hex, 'hex')
        )

        if (result.success) {
            message_json.sent = true
            message_json.t = timestamp
            message_json.hash = result.transactionHash
            const send = sanitize_group_message(message_json, true)
            send.hash = result.transactionHash
            await save_group_message(send, result.transactionHash, timestamp, false, false, false)
            Hugin.send('sent_group', {
                hash: result.transactionHash,
                time: timestamp,
            })
            known_pool_txs.push(result.transactionHash)
            saveHash(result.transactionHash)
            optimize_message_inputs()
        } else {
            let error = {
                message: 'Failed to send, please wait a couple of minutes.',
                name: 'Error',
                hash: Date.now(),
            }
            Hugin.send('group-send-error', {message: message.m, group})
            Hugin.send('error_msg', error)
            
            console.log(`Failed to send transaction: ${result.error.toString()}`)
            optimize_message_inputs(true)
        }
    } else if (offchain) {
        //Generate a random hash
        let hash = message.h
        let rtcMessage = Buffer.from(payload_encrypted_hex, 'hex')
        message_json.t = timestamp
        let swarmMessage = JSON.stringify(message_json)
        let webRTCmessage = random_key + '99' + rtcMessage
        //Swarm message is already encrypted over the connection
        message_json.sent = true
        if (swarm) {
            console.log("Send to swarm!", message_json)
            send_swarm_message(swarmMessage, group)
            save_group_message(message_json, hash, timestamp, false, true, false)
            Hugin.send('sent_rtc_group', {
                hash: hash,
                time: message.t,
            })
            return
        }
        let messageArray = [webRTCmessage]
        Hugin.send('rtc_message', [messageArray, true])
        Hugin.send('sent_rtc_group', {
            hash: random_key,
            time: message.t,
        })
        
    }
}


async function decryptRtcMessage(message) {
    let hash = message.substring(0, 64)
    let newMsg = await extraDataToMessage(message, known_keys, keychain.getXKRKeypair())

    if (newMsg) {
        newMsg.sent = false
    }
    
    let group = newMsg.msg.msg

    if (group && 'key' in group) {
            if (group.key === undefined) return 
            let invite_key = sanitizeHtml(group.key)
            if (invite_key.length !== 64) return

            Hugin.send('group-call', {invite_key, group})

            if (group.type == 'invite') {
                console.log('Group invite, thanks.')
                return
            }

            sleep(100)

            let video = false
            if (group.type === true) {
                video = true
            }

            let invite = true
            group.invite.forEach((call) => {
                let contact = sanitizeHtml(call)
                if (contact.length !== 163) {
                    Hugin.send('error-notify-message', 'Error reading invite address')
                }
                console.log('Invited to call, joining...')
                Hugin.send('start-call', contact, video, invite)
                sleep(1500)
            })

            return

        } else {
            console.log('Not an invite')
        }

    if (!newMsg) return

    save_message(newMsg, true)
}


async function sync_group_history(timeframe, recommended_api, key=false, page=1) {
    if (recommended_api === undefined) return
    fetch(`${recommended_api}?from=${timeframe}&to=${Date.now() / 1000}&size=50&page=` + page)
    .then((response) => response.json())
    .then(async (json) => {
        const items = json.encrypted_group_posts;
        Hugin.send('success-notify-message', 'Found messages! Syncing...')
        for (const message of items) {   
            try {
                    let tx = {}
                    tx.sb = message.tx_sb
                    tx.t = message.tx_timestamp
                    await decrypt_group_message(tx, message.tx_hash, key)
                        
                }
                 catch {
                }
        }
        if(json.current_page != json.total_pages) {
            sync_group_history(timeframe, recommended_api, key, page+1)
        }
    })
}

async function decrypt_group_message(tx, hash, group_key = false) {

    try {
    let decryptBox = false
    let offchain = false
    let groups = await loadGroups()
    
    if (group_key.length === 64) {
        let msg = tx
        tx = JSON.parse(trimExtra(msg))
        groups.unshift({ key: group_key })
        offchain = true
    }

    let key

    let i = 0

    while (!decryptBox && i < groups.length) {
        let possibleKey = groups[i].key

        i += 1

        try {
            decryptBox = nacl.secretbox.open(
                hexToUint(tx.sb),
                nonceFromTimestamp(tx.t),
                hexToUint(possibleKey)
            )

            key = possibleKey
        } catch (err) {
        }
    }
    
    if (!decryptBox) {
        return false
    }

    const message_dec = naclUtil.encodeUTF8(decryptBox)
    const payload_json = JSON.parse(message_dec)
    const from = payload_json.k
    const this_addr = await Address.fromAddress(from)

    const verified = await xkrUtils.verifyMessageSignature(
        payload_json.m,
        this_addr.spend.publicKey,
        payload_json.s
    )

    if (!verified) return false
    if (block_list.some(a => a.address === from)) return false

    payload_json.hash = hash
    payload_json.t = tx.t
    payload_json.sent = false
    
    const message = sanitize_group_message(payload_json, false)
    if (!message) return false
    await save_group_message(message, hash, tx.t, offchain)
    if (!saved) return false

    return [message, tx.t, hash]

    } catch {
        return false
    }
}

async function decryptGroupRtcMessage(message, key) {
    try {
        let hash = message.substring(0, 64)
        let [groupMessage, time, txHash] = await decrypt_group_message(message, hash, key)

        if (!groupMessage) {
            return
        }
        if (groupMessage.m === 'ᛊNVITᛊ') {
            if (groupMessage.r.length === 163) {
                let invited = sanitizeHtml(groupMessage.r)
                Hugin.send('group_invited_contact', invited)
                console.log('Invited')
            }
        }
    } catch (e) {
        console.log('Not an invite')
    }
}

const check_balance = async () => {
    try {
        let [munlockedBalance, mlockedBalance] = await Hugin.wallet.getBalance()

        if (munlockedBalance < 11) {
            Hugin.send('error-notify-message', 'Not enough unlocked funds.')
            return false
        }
    } catch (err) {
        return false
    }
    return true
}

async function save_group_message(msg, hash, time, offchain, channel = false, add = false, room = false) {
    const saved = await saveGroupMsg(msg, hash, time, offchain, channel)
    if (!saved) return false
    if (room) {
        Hugin.send('roomMsg', saved)
        Hugin.send('sent_room')
        return
    }
    if (!offchain) {
        //Send new board message to frontend.
        Hugin.send('groupMsg', saved)
        Hugin.send('group-notification', [saved, add])
    } else if (offchain) {
        if (saved.message === 'ᛊNVITᛊ') return
        Hugin.send('groupRtcMsg', saved)
    }
}


//Saves private message
async function save_message(msg, offchain = false) {
    let [message, addr, key, timestamp, sent] = sanitize_pm_message(msg)
    if (!message) return

    if (await messageExists(timestamp)) return

    //If sent set addr to chat instead of from
    if (msg.chat && sent) {
        addr = msg.chat
    }

    //New message from unknown contact
    if (msg.type === 'sealedbox' && !sent) {
        let hugin = addr + key
        await save_contact(hugin)
    }

    let newMsg = await saveMsg(message, addr, sent, timestamp, offchain)
    if (sent) {
        //If sent, update conversation list
        Hugin.send('sent', newMsg)
        return
    }
    //Send message to front end
    Hugin.send('newMsg', newMsg)
    Hugin.send('privateMsg', newMsg)
}

//Saves contact and nickname to db.
async function save_contact(hugin_address, nickname = false, first = false) {

    let name
    if (!nickname) {
        name = 'Anon'
    } else {
        name = nickname
    }
    let addr = hugin_address.substring(0, 99)
    let key = hugin_address.substring(99, 163)

    if (known_keys.indexOf(key) == -1) {
        known_keys.push(key)
    }
    
    saveThisContact(addr, key, name)
    Hugin.send('saved-addr', addr)

    if (first) {
        save_message({
            msg: 'New friend added!',
            k: key,
            from: addr,
            chat: addr,
            sent: true,
            t: Date.now(),
        })
        known_keys.pop(key)
    }
}

async function check_history(messageKey, addr) {
    //Check history
    if (known_keys.indexOf(messageKey) > -1) {  
        let [conv] = await getConversation(addr)
        if (parseInt(conv.timestamp) < parseInt(store.get("db.versionDate"))) return false
        return true
    } else {
        known_keys.push(messageKey)
        return false
    }


}

function get_sdp(data) 
{
    if (data.type == 'offer') 
    {
        let parsed_data = `${data.video ? 'Δ' : 'Λ'}` + parse_sdp(data.data, false)
        send_message(parsed_data, data.contact, true, data.group, true)
    } 
    else if (data.type == 'answer') 
    {
        let parsed_data = `${data.video ? 'δ' : 'λ'}` + parse_sdp(data.data, true)
        send_message(parsed_data, data.contact, true, data.group, true)
    }
}



ipcMain.on('fetch-group-history', async (e, settings) => {
    let timeframe = Date.now() / 1000 - settings.timeframe * 86400
    //If key is not undefined we know which group to search messages from
    if (settings.key === undefined) settings.key = false
    //Clear known pool txs to look through messages we already marked as known
    known_pool_txs = []
    await sync_group_history(timeframe, settings.recommended_api, settings.key)
})

module.exports = {check_history, save_message, start_message_syncer, send_message, optimize_message_inputs}