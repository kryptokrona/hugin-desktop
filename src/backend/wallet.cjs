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
const { welcomeMessage, firstContact} = require("./database.cjs")
const { Hugin } = require('./account.cjs')
const { keychain } = require('./crypto.cjs')

let js_wallet
let daemon
let hashed_pass = ""

//IPC LISTENERS

ipcMain.on('switchNode', (e, node) => {
    pickNode(node) 
})

ipcMain.on('sendTx', (e, tx) => {
    sendTx(tx)
})


//Rescan wallet
ipcMain.on('rescan', async (e, height) => {
    js_wallet.reset(parseInt(height))
})

ipcMain.handle('getPrivateKeys', async () => {
    return keychain.getPrivKeys()
})

ipcMain.handle('getMnemonic', async () => {
    return await js_wallet.getMnemonicSeed()
})

ipcMain.handle('getBalance', async () => {
    return await js_wallet.getBalance()
})

ipcMain.handle('getAddress', async () => {
    return js_wallet.getAddresses()
})

ipcMain.handle('getHeight', async () => {
    let [walletHeight, daemonCount, networkHeight] = await getSyncStatus()
    return { walletHeight, networkHeight }
})

//Gets n transactions per page to view in frontend
ipcMain.handle('getTransactions', async (e, startIndex) => {
    return await getTransactions()
})

///FUNCTIONS

const loadWallet = (ipc) => {
    sender = ipc
}

async function startJsWallet(walletName, password, node) {
    
    if (await checkPassword(password, node)) return false

    if (!await login(walletName, password)) return false

    //Sleep 300ms
    await sleep(300)

    await Hugin.init(js_wallet, walletName, node, sender)
    
    await fuseHuginAddress()

    sendNodeInfo()

    pickNode(node.node + ":" + node.port.toString())

    await startWallet(walletName, password)
    
    await sleep(500)

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
            if (synced) {
                //Send synced event to frontend
                sender('sync', 'Synced')

                // Save js wallet to file
                console.log('///////******** SAVING WALLET *****\\\\\\\\')
                await saveWallet(js_wallet, walletName, password)
            } else if (!synced) {

            }
        }
    )

    return true
    
   
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
            ? await importFromSeed(
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
    // console.log('creating dbs...')
    // //Create welcome PM message
    // welcomeMessage()
    // //Create Hugin welcome contact
    // firstContact()

    return await startJsWallet(walletName, myPassword, node)

}

const startWallet = async (walletName, password) => {
    //Disable wallet optimization
    await js_wallet.enableAutoOptimization(false)
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



const checkPassword = async (password, node) => {
    //If we are already logged in
    if (hashed_pass.length) {
       verifyPassword(password, hashed_pass)
       return true
   }

   await checkNodeStatus(node)
   return false
}

const verifyPassword = async (password, hashed_pass) => {
    if (await checkPass(password, hashed_pass)) {
        await sleep(1000)
        sender('login-success')
        return true
    } else {
        sender('login-failed')
        return false
    }
}

const checkPass = async (pass, oldHash) => {
    let passHash = await hash(pass)
    if (oldHash === passHash) return true
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
    let my_wallet = await encryptWallet(wallet, password)
    let wallet_json = JSON.stringify(my_wallet)

    try {
        await files.writeFile(userDataDir + '/' + walletName + '.json', wallet_json)
    } catch (err) {
        console.log('Wallet json saving error, revert to saving wallet file')
        wallet.saveWalletToFile(userDataDir + '/' + walletName + '.wallet', password)
    }
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

const getTransactions = async (startIndex) => {
    let startFrom = startIndex
    const showPerPage = 10
    const allTx = await js_wallet.getTransactions()
    const pages = Math.ceil(allTx.length / showPerPage)
    const pageTx = []
    for (const tx of await js_wallet.getTransactions(startFrom, showPerPage)) {
        let amount = WB.prettyPrintAmount(tx.totalAmount())
        tx.transfers.forEach(function (value) {
            if (value === -1000) {
                amount = -0.01000
            }
        })
        pageTx.push({
            hash: tx.hash,
            amount: amount.toString(),
            time: tx.timestamp,
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
        const subWalletKeys = await keychain.generateDeterministicSubwalletKeys(spendKey)
        await js_wallet.importSubWallet(subWalletKeys.private_key)
    }
}

function incomingTx(transaction) {
    const [wallet_count, daemon_count, network_height] = js_wallet.getSyncStatus()
        let synced = network_height - wallet_count <= 2
        if (!synced) return
        optimizeMessages()
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
    saveNode(node)
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
    return await startJsWallet(data.thisWallet, data.myPassword, node)
}


    
const loadMiscData = async () => {  
    await db.read()
    let node = db.data.node.node
    let port = db.data.node.port

    if (node || port === undefined) {
        node = 'privacymine.net'
        port = 11898
    }
    return [{ node, port}, db.data.walletNames]
  }



async function checkNodeStatus (node) {
    try {
        const req = await fetch('http://' + node.node + ':' + node.port.toString() + '/getinfo')

        const res = await req.json()

        if (res.status === 'OK') return true
    } catch (e) {
        console.log('Node error')
    }
    
    sender('node-not-ok')
    return false
}


async function sendTx(tx) {
    console.log('transactions', tx)
    console.log(`✅ SENDING ${tx.amount} TO ${tx.to}`)
    let result = await js_wallet.sendTransactionAdvanced(
        [[tx.to, tx.amount]], // destinations,
        3, // mixin
        { fixedFee: 1000, isFixedFee: true }, // fee
        undefined, //paymentID
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
    } else {
        console.log(`Failed to send transaction: ${result.error.toString()}`)
        let error = {
            message: 'Failed to send',
            name: 'Transaction error',
            hash: Date.now(),
        }
      sender('error_msg', error)
    }
}
   

module.exports = {loadDaemon, loadWallet, createAccount, createWallet, saveWallet, saveWalletToFile, pickNode,loadAccount, loadHugin, createMessageSubWallet, loadMiscData }

