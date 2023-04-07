const contextMenu = require('electron-context-menu')
const {
    app,
    BrowserWindow,
    ipcMain,
    Tray,
    Menu,
    nativeTheme,
    systemPreferences,
} = require('electron')
const serve = require('electron-serve')
const { join } = require('path')
const { JSONFile, Low } = require('@commonify/lowdb')
const fs = require('fs')
const files = require('fs/promises')
const WB = require('kryptokrona-wallet-backend-js')
const { default: fetch } = require('electron-fetch')
const nacl = require('tweetnacl')
const naclUtil = require('tweetnacl-util')
const naclSealed = require('tweetnacl-sealed-box')
const { extraDataToMessage } = require('hugin-crypto')
const sanitizeHtml = require('sanitize-html')
const en = require('int-encoder')
const sqlite3 = require('sqlite3').verbose()
const { autoUpdater } = require('electron-updater')
const notifier = require('node-notifier')
const {createReadStream} = require("fs");
const { 
    expand_sdp_answer, 
    expand_sdp_offer, 
    parse_sdp } = require("./sdp.cjs")
const {
    sleep, 
    trimExtra, 
    fromHex, 
    nonceFromTimestamp, 
    createGroup, 
    hexToUint, 
    toHex } = require("./utils.cjs")
const {
    loadDB,
    saveHash,
    loadGroups,
    loadKeys,
    getGroups,
    saveGroupMsg,
    unBlockContact,
    blockContact,
    removeMessages,
    removeContact,
    removeGroup,
    addGroup,
    removeBoard,
    loadBlockList,
    getConversation,
    getConversations,
    loadKnownTxs,
    getMyBoardList,
    getBoardMsgs,
    getMessages,
    getReplies,
    getGroupReply,
    getReply,
    printGroup,
    printBoard,
    saveMsg,
    saveBoardMessage,
    saveThisContact,
    groupMessageExists,
    messageExists,
    getContacts,
    firstContact,
    welcomeMessage,
    welcomeBoardMessage,
    addBoard
} = require("./database.cjs")
const {
    Address,
    Crypto,
    CryptoNote,
} = require('kryptokrona-utils')

const { newBeam, endBeam, sendBeamMessage, addLocalFile, requestDownload, removeLocalFile } = require("./beam.cjs")
const Store = require('electron-store');
const appRoot = require('app-root-dir').get().replace('app.asar', '')
const appBin = appRoot + '/bin/'
const crypto = new Crypto()
const xkrUtils = new CryptoNote()
const userDataDir = app.getPath('userData')
const appPath = app.getAppPath()
const downloadDir = app.getPath('downloads')
const dbPath = userDataDir + '/SQLmessages.db'
const serveURL = serve({ directory: '.' })
const port = process.env.PORT || 5173
const dev = !app.isPackaged

let mainWindow
let daemon
let nodeUrl
let nodePort
//node will contain {node: nodeUrl, port: nodePort}
let node

//Create misc.db
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)
const store = new Store()

const welcomeAddress =
    'SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1'

let js_wallet
let walletName
let known_keys = []
let known_pool_txs = []
let myPassword
let my_boards = []
let block_list = []
let hashed_pass = ""

try {
    require('electron-reloader')(module)
} catch (e) {
    console.error(e)
}

function createWindow() {
    const windowStateManager = require('electron-window-state')
    const path = require('path')
    let windowState = windowStateManager({
        defaultWidth: 1000,
        defaultHeight: 700,
    })

    const mainWindow = new BrowserWindow({
        frame: false,
        autoHideMenuBar: true,
        minHeight: 700,
        minWidth: 1000,
        transparent: true,
        webPreferences: {
            enableRemoteModule: true,
            contextIsolation: true,
            nodeIntegration: true,
            spellcheck: false,
            devTools: dev,
            preload: path.join(__dirname, 'preload.cjs'),
        },
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height
    })

    windowState.manage(mainWindow)

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
        mainWindow.focus()
    })

    mainWindow.on('close', () => {
        windowState.saveState(mainWindow)
    })

    return mainWindow
}

contextMenu({
    showLookUpSelection: false,
    showSearchWithGoogle: false,
    showCopyImage: false,
})

function loadVite(port) {
    mainWindow.loadURL(`http://localhost:${port}`).catch((e) => {
        console.log('Error loading URL, retrying', e)
        setTimeout(() => {
            loadVite(port)
        }, 200)
    })
}

function createMainWindow() {
    mainWindow = createWindow()
    mainWindow.once('close', () => {
        mainWindow = null
    })

    if (dev) loadVite(port)
    else serveURL(mainWindow)
}

