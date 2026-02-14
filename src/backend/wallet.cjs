const WB = require('kryptokrona-wallet-backend-js')
const fs = require('fs')
const files = require('fs/promises')
const { join } = require('path')
const { app, ipcMain } = require('electron')
const userDataDir = app.getPath('userData')
const file = join(userDataDir, 'misc.db')
const { JSONFile, Low } = require('@commonify/lowdb')
const { default: fetch } = require('electron-fetch')
const adapter = new JSONFile(file)
const db = new Low(adapter)
const Store = require('electron-store');
const store = new Store()

const {hash, sleep} = require('./utils.cjs')
const { Hugin } = require('./account.cjs')
const { keychain } = require('./crypto.cjs')
const { start_message_syncer } = require('./messages.cjs')
const { getRooms } = require('./database.cjs')
const { new_swarm, Nodes } = require('./swarm.cjs')

let js_wallet
let daemon
let hashed_pass = ""
let saving = false
//IPC LISTENERS

ipcMain.on('login', async (event, data) => {
    if (await loadAccount(data)) start_message_syncer()
 })

ipcMain.on('create-account', async (e, accountData) => {
    if(await createAccount(accountData)) start_message_syncer()
})

ipcMain.on('switch-node', (e, node) => {
    pickNode(node) 
})

ipcMain.handle('send-tx', async (e, tx) => {
    return await sendTx(tx)
})

ipcMain.handle('verify-pass', async (e, pass) => {
   return await checkPass(pass)
})


//Rescan wallet
ipcMain.on('rescan', async (e, height) => {
    js_wallet.reset(parseInt(height))
})

ipcMain.handle('get-private-keys', async () => {
    return keychain.getPrivKeys()
})

ipcMain.handle('get-mnemonic', async () => {
    return await js_wallet.getMnemonicSeed()
})

ipcMain.handle('get-balance', async () => {
    return await js_wallet.getBalance()
})

ipcMain.handle('get-address', async () => {
    return js_wallet.getAddresses()
})

ipcMain.handle('get-height', async () => {
    let [walletHeight, daemonCount, networkHeight] = await getSyncStatus()
    return { walletHeight, networkHeight }
})

//Gets n transactions per page to view in frontend
ipcMain.handle('get-transactions', async (e, startIndex) => {
    return await getTransactions(startIndex)
})

///FUNCTIONS

const loadWallet = (ipc) => {
    sender = ipc
}

async function startHugin(walletName, password, node) {

    if (!await login(walletName, password)) return false
    //Sleep 300ms
    await sleep(500)

    await Hugin.init(js_wallet, walletName, node, sender)

    join_rooms()
    
    Hugin.send('success-notify-message', 'Login success!')
    
    await fuseHuginAddress()

    sendNodeInfo()

    pickNode(node.node + ":" + node.port.toString())

    await startWallet(walletName, password)
    
    await sleep(200)

    //Incoming transaction event
    js_wallet.on('incomingtx', (transaction) => {
        incomingTx(transaction)
    })

    js_wallet.on('createdtx', async (tx) => {
        console.log('***** outgoing *****', tx)
        await saveWallet(js_wallet, walletName, password)
    })

    //Wallet heightchange event with funtion that saves wallet only if we are synced
    js_wallet.on(
        'heightchange',
        async (walletBlockCount, localDaemonBlockCount, networkBlockCount) => {
            let synced = networkBlockCount - walletBlockCount <= 2
            if (networkBlockCount === 0) return
            if (synced) {
                //Send synced event to frontend
                sender('sync', 'Synced')

                // Save js wallet to file
                console.log('///////******** SAVING WALLET *****\\\\\\\\')
                if (!saving) await saveWallet(js_wallet, walletName, password)
            } else if (!synced) {

            }
        }
    )

    return true
   
}

const join_rooms = async () => {
    const rooms = await getRooms()
    for (const room of rooms) {
        new_swarm({key: room.key})
        await sleep(200)
    }
}

//Create account
async function createAccount(accountData) {
    const walletName = accountData.walletName
    const myPassword = accountData.password
    const node = { node: accountData.node, port: accountData.port }
 
    loadDaemon(node.node, node.port)

    if (!accountData.blockheight) {
        accountData.blockheight = 1
    }
    const [js_wallet, error] =
        accountData.mnemonic.length > 0
            ? await importFromSeed(daemon,
                accountData.blockheight,
                accountData.mnemonic)
            : await createWallet()

    // Save js wallet to file as backup
    await saveWallet(js_wallet, walletName, myPassword)

    //Create misc DB template on first start
    db.data = {
        walletNames: [],
        node: { node: '', port: '' },
    }
    //Saving node
    db.data.node = node
    //Saving wallet name
    db.data.walletNames.push(walletName)
    await db.write()

    return await startHugin(walletName, myPassword, node)

}

