const WB = require('kryptokrona-wallet-backend-js')
const fs = require('fs')
const files = require('fs/promises')
const {hash} = require('./utils.cjs')
const { join } = require('path')
const { app, ipcMain } = require('electron')
const userDataDir = app.getPath('userData')
const file = join(userDataDir, 'misc.db')
const { JSONFile, Low } = require('@commonify/lowdb')
const { default: fetch } = require('electron-fetch')
const adapter = new JSONFile(file)
const db = new Low(adapter)

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
    return getPrivKeys()
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
})

///FUNCTIONS

const loadWallet = (ipc) => {
    sender = ipc
}

const getXKRKeypair = () => {
    const [privateSpendKey, privateViewKey] = getPrivKeys()
    return { privateSpendKey, privateViewKey }
}

const createWallet = async () => {
    return [await WB.WalletBackend.createWallet(daemon), null]
}

const loadDaemon = (nodeUrl, nodePort) => {
    console.log("Log daemon", nodeUrl, nodePort)
  daemon = new WB.Daemon(nodeUrl, nodePort)
}

const getPrivKeys = () => {
    return js_wallet.getPrimaryAddressPrivateKeys()
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
    js_wallet = await logIntoWallet(walletName, password)
    if (js_wallet === 'Wrong password') {
        sender('login-failed')
        return [false, undefined]
    }
    
    hashed_pass = await hash(password)
    return [true, js_wallet]
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

const getSpendableTransactionInputs = async ([subWallet, messageSubWallet], networkHeight) => {
   return await js_wallet.subWallets.getSpendableTransactionInputs(
        [subWallet, messageSubWallet],
        networkHeight
    )
}

async function createMessageSubWallet() {

    if (js_wallet.subWallets.getAddresses().length < 3) {
        if (js_wallet.subWallets.getAddresses().length === 1) {
        const [address, error] = await js_wallet.addSubWallet()
        if (error) {
           return 
        }
        }
        const [spendKey, viewKey] = getPrivKeys()
        const subWalletKeys = await crypto.generateDeterministicSubwalletKeys(spendKey, 1)
        await js_wallet.importSubWallet(subWalletKeys.private_key)
    }
}

const pickNode = async (node) => {
    let nodeUrl = node.split(':')[0]
    let nodePort = parseInt(node.split(':')[1])
    const newNode = { node: nodeUrl, port: nodePort }
    if (!await checkNodeStatus(newNode)) return
    loadDaemon(nodeUrl, nodePort)
    await js_wallet.swapNode(daemon)
    sender('switch-node', newNode)
    saveNode(node)
}

const saveNode = async (node) => {
    db.data.node = node
    await db.write()
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

const getAddress = async () => {
   return await js_wallet.getPrimaryAddress()
}

const getAddresses = () => {
    return js_wallet.subWallets.getAddresses()
}

const checkBalance = async () => {
    try {
        let [munlockedBalance, mlockedBalance] = await js_wallet.getBalance()

        if (munlockedBalance < 11) {
            mainWindow.webContents.send('error-notify-message', 'Not enough unlocked funds.')
            return false
        }
    } catch (err) {
        return false
    }
    return true
}

const resetWallet = (block) => {
    js_wallet.reset(block)
}

const getSubWallets = () => {
   return js_wallet.subWallets.subWallets
}

const sendTransactionAdvanced = (destinations, mixin, fee, paymentID, walletsToTaeFrom, changeAddress, relay, sendAll, extra) => {
    return js_wallet.sendTransactionAdvanced(destinations, mixin, fee, paymentID, walletsToTaeFrom, changeAddress, relay, sendAll, extra)
}


async function sendTx(tx) {
    console.log('transactions', tx)
    console.log(`✅ SENDING ${tx.amount} TO ${tx.to}`)
    let result = await sendTransactionAdvanced(
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
        console.log(
            `Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(
                result.fee
            )}`
        )
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
   

module.exports = {loadDaemon, createWallet, importFromSeed, loginWallet, loadWallet, saveWallet, saveWalletToFile, pickNode, saveNode, loadMiscData, checkPassword, createMessageSubWallet, getXKRKeypair, getPrivKeys, getSyncStatus, getAddress, getAddresses, getSubWallets, checkBalance, getSpendableTransactionInputs, sendTransactionAdvanced, resetWallet}