app.on('ready', createMainWindow)
app.on('activate', () => {
    if (!mainWindow) {
        createMainWindow()
    }
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

ipcMain.on('close', () => {
    mainWindow.hide()
    if (process.platform === 'darwin') {
        app.dock.hide()
    }
})

ipcMain.on('min', () => {
    mainWindow.minimize()
})

let tray
app.whenReady().then(() => {
    console.log(appBin)
    let isDark = nativeTheme.shouldUseDarkColors
    tray = new Tray(appBin + `tray${isDark ? '-dark' : ''}@2x.png`)
    const contextMenu = Menu.buildFromTemplate([
        {
            label: 'Show',
            click: function () {
                mainWindow.show()
                if (process.platform === 'darwin') {
                    app.dock.show()
                }
            },
        },
        {
            label: 'Hide',
            click: function () {
                mainWindow.hide()
                if (process.platform === 'darwin') {
                    app.dock.hide()
                }
            },
        },
        {
            label: 'Quit',
            click: function () {
                app.quit()
            },
        },
    ])
    tray.setContextMenu(contextMenu)
    tray.setIgnoreDoubleClickEvents(true)
})

ipcMain.on('app', (data) => {
    mainWindow.webContents.send('getPath', userDataDir)
    mainWindow.webContents.send('version', app.getVersion())
    
    console.log('App version update timestamp',store.get('db.versionDate'));

    if (!store.get('db.update')) {
        store.set({
            db: {
                versionDate: Date.now(),
                update: true,
                version: app.getVersion()
            }
        });
    }
    
    startCheck()
    startDatabase()
    if (dev) {
        console.log('Running in development')
        mainWindow.openDevTools()
    } else {
        console.log('Running in production')

        autoUpdater.autoInstallOnAppQuit = false
        autoUpdater.autoDownload = false
        //This can be a setting if people wants beta releases in the future.
        autoUpdater.allowPrerelease = false
        autoUpdater.checkForUpdatesAndNotify()

        var AutoLaunch = require('auto-launch')
        var autoLauncher = new AutoLaunch({
            name: 'Hugin Messenger',
            isHidden: true,
        })

        // Checking if autoLaunch is enabled, if not then enabling it.
        autoLauncher
            .isEnabled()
            .then(function (isEnabled) {
                if (isEnabled) return
                autoLauncher.enable()
            })
            .catch(function (err) {
                throw err
            })
    }
})


function startDatabase() {
    loadDB(userDataDir, dbPath)

}

const sender = (channel, data) => {
    mainWindow.webContents.send(channel, data)
}

function getXKRKeypair() {
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
    return { privateSpendKey: privateSpendKey, privateViewKey: privateViewKey }
}

function getKeyPair() {
    // return new Promise((resolve) => setTimeout(resolve, ms));
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
    let secretKey = hexToUint(privateSpendKey)
    let keyPair = nacl.box.keyPair.fromSecretKey(secretKey)
    return keyPair
}

function getMsgKey() {
    const naclPubKey = getKeyPair().publicKey
    return Buffer.from(naclPubKey).toString('hex')
}

const checkNodeStatus = async (node) => {

    try {
        const req = await fetch('http://' + node.node + ':' + node.port.toString() + '/getinfo')

        const res = await req.json()

        if (res.status === 'OK') return true
    } catch (e) {
        console.log('Node error')
    }

    mainWindow.webContents.send('node-not-ok')
    return false
}

async function startCheck() {
   
    store.set({
        wallet: {
            optimized: false
        }
    });

    if (fs.existsSync(userDataDir + '/misc.db')) {
        loadHugin()
        ipcMain.on('login', async (event, data) => {
          loadAccount(data)
        })

    } else {
        //No wallet found, probably first start
        console.log('wallet not found')
        mainWindow.webContents.send('wallet-exist', false)
    }
}

async function loadHugin() {
    await db.read()
    let walletName = db.data.walletNames
    nodeUrl = db.data.node.node
    nodePort = db.data.node.port
    let node = { node: nodeUrl, port: nodePort }
    mainWindow.webContents.send('wallet-exist', true, walletName, node)
    daemon = new WB.Daemon(nodeUrl, nodePort)
}

const startWallet = async (data, node) => {
    start_js_wallet(data.thisWallet, data.myPassword, node)
}

async function loadAccount(data) {
    nodeUrl = data.node
    nodePort = data.port
    node = { node: nodeUrl, port: nodePort }
    db.data.node = node
    await db.write()
    startWallet(data, node)
}
 //Create account
async function createAccount(accountData) {
    let walletName = accountData.walletName
    let myPassword = accountData.password
    nodeUrl = accountData.node
    nodePort = accountData.port
    let node = { node: nodeUrl, port: nodePort }

    daemon = new WB.Daemon(nodeUrl, nodePort)

    if (!accountData.blockheight) {
        accountData.blockheight = 1
    }
    const [js_wallet, error] =
        accountData.mnemonic.length > 0
            ? await WB.WalletBackend.importWalletFromSeed(
                daemon,
                accountData.blockheight,
                accountData.mnemonic
            )
            : [await WB.WalletBackend.createWallet(daemon), null]

    //Create welcome PM message
    welcomeMessage()
    //Create Hugin welcome contact
    firstContact()
    //Create Boards welcome message
    welcomeBoardMessage()

    // Save js wallet to file as backup
    await saveWallet(js_wallet, walletName, myPassword)
    addBoard('Home')

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
    console.log('creating dbs...')

    start_js_wallet(walletName, myPassword, node)

}


async function logIntoWallet(walletName, password) {
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

async function openWalletFromFile(walletName, password) {
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

async function verifyPassword(password) {
    if (await checkPass(password, hashed_pass)) {
        await sleep(1000)
        mainWindow.webContents.send('login-success')
        return true
    } else {
        mainWindow.webContents.send('login-failed')
        return false
    }
}

async function login(walletName, password) {
    js_wallet = await logIntoWallet(walletName, password)
    if (js_wallet === 'Wrong password') {
        mainWindow.webContents.send('login-failed')
        return false
    }
    return true
}

async function checkNodeAndPassword(password, node) {
     //If we are already logged in
     if (hashed_pass.length) {
        verifyPassword(password)
        return false
    }

    let nodeOnline = await checkNodeStatus(node)
    if (!nodeOnline) {
        mainWindow.webContents.send('error-notify-message', 'The node seems to be slow or offline, try another one.')
    }

    return true
}

async function loadCheckedTxs() {
    
    //Load known pool txs from db.
    let checkedTxs = await loadKnownTxs()
    let arrayLength = checkedTxs.length

    if (arrayLength > 0) {
        checkedTxs = checkedTxs.slice(arrayLength - 200, arrayLength - 1).map(function (knownTX) {
            return knownTX.hash
        })

        checkedTxs
    } else {
        checkedTxs = []
    }

    return checkedTxs
}

async function start_js_wallet(walletName, password, node) {
    
    if (!await checkNodeAndPassword(password, node)) return

    if (!await login(walletName, password)) return

    hashed_pass = await hashPassword(password)
    
    pickNode(node.node + ":" + node.port.toString())
    //Load known public keys and contacts
    let [myContacts, keys] = await loadKeys((start = true))
    known_keys = keys
    mainWindow.webContents.send('contacts', myContacts)
    //Sleep 300ms
    await sleep(300)
    //Disable wallet optimization
    await js_wallet.enableAutoOptimization(false)
    //Start wallet sync process
    await js_wallet.start()

    let checkedTxs = await loadCheckedTxs()
    let my_groups = await getGroups()
    block_list = await loadBlockList()
    my_boards = await getMyBoardList()

    //Save backup wallet to file
    saveWalletToFile(js_wallet, walletName, password)

    //Get primary address and fuse it with our message key to create our hugin address
    let myAddress = await js_wallet.getPrimaryAddress()
    let msgKey = getMsgKey()
    console.log('Hugin Address', myAddress + msgKey)

    mainWindow.webContents.send('addr', myAddress + msgKey)

    sendNodeInfo()

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
                mainWindow.webContents.send('sync', 'Synced')

                // Save js wallet to file
                console.log('///////******** SAVING WALLET *****\\\\\\\\')
                await saveWallet(js_wallet, walletName, password)
            } else if (!synced) {

            }
        }
    )

    mainWindow.webContents.send('wallet-started', node, my_groups, block_list)
    console.log('Started wallet')
    await sleep(500)
    console.log('Loading Sync')
    //Load knownTxsIds to backgroundSyncMessages on startup
    backgroundSyncMessages(checkedTxs)
    while (true) {
        try {
            //Start syncing
            await sleep(1000 * 10)

            backgroundSyncMessages()

            const [walletBlockCount, localDaemonBlockCount, networkBlockCount] =
                js_wallet.getSyncStatus()
            mainWindow.webContents.send('node-sync-data', {
                walletBlockCount,
                localDaemonBlockCount,
                networkBlockCount,
            })

            if (localDaemonBlockCount - walletBlockCount < 2) {
                // Diff between wallet height and node height is 1 or 0, we are synced
                console.log('**********SYNCED**********')
                console.log('My Wallet ', walletBlockCount)
                console.log('The Network', networkBlockCount)
                mainWindow.webContents.send('sync', 'Synced')
            } else {
                //If wallet is somehow stuck at block 0 for new users due to bad node connection, reset to the last 100 blocks.
                if (walletBlockCount === 0) {
                    await js_wallet.reset(networkBlockCount - 100)
                }
                console.log('*.[~~~].SYNCING BLOCKS.[~~~].*')
                console.log('My Wallet ', walletBlockCount)
                console.log('The Network', networkBlockCount)
                mainWindow.webContents.send('sync', 'Syncing')
            }
        } catch (err) {
            console.log(err)
        }
    }
}

function incomingTx(transaction) {
    const [wallet_count, daemon_count, network_height] = js_wallet.getSyncStatus()
        let synced = network_height - wallet_count <= 2
        if (!synced) return
        optimizeMessages()
        console.log(`Incoming transaction of ${transaction.totalAmount()} received!`)
        console.log('transaction', transaction)
        mainWindow.webContents.send('new-message', transaction.toJSON())

}

function sendNodeInfo() {
    const [walletBlockCount, localDaemonBlockCount, networkBlockCount] = js_wallet.getSyncStatus()
    mainWindow.webContents.send('sync', 'Not syncing')
    mainWindow.webContents.send('node-sync-data', {
        walletBlockCount,
        localDaemonBlockCount,
        networkBlockCount,
    })

}

async function encryptWallet(wallet, pass) {
    const encrypted_wallet = await wallet.encryptWalletToString(pass)
    return encrypted_wallet
}

async function saveWallet(wallet, walletName, password) {
    let my_wallet = await encryptWallet(wallet, password)
    let wallet_json = JSON.stringify(my_wallet)

    try {
        await files.writeFile(userDataDir + '/' + walletName + '.json', wallet_json)
    } catch (err) {
        console.log('Wallet json saving error, revert to saving wallet file')
        saveWalletToFile(wallet, walletName, password)
    }
}

function saveWalletToFile(wallet, walletName, password) {
    wallet.saveWalletToFile(userDataDir + '/' + walletName + '.wallet', password)
}

async function openWallet(walletName, password) {
    let json_wallet

    try {
        json_wallet = await files.readFile(userDataDir + '/' + walletName + '.json')
        return json_wallet
    } catch (err) {
        console.log('Json wallet error, try backup wallet file', err)
    }
}

//Checks the message for a view tag
async function checkForViewTag(extra) {
    try {
    const rawExtra = trimExtra(extra)
    const parsed_box = JSON.parse(rawExtra)
        if (parsed_box.vt) {
            const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
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

//Try decrypt extra data
async function checkForPrivateMessage(thisExtra) {
    let message = await extraDataToMessage(thisExtra, known_keys, getXKRKeypair())
    if (!message) return false
    if (message.type === 'sealedbox' || 'box') {
        message.sent = false
        saveMessage(message)
        return true
    }
}
//Checks if hugin message is from a group
async function checkForGroupMessage(thisExtra, thisHash) {
    try {
    let group = trimExtra(thisExtra)
    let message = JSON.parse(group)
    if (message.sb) {
            await decryptGroupMessage(message, thisHash)
            return true
    }
    } catch {
        
    }
    return false
}

//Validate extradata, here we can add more conditions
function validateExtra(thisExtra, thisHash) {
    //Extra too long
    if (thisExtra.length > 7000) {
        known_pool_txs.push(thisHash)
        saveHash(thisHash)
        return false;
    }
    //Check if known tx
    if (known_pool_txs.indexOf(thisHash) === -1) {
        known_pool_txs.push(thisHash)
        return true
    } else {
        //Tx already known
        return false
    }
}

//Set known pool txs on start
function setKnownPoolTxs(checkedTxs) {
    //Here we can adjust number of known we send to the node
    known_pool_txs = checkedTxs
    //Can't send undefined to node, it wont respond
    let known = known_pool_txs.filter(a => a !== undefined)
    return known
}

async function backgroundSyncMessages(checkedTxs = false) {
    console.log('Background syncing...')
    
    //First start, set known pool txs
    if (checkedTxs) {
        known_pool_txs = await setKnownPoolTxs(checkedTxs)
    }
    
    let transactions = await fetchHuginMessages()
    if (!transactions) return
    decryptHuginMessages(transactions)
}

async function fetchHuginMessages() {
    try {
        const resp = await fetch(
            'http://' + nodeUrl + ':' + nodePort.toString() + '/get_pool_changes_lite',
            {
                method: 'POST',
                body: JSON.stringify({ knownTxsIds: known_pool_txs }),
            }
        )

        let json = await resp.json()
        json = JSON.stringify(json)
            .replaceAll('.txPrefix', '')
            .replaceAll('transactionPrefixInfo.txHash', 'transactionPrefixInfotxHash')

        json = JSON.parse(json)

        let transactions = json.addedTxs
        //Try clearing known pool txs from checked
        known_pool_txs = known_pool_txs.filter((n) => !json.deletedTxsIds.includes(n))
        if (transactions.length === 0) {
            console.log('Empty array...')
            console.log('No incoming messages...')
            return false
        }
        
        return transactions

    } catch (e) {
        mainWindow.webContents.send('sync', 'Error')
        return false
    }
}

async function decryptHuginMessages(transactions) {

    for (let transaction in transactions) {
        try {
            let thisExtra = transactions[transaction].transactionPrefixInfo.extra
            let thisHash = transactions[transaction].transactionPrefixInfotxHash
            if (!validateExtra(thisExtra, thisHash)) continue
            if (thisExtra !== undefined && thisExtra.length > 200) {
                saveHash(thisHash)
                //Check for viewtag
                let checkTag = await checkForViewTag(thisExtra)
                if (checkTag) {
                    await checkForPrivateMessage(thisExtra, thisHash)
                    continue
                }
                //Check for private message //TODO remove this when viewtags are active
                if (await checkForPrivateMessage(thisExtra, thisHash)) continue
                //Check for group message
                if (await checkForGroupMessage(thisExtra, thisHash)) continue
            }
        } catch (err) {
            console.log(err)
        }
    }
}

//Saves contact and nickname to db.
async function saveContact(hugin_address, nickname = false, first = false) {

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

    mainWindow.webContents.send('saved-addr', hugin_address)

    saveThisContact(addr, key, name)

    if (first) {
        saveMessage({
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

async function hashPassword(pass) {
    return await crypto.cn_fast_hash(toHex(pass))
}

async function checkPass(pass, oldHash) {
    let passHash = await hashPassword(pass)
    if (oldHash === passHash) return true
    return false
}

//Saves board message.
async function saveBoardMsg(msg, hash, follow = false) {
    return
    saveBoardMessage(msg, hash)
    saveHash(hash)
    if (msg.sent || !follow) return
    //Send new board message to frontend.
    mainWindow.webContents.send('boardMsg', message)
    mainWindow.webContents.send('newBoardMessage', message)
}

async function saveGroupMessage(msg, hash, time, offchain) {
    let message = await saveGroupMsg(msg, hash, time, offchain)
    if (!offchain) {
        //Send new board message to frontend.
        mainWindow.webContents.send('groupMsg', message)
        mainWindow.webContents.send('newGroupMessage', message)
    } else if (offchain) {
        if (message.message === 'ᛊNVITᛊ') return
        mainWindow.webContents.send('groupRtcMsg', message)
    }
}


//Saves private message
async function saveMessage(msg, offchain = false) {
    let sent = msg.sent
    let addr = sanitizeHtml(msg.from)
    let timestamp = sanitizeHtml(msg.t)
    let key = sanitizeHtml(msg.k)

    if (await messageExists(timestamp)) return
    //Checking if private msg is a call
    let text = await parseCall(msg.msg, addr, sent, offchain)
    let message = sanitizeHtml(text)

    //If sent set chat to chat instead of from
    if (msg.chat && sent) {
        addr = msg.chat
    }

    //New message from unknown contact
    if (msg.type === 'sealedbox' && !sent) {
        let hugin = addr + key
        await saveContact(hugin)
    }

    let newMsg = await saveMsg(message, addr, sent, timestamp, offchain)

    if (sent) {
        //If sent, update conversation list
        mainWindow.webContents.send('sent', newMsg)
        return
    }
    //Send message to front end
    mainWindow.webContents.send('newMsg', newMsg)
    mainWindow.webContents.send('privateMsg', newMsg)
}

async function encryptMessage(message, messageKey, sealed = false, toAddr) {
    let timestamp = Date.now()
    let my_address = await js_wallet.getPrimaryAddress()
    const addr = await Address.fromAddress(toAddr)
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
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
            k: Buffer.from(getKeyPair().publicKey).toString('hex'),
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
            getKeyPair().secretKey
        )
    }
    //Box object
    let payload_box = { box: Buffer.from(box).toString('hex'), t: timestamp, txKey: keys.public_key, vt: viewTag  }
    // Convert json to hex
    let payload_hex = toHex(JSON.stringify(payload_box))

    return payload_hex
}

async function sendGroupsMessage(message, offchain = false) {
    const my_address = message.k
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
    const signature = await xkrUtils.signMessage(message.m, privateSpendKey)
    const timestamp = parseInt(Date.now())
    const nonce = nonceFromTimestamp(timestamp)

    let group
    let reply = ''

    group = message.g

    if (group.length !== 64) {
        return
    }

    let message_json = {
        m: message.m,
        k: my_address,
        s: signature,
        g: group,
        n: message.n,
        r: reply,
    }

    if (message.r) {
        message_json.r = message.r
    }

    let [mainWallet, subWallet] = js_wallet.subWallets.getAddresses()
    const payload_unencrypted = naclUtil.decodeUTF8(JSON.stringify(message_json))
    const secretbox = nacl.secretbox(payload_unencrypted, nonce, hexToUint(group))

    const payload_encrypted = {
        sb: Buffer.from(secretbox).toString('hex'),
        t: timestamp,
    }

    const payload_encrypted_hex = toHex(JSON.stringify(payload_encrypted))

    if (!offchain) {
        let result = await js_wallet.sendTransactionAdvanced(
            [[subWallet, 1000]], // destinations,
            3, // mixin
            { fixedFee: 1000, isFixedFee: true }, // fee
            undefined, //paymentID
            [subWallet], // subWalletsToTakeFrom
            undefined, // changeAddress
            true, // relayToNetwork
            false, // sneedAll
            Buffer.from(payload_encrypted_hex, 'hex')
        )

        if (result.success) {
            message_json.sent = true
            saveGroupMessage(message_json, result.transactionHash, timestamp)
            mainWindow.webContents.send('sent_group', {
                hash: result.transactionHash,
                time: message.t,
            })
            known_pool_txs.push(result.transactionHash)
            saveHash(result.transactionHash)
            optimizeMessages()
        } else {
            mainWindow.webContents.send('optimized', false)
            let error = {
                message: 'Failed to send',
                name: 'Error',
                hash: Date.now(),
            }
            mainWindow.webContents.send('error_msg', error)
            console.log(`Failed to send transaction: ${result.error.toString()}`)
            optimizeMessages()
        }
    } else if (offchain) {
        //Generate a random hash
        let randomKey = await createGroup()
        let sentMsg = Buffer.from(payload_encrypted_hex, 'hex')
        let sendMsg = randomKey + '99' + sentMsg
        let messageArray = [sendMsg]
        mainWindow.webContents.send('rtc_message', messageArray, true)
        mainWindow.webContents.send('sent_rtc_group', {
            hash: randomKey,
            time: message.t,
        })
    }
}

async function decryptRtcMessage(message) {
    let hash = message.substring(0, 64)
    let newMsg = await extraDataToMessage(message, known_keys, getXKRKeypair())

    if (newMsg) {
        newMsg.sent = false
    }
    
    let group = newMsg.msg.msg

    if (group && 'key' in group) {
            if (group.key === undefined) return 
            let invite_key = sanitizeHtml(group.key)
            if (invite_key.length !== 64) return

            mainWindow.webContents.send('group-call', {invite_key, group})

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
                    mainWindow.webContents.send('error-notify-message', 'Error reading invite address')
                }
                console.log('Invited to call, joining...')
                mainWindow.webContents.send('start-call', contact, video, invite)
                sleep(1500)
            })

            return

        } else {
            console.log('Not an invite')
        }

    if (!newMsg) return

    saveMessage(newMsg, true)
}

async function decryptGroupRtcMessage(message, key) {
    try {
        let hash = message.substring(0, 64)
        let [groupMessage, time, txHash] = await decryptGroupMessage(message, hash, key)

        if (!groupMessage) {
            return
        }
        if (groupMessage.m === 'ᛊNVITᛊ') {
            if (groupMessage.r.length === 163) {
                let invited = sanitizeHtml(groupMessage.r)
                mainWindow.webContents.send('group_invited_contact', invited)
                console.log('Invited')
            }
        }
    } catch (e) {
        console.log('Not an invite')
    }
}

async function decryptGroupMessage(tx, hash, group_key = false) {

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
            console.log(err)
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

    payload_json.sent = false

    saveGroupMessage(payload_json, hash, tx.t, offchain)

    return [payload_json, tx.t, hash]

    } catch {
        return false
    }
}

// async function sendBoardMessage(message) {
//     console.log('sending board', message)
//     let reply = message.r
//     let to_board = message.brd
//     let my_address = message.k
//     let nickname = message.n
//     let msg = message.m
//     try {
//         let timestamp = parseInt(Date.now() / 1000)
//         let [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
//         let xkr_private_key = privateSpendKey
//         let signature = await xkrUtils.signMessage(msg, xkr_private_key)

//         let payload_json = {
//             m: msg,
//             k: my_address,
//             s: signature,
//             brd: to_board,
//             t: timestamp,
//             n: nickname,
//         }

//         if (reply) {
//             payload_json.r = reply
//         }

//         payload_hex = toHex(JSON.stringify(payload_json))

//         let [mainWallet, subWallet] = js_wallet.subWallets.getAddresses()

//         let result = await js_wallet.sendTransactionAdvanced(
//             [[subWallet, 1000]], // destinations,
//             3, // mixin
//             { fixedFee: 1000, isFixedFee: true }, // fee
//             undefined, //paymentID
//             [subWallet], // subWalletsToTakeFrom
//             undefined, // changeAddress
//             true, // relayToNetwork
//             false, // sneedAll
//             Buffer.from(payload_hex, 'hex')
//         )

//         if (result.success) {
//             console.log(
//                 `Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(
//                     result.fee
//                 )}`
//             )
//             mainWindow.webContents.send('sent_board', {
//                 hash: result.transactionHash,
//                 time: message.t,
//             })
//             known_pool_txs.push(result.transactionHash)
//             const sentMsg = payload_json
//             sentMsg.sent = true
//             sentMsg.type = 'board'
//             saveBoardMsg(sentMsg, result.transactionHash)
//         } else {
//             let error = {
//                 message: 'Failed to send',
//                 name: 'Error',
//                 hash: Date.now(),
//             }
//             mainWindow.webContents.send('error_msg', error)
//             console.log(`Failed to send transaction: ${result.error.toString()}`)
//         }
//     } catch (err) {
//         mainWindow.webContents.send('error_msg')
//         console.log('Error', err)
//     }

//     optimizeMessages()
// }

async function checkHistory(messageKey) {
    //Check history
    if (known_keys.indexOf(messageKey) > -1) {  
        let [conv] = await getConversation()
        if (parseInt(conv.timestamp) < parseInt(store.get("db.versionDate"))) return false
        return true
    } else {
        known_keys.push(messageKey)
        return false
    }


}

async function sendMessage(message, receiver, off_chain = false, group = false, beam_this = false) {
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
    let has_history = await checkHistory(messageKey)

    try {
        let [munlockedBalance, mlockedBalance] = await js_wallet.getBalance()

        if (munlockedBalance < 11 && mlockedBalance > 0 && !beam_this) {
            return
        }
    } catch (err) {
        return
    }

    let timestamp = Date.now()
    let payload_hex

    if (!has_history) {
        payload_hex = await encryptMessage(message, messageKey, true, address)
    } else {
        payload_hex = await encryptMessage(message, messageKey, false, address)
    }

    //Choose subwallet with message inputs
    let messageWallet = js_wallet.subWallets.getAddresses()[1]

    if (!off_chain) {
        let result = await js_wallet.sendTransactionAdvanced(
            [[messageWallet, 1000]], // destinations,
            3, // mixin
            { fixedFee: 1000, isFixedFee: true }, // fee
            undefined, //paymentID
            [messageWallet], // subWalletsToTakeFrom
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
            console.log(
                `Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(
                    result.fee
                )}`
            )
            saveMessage(sentMsg)
            optimizeMessages()
        } else {
            mainWindow.webContents.send('optimized', false)
            let error = {
                message: `Failed to send`,
                name: 'Error',
                hash: Date.now(),
            }

            optimizeMessages()
            console.log(`Failed to send transaction: ${result.error.toString()}`)
            mainWindow.webContents.send('error_msg', error)
        }
    } else if (off_chain) {
        //Offchain messages
        let randomKey = await createGroup()
        let sentMsg = Buffer.from(payload_hex, 'hex')
        let sendMsg = randomKey + '99' + sentMsg
        let messageArray = []
        messageArray.push(sendMsg)
        messageArray.push(address)
        if (group) {
            messageArray.push('group')
        }
        if (beam_this) {
            sendBeamMessage(sendMsg, address)
        } else {
            mainWindow.webContents.send('rtc_message', messageArray)
        }
        //Do not save invite message.
        if (message.msg && 'invite' in message.msg) {
            return
        } 
        else {
            let saveThisMessage = {
                msg: message,
                k: messageKey,
                sent: true,
                t: timestamp,
                chat: address,
            }
            saveMessage(saveThisMessage, true)
        }
    }
}

async function optimizeMessages(force = false) {
    if (js_wallet.subWallets.getAddresses().length === 1) {
        const [address, error] = await js_wallet.addSubWallet()
        if (error) {
           return 
        }
    }

    let [mainWallet, subWallet] = js_wallet.subWallets.getAddresses()
    const [walletHeight, localHeight, networkHeight] = await js_wallet.getSyncStatus()

    let inputs = await js_wallet.subWallets.getSpendableTransactionInputs(
        [subWallet],
        networkHeight
    )

    console.log('inputs', inputs.length)
    if (inputs.length > 25 && !force) {
        mainWindow.webContents.send('optimized', true)
        return
    }

    if (store.get('wallet.optimized')) {
        return
    }

    let subWallets = js_wallet.subWallets.subWallets
    let txs
    subWallets.forEach((value, name) => {
        txs = value.unconfirmedIncomingAmounts.length
    })

    let payments = []
    let i = 0
    /* User payment */
    while (i <= 49) {
        payments.push([subWallet, 1000])
        i += 1
    }

    let result = await js_wallet.sendTransactionAdvanced(
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
        mainWindow.webContents.send('optimized', true)

        store.set({
            wallet: {
                optimized: true
            }
        });

        resetOptimizeTimer()

        let sent = {
            message: 'Your wallet is creating message inputs, please wait',
            name: 'Optimizing',
            hash: parseInt(Date.now()),
            key: mainWallet,
            optimized: true
        }

        mainWindow.webContents.send('sent_tx', sent)
        console.log('optimize completed')
        return true
    } else {

        store.set({
            wallet: {
                optimized: false
            }
        });

        mainWindow.webContents.send('optimized', false)
        let error = {
            message: 'Optimize failed',
            name: 'Optimizing wallet failed',
            hash: parseInt(Date.now()),
            key: mainWallet,
        }
        mainWindow.webContents.send('error_msg', error)
        return false
    }

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
        mainWindow.webContents.send('sent_tx', sent)
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
        mainWindow.webContents.send('error_msg', error)
    }
}

async function resetOptimizeTimer() {
    await sleep(600 * 1000)
    store.set({
        wallet: {
            optimized: false
        }
    });
}

function parseCall(msg, sender, sent, group = false) {
    switch (msg.substring(0, 1)) {
        case 'Δ':
        // Fall through
        case 'Λ':
            // Call offer
                if (!sent) {
                    console.log('call  incoming')
                    mainWindow.webContents.send('call-incoming', msg, sender, group)
                    // Handle answer/decline here
                }
                console.log('call incoming')
            return `${msg.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`
            break
        case 'δ':
        // Fall through
        case 'λ':
            // Answer
            if (sent) return 'Call answered'
                let callback = JSON.stringify(expand_sdp_answer(msg))
                let callerdata = {
                    data: callback,
                    chat: sender,
                }
                mainWindow.webContents.send('got-callback', callerdata)

            return 'Call answered'

            break
        default:
            return msg
    }
}

async function pickNode(node) {
    console.log(`Switching node to ${node}`)
    nodeUrl = node.split(':')[0]
    nodePort = parseInt(node.split(':')[1])
    node = { node: nodeUrl, port: nodePort }
    if (!checkNodeStatus(node)) return
    const daemon = new WB.Daemon(nodeUrl, nodePort)
    await js_wallet.swapNode(daemon)
    mainWindow.webContents.send('switch-node', node)
    db.data.node = node
    await db.write()
}

async function shareScreen(start) {

const { desktopCapturer } = require('electron')
    desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async (sources) => {
        for (const source of sources) {
            if (source.name === 'Entire Screen') {
            }
            if (!start) {
                mainWindow.webContents.send('screen-share', source.id)
            }
            return source.id
        }
        console.log('sources', sources)
    })
}