const startWallet = async (walletName, password) => {
    //Disable wallet optimization
    await js_wallet.enableAutoOptimization(false)
    //Disable scanning for transactions in pool
    await js_wallet.scanPoolTransactions(false)
    //Start wallet sync process
    await js_wallet.start()
    //Create extra message subwallets for small inputs
    await createMessageSubWallet();
    //Save backup wallet to file
    saveWalletToFile(js_wallet, walletName, password)
}


const fuseHuginAddress = async () => {
    //Get primary address and fuse it with our message key to create our hugin address
    const address = await js_wallet.getPrimaryAddress()
    const key = keychain.getMsgKey()
    const huginAddress = address + key
    sender('addr', huginAddress)
}

const login = async (walletName, password) => {
    const [loggedIn, wallet]  = await loginWallet(walletName, password)
    if (!loggedIn) return false
    js_wallet = wallet
    return true
}

const createWallet = async () => {
    return [await WB.WalletBackend.createWallet(daemon), null]
}

const loadDaemon = (nodeUrl, nodePort) => {
  daemon = new WB.Daemon(nodeUrl, nodePort)
}

const checkPass = async (pass) => {
    let passHash = await hash(pass)
    if (hashed_pass === passHash) return true
    return false
}

const importFromSeed = async (daemon, blockHeight, mnemonic) => {
    return await WB.WalletBackend.importWalletFromSeed(
        daemon,
        blockHeight,
        mnemonic
    )
}

const loginWallet = async (walletName, password) => {
    const wallet = await logIntoWallet(walletName, password)
    if (wallet === 'Wrong password') {
        sender('login-failed')
        return [false, undefined]
    }
    
    hashed_pass = await hash(password)
    return [true, wallet]
}

const saveWallet = async (wallet, walletName, password) => {
    saving = true
    let my_wallet = await encryptWallet(wallet, password)
    let wallet_json = JSON.stringify(my_wallet)
    try {
        await files.writeFile(userDataDir + '/' + walletName + '.json', wallet_json)
    } catch (err) {
        console.log('Wallet json saving error, revert to saving wallet file')
        wallet.saveWalletToFile(userDataDir + '/' + walletName + '.wallet', password)
    }
    saving = false
}

const saveWalletToFile = (wallet, walletName, password) => {
    wallet.saveWalletToFile(userDataDir + '/' + walletName + '.wallet', password)
}

const logIntoWallet = async (walletName, password) => {
    let parsed_wallet
    let json_wallet = await openWallet(walletName, password)
    try {
        //Try parse json wallet
        parsed_wallet = JSON.parse(json_wallet)
        //Open encrypted json wallet
        const [js_wallet, error] = await WB.WalletBackend.openWalletFromEncryptedString(
            daemon,
            parsed_wallet,
            password
        )
        if (error) {
            console.log('Failed to open wallet: ' + error.toString())
            return 'Wrong password'
        }
        return js_wallet
    } catch (err) {
        console.log('error parsing wallet', err)
        let wallet = await openWalletFromFile(walletName, password)
        return wallet
        //Probably a wallet file, return this
    }
}

const openWalletFromFile = async (walletName, password) => {
    console.log('Open wallet from file')
    const [js_wallet, error] = await WB.WalletBackend.openWalletFromFile(
        daemon,
        userDataDir + '/' + walletName + '.wallet',
        password
    )
    if (error) {
        console.log('Failed to open wallet: ' + error.toString())
        return 'Wrong password'
    }
    return js_wallet
}
const encryptWallet = async (wallet, pass) => {
    return await wallet.encryptWalletToString(pass)
}


const openWallet = async (walletName, password) => {
    let json_wallet

    try {
        json_wallet = await files.readFile(userDataDir + '/' + walletName + '.json')
        return json_wallet
    } catch (err) {
        console.log('Json wallet error, try backup wallet file', err)
    }
}

const getSyncStatus = () => {
    return js_wallet.getSyncStatus()
}

const getTransactions = async (startIndex, all = false) => {
        const showPerPage = 20
        let txs = []
        const allTx = await js_wallet.getTransactions()
        const pages = Math.ceil(allTx.length / showPerPage)
        const pageTx = []
        if (all) txs = allTx
        else txs = await js_wallet.getTransactions(startIndex, showPerPage)
        for (const tx of txs) {
          //Unconfirmed txs do not have a blockheight or timestamp yet.
          if (tx.timestamp === 0) {
            tx.timestamp = Date.now() / 1000
            tx.blockHeight = "Unconfirmed"
          }
          //Exclude optimize txs
          if (tx.totalAmount() === 0) continue
            pageTx.push({
                hash: tx.hash,
                amount: (tx.totalAmount() / 100000).toFixed(5).toString(),
                time: tx.timestamp,
                height: tx.blockHeight,
                confirmed: true
            })
        }
    
        return { pageTx, pages }
}