//Check if it is an image or video with allowed type
async function checkImageOrVideoType(path) {
    if (path === undefined) return false
    const types = ['.png','.jpg','.gif', '.jpeg', '.mp4', '.webm', '.avi', '.webp', '.mov','.wmv', '.mkv', '.mpeg'];
    for (a in types) {
        if (path.endsWith(types[a])) {
            return true
        }
    }
    return false
}

async function load_file(path) {
    let imgArray = []
    if (checkImageOrVideoType(path)) {
        //Read the file as an image
        try {
        return new Promise((resolve, reject) => {
            const stream = createReadStream(path)
                stream.on('data', (data) => { 
                    imgArray.push(data)
                })

                stream.on('error', (data) => {
                    return "File not found"
                })

                stream.on('end', () => {
                    resolve(Buffer.concat(imgArray))
                })
        })

        } catch (err) {
            return "File not found"
        }
    } else {
        return "File"
    }    
}

function get_sdp(data) 
{
    if (data.type == 'offer') 
    {
        let parsed_data = `${data.video ? 'Δ' : 'Λ'}` + parse_sdp(data.data, false)
        let recovered_data = expand_sdp_offer(parsed_data)
        sendMessage(parsed_data, data.contact, data.offchain, data.group)
    } 
    else if (data.type == 'answer') 
    {
        let parsed_data = `${data.video ? 'δ' : 'λ'}` + parse_sdp(data.data, true)
        console.log('parsed data really cool sheet:', parsed_data)
        let recovered_data = expand_sdp_answer(parsed_data)
        //Send expanded recovered data to front end for debugging etc, this can be removed
        mainWindow.webContents.send('rec-off', recovered_data)
        sendMessage(parsed_data, data.contact, data.offchain, data.group)
    }
}
//BEAM

ipcMain.on("beam", async (e, link, chat, send = false, offchain = false) => {
    let beamMessage = await newBeam(link, chat, getXKRKeypair(), sender, send);
    if (beamMessage === "Error") return
    if (!beamMessage) return
    sendMessage(beamMessage.msg, beamMessage.chat, offchain)
});


ipcMain.on("end-beam", async (e, chat) => {
    console.log("end beam");
    endBeam(chat);
});

//FILES

ipcMain.on('download', async (e, file, from) => {
    requestDownload(downloadDir, file, from)
})

ipcMain.on('upload', async (e, filename, path, address, fileSize, time) => {
    addLocalFile(filename, path, address, fileSize, time)
})

ipcMain.on('remove-local-file', async (e, filename, address, time) => {
    removeLocalFile(filename, address, time)
})


ipcMain.handle('load-file', async (e, path) => {
    return await load_file(path)
})

//TOAST NOTIFY
ipcMain.on('error-notify-message-main', async (e, error) => {
    mainWindow.webContents.send('error-notify-message', error)
})

ipcMain.on('success-notify-message-main', async (e, notify, channel = false) => {
    //Optional channel, maybe useful?
    if (!channel) {
        mainWindow.webContents.send('success-notify-message', notify)
        return
    }
    mainWindow.webContents.send(channel, notify)
})