async function createMessageSubWallet() {

    if (js_wallet.subWallets.getAddresses().length < 3) {
        if (js_wallet.subWallets.getAddresses().length === 1) {
        const [address, error] = await js_wallet.addSubWallet()
        if (error) {
           return 
        }
        }
        const [spendKey, viewKey] = keychain.getPrivKeys()
        const subWalletKeys = await keychain.generateDeterministicSubwalletKeys(spendKey, 1)
        await js_wallet.importSubWallet(subWalletKeys.private_key)
    }
}

function incomingTx(transaction) {
    const [wallet_count, daemon_count, network_height] = js_wallet.getSyncStatus()
        let synced = network_height - wallet_count <= 2
        if (!synced) return
        console.log(`Incoming transaction of ${transaction.totalAmount()} received!`)
        console.log('transaction', transaction)
        sender('new-message', transaction.toJSON())

}

function sendNodeInfo() {
    const [walletBlockCount, localDaemonBlockCount, networkBlockCount] = js_wallet.getSyncStatus()
    sender('sync', 'Loading')
    sender('node-sync-data', {
        walletBlockCount,
        localDaemonBlockCount,
        networkBlockCount,
    })

}

const pickNode = async (node) => {
    let nodeUrl = node.split(':')[0]
    let nodePort = parseInt(node.split(':')[1])
    const picked = { node: nodeUrl, port: nodePort }
    if (!await checkNodeStatus(picked)) return
    loadDaemon(nodeUrl, nodePort)
    await js_wallet.swapNode(daemon)
    sender('switch-node', picked)
    saveNode(picked)
    Hugin.node = picked
}

const saveNode = async (node) => {
    db.data.node = node
    await db.write()
   }

async function loadHugin(send) {
    const [node, walletName] = await loadMiscData()
    send.webContents.send('wallet-exist', true, walletName, node)
    loadDaemon(node.node, node.port)
}

async function loadAccount(data) {
    let node = {node: data.node, port: data.port}
    return await startHugin(data.thisWallet, data.myPassword, node)
}


    
const loadMiscData = async () => {  
    await db.read()
    let node = db.data.node.node
    let port = db.data.node.port
    if (node === undefined) {
        node = "techy.ddns.net"
        port = 11898
    }
    
    return [{node, port}, db.data.walletNames]
  }



async function checkNodeStatus (node) {
    try {
        const req = await fetch('http://' + node.node + ':' + node.port.toString() + '/getinfo')
        const res = await req.json()
        if (res.status === 'OK') return true
    } catch (e) {
        try {
            const req = await fetch('https://' + node.node + ':' + node.port.toString() + '/getinfo')
            const res = await req.json()
        if (res.status === 'OK') return true
        } catch(e) {
            console.log("Node error", e)
        }
    }
    
    sender('node-not-ok')
    return false
}


async function sendTx(tx) {
    const sendTo = tx.upgrade ? [[tx.to, 4900000 ], [Nodes.address, 5000000]] : [[tx.to, tx.amount]]
    console.log(`✅ SENDING`, sendTo)
    let result = await js_wallet.sendTransactionAdvanced(
        sendTo, // destinations,
        3, // mixin
        { fixedFee: 1000, isFixedFee: true }, // fee
        tx.paymentID, //paymentID
        undefined, // subWalletsToTakeFrom
        undefined, // changeAddress
        true, // relayToNetwork
        false, // sneedAll
        undefined
    )
    if (result.success) {
        let amount = tx.amount / 100000
        let sent = {
            message: `You sent ${amount} XKR`,
            name: 'Transaction sent',
            hash: parseInt(Date.now()),
            key: tx.to,
        }
        sender('sent_tx', sent)
        return true
    } else {
        console.log(`Failed to send transaction: ${result.error.toString()}`)
        let error = {
            message: 'Failed to send',
            name: 'Transaction error',
            hash: Date.now(),
        }
      sender('error_msg', error)
      return false
    }
}
   

module.exports = {loadDaemon, loadWallet, createAccount, createWallet, saveWallet, saveWalletToFile, pickNode,loadAccount, loadHugin, createMessageSubWallet, loadMiscData }

// Validation Handlers
ipcMain.handle('validate-address', async (event, address) => {
    try {
        console.log('Validating address:', address)
        const isValid = WB.validateAddress(address, true)
        console.log('Valid?', isValid)
        return isValid
    } catch (error) {
        console.error('Address validation error:', error)
        return false
    }
})

ipcMain.handle('validate-payment-id', async (event, paymentId) => {
    try {
        if (!paymentId) return true // Empty payment ID is valid (optional)
        console.log('Validating payment ID:', paymentId)
        const isValid = WB.validatePaymentID(paymentId, true)
        console.log('Valid?', isValid)
        return isValid.errorCode === 0 
    } catch (error) {
        console.error('Payment ID validation error:', error)
        return false
    }
})