//GROUPS

ipcMain.on('sendGroupsMessage', (e, msg, offchain) => {
    sendGroupsMessage(msg, offchain)
})

ipcMain.handle('getGroups', async (e) => {
    let groups = await getGroups()
    return groups.reverse()
})

ipcMain.handle('printGroup', async (e, grp) => {
    return await printGroup(grp)
})

ipcMain.handle('getGroupReply', async (e, data) => {
    return await getGroupReply(data)
})


ipcMain.handle('createGroup', async () => {
    return await createGroup()
})

ipcMain.on('unblock', async (e, address) => {
    await unBlockContact(address)
    block_list = await loadBlockList()
    mainWindow.webContents.send('update-blocklist', block_list)
})

ipcMain.on('block', async (e, contact, name) => {
    await blockContact(contact, name)
    block_list = await loadBlockList()
    mainWindow.webContents.send('update-blocklist', block_list)
})


ipcMain.on('addGroup', async (e, grp) => {
    addGroup(grp)
    saveGroupMessage(grp, parseInt(Date.now() / 1000), parseInt(Date.now()))
})

ipcMain.on('removeGroup', async (e, grp) => {
    removeGroup(grp)
})


//BOARDS

ipcMain.on('sendBoardMsg', (e, msg) => {
    sendBoardMessage(msg)
})

//Listens for ipc call from RightMenu board picker and prints any board chosen
ipcMain.handle('printBoard', async (e, board) => {
    return await printBoard(board)
})

ipcMain.handle('getAllBoards', async () => {
    return await getBoardMsgs()
})

ipcMain.handle('getMyBoards', async () => {
    return await getMyBoardList()
})
//Adds board to my_boards array so backgroundsync is up to date wich boards we are following.
ipcMain.on('addBoard', async (e, board) => {
    my_boards.push(board)
    addBoard(board)
})

ipcMain.on('removeBoard', async (e, board) => {
    my_boards.pop(board)
    removeBoard(board)
})

ipcMain.handle('getReply', async (e, data) => {
    return await getReply(data)
})


//PRIVATE MESSAGES

ipcMain.handle('getConversations', async (e) => {
    let contacts = await getConversations()
    return contacts.reverse()
})

ipcMain.handle('getMessages', async (data) => {
    return await getMessages()
})

ipcMain.on('sendMsg', (e, msg, receiver, off_chain, grp, beam) => {
    sendMessage(msg, receiver, off_chain, grp, beam)
    console.log(msg, receiver, off_chain, grp, beam)
})

//Listens for event from frontend and saves contact and nickname.
ipcMain.on('addChat', async (e, hugin_address, nickname, first = false) => {
    saveContact(hugin_address, nickname, first)
})


ipcMain.on('removeContact', (e, contact) => {
    removeContact(contact)
    removeMessages(contact)
    mainWindow.webContents.send('sent')
})


//NODE

ipcMain.handle('getHeight', async () => {
    let [walletHeight, daemonCount, networkHeight] = await js_wallet.getSyncStatus()
    return { walletHeight, networkHeight }
})

ipcMain.on('switchNode', (e, node) => {
    pickNode(node) 
})


//CALLS

ipcMain.on('answerCall', (e, msg, contact, key, offchain = false) => {
    console.log('Answer call', msg, contact, key, offchain)
    mainWindow.webContents.send('answer-call', msg, contact, key, offchain)
})

ipcMain.on('endCall', async (e, peer, stream, contact) => {
    mainWindow.webContents.send('endCall', peer, stream, contact)
})

ipcMain.on('start_group_call', async (e, contacts) => { })

ipcMain.on('create-room', async (e, type) => {
    mainWindow.webContents.send('start-room', type)
})

//CALL USER MEDIA

ipcMain.on('startCall', async (e, contact, calltype) => {
    if (process.platform === 'darwin') {
        const cameraAccess = systemPreferences.askForMediaAccess('camera')
        const microphoneAccess = systemPreferences.askForMediaAccess('microphone')
    }
    console.log('CALL STARTED')

    console.log('contact', contact + calltype)
    mainWindow.webContents.send('start-call', contact, calltype)
})

ipcMain.handle('shareScreen', async (e, start) => {
    shareScreen(start)
})

ipcMain.on('setCamera', async (e, contact, calltype) => {
    mainWindow.webContents.send('set-camera')
})

ipcMain.on('change-src', async (e, src) => {
    console.log('ipc main on')
    mainWindow.webContents.send('change-source', src)
})

ipcMain.on('change-audio-src', async (e, id) => {
    mainWindow.webContents.send('set-audio-input', id)
})

ipcMain.on('check-srcs', async (e, src) => {
    mainWindow.webContents.send('check-src', src)
})


//WALLET

//Rescan wallet
ipcMain.on('rescan', async (e, height) => {
    js_wallet.rescan(parseInt(height))
})

//Optimize messages
ipcMain.on('optimize', async (e) => {
    optimizeMessages(force = true)
})

ipcMain.on('sendTx', (e, tx) => {
    sendTx(tx)
})

ipcMain.handle('getPrivateKeys', async () => {
    const [spendKey, viewKey] = await js_wallet.getPrimaryAddressPrivateKeys()
    return [spendKey, viewKey]
})

ipcMain.handle('getMnemonic', async () => {
    return await js_wallet.getMnemonicSeed()
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


ipcMain.handle('getBalance', async () => {
    return await js_wallet.getBalance()
})

ipcMain.handle('getAddress', async () => {
    return js_wallet.getAddresses()
})


//WEBRTC MESSAGES

ipcMain.on('decrypt_message', async (e, message) => {
    decryptRtcMessage(message)
})

ipcMain.on('decrypt_rtc_group_message', async (e, message, key) => {
    decryptGroupRtcMessage(message, key)
})


//MISC

ipcMain.on('create-account', async (e, accountData) => {
    createAccount(accountData)
})

ipcMain.on('openLink', (e, url) => {
    const {shell} = require('electron')
    console.log('url', url)
    shell.openExternal(url)
})

ipcMain.on('expand-sdp', (e, data, address) => {
    let recovered_data = expand_sdp_offer(data, true)
    let expanded_data = []
    expanded_data.push(recovered_data)
    expanded_data.push(address)
    mainWindow.webContents.send('got-expanded', expanded_data)
})

ipcMain.on('get-sdp', (e, data) => {
    get_sdp(data)
})


//UPDATES

ipcMain.on('check-new-release', () => {
    console.log('checking if new release')
    autoUpdater.checkForUpdates()
})

autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('updater', 'checking')
})

autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('updater', 'available')
})

autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('updater', 'not-available')
})

autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('update-progress', progress)
})

autoUpdater.on('error', (err) => {
    mainWindow.webContents.send('updater', err)
})

autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('updater', 'downloaded')
})

ipcMain.on('download-update', (e) => {
    autoUpdater.downloadUpdate()
})

ipcMain.on('install-update', async (e, data) => {
    autoUpdater.quitAndInstall()
})



