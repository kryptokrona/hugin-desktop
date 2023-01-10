const windowStateManager = require('electron-window-state')
const contextMenu = require('electron-context-menu')
const {
    app,
    BrowserWindow,
    ipcMain,
    ipcRenderer,
    Tray,
    Menu,
    nativeTheme,
    systemPreferences,
} = require('electron')
const serve = require('electron-serve')
const path = require('path')
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
const Peer = require('simple-peer')
const WebTorrent = require('webtorrent')
const { desktopCapturer, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const notifier = require('node-notifier')
const { expand_sdp_answer, expand_sdp_offer, parse_sdp } = require("./sdp.cjs")
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
    AddressPrefix,
    Block,
    BlockTemplate,
    Crypto,
    CryptoNote,
    LevinPacket,
    Transaction,
} = require('kryptokrona-utils')

const { newBeam, endBeam, sendBeamMessage, downloadFile, sendFile, addLocalFile, requestDownload } = require("./beam.cjs")

const Store = require('electron-store');
const appRoot = require('app-root-dir').get().replace('app.asar', '')
const appBin = appRoot + '/bin/'

const crypto = new Crypto()
const xkrUtils = new CryptoNote()
const hexToUint = (hexString) =>
    new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

function getXKRKeypair() {
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
    return { privateSpendKey: privateSpendKey, privateViewKey: privateViewKey }
}

function getKeyPair() {
    // return new Promise((resolve) => setTimeout(resolve, ms));
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
    let secretKey = naclUtil.decodeUTF8(privateSpendKey.substring(1, 33))
    let keyPair = nacl.box.keyPair.fromSecretKey(secretKey)
    return keyPair
}

function getMsgKey() {
    const naclPubKey = getKeyPair().publicKey
    return Buffer.from(naclPubKey).toString('hex')
}

async function createGroup() {
    return await Buffer.from(nacl.randomBytes(32)).toString('hex')
}

function toHex(str, hex) {
    try {
        hex = unescape(encodeURIComponent(str))
            .split('')
            .map(function (v) {
                return v.charCodeAt(0).toString(16)
            })
            .join('')
    } catch (e) {
        hex = str
        //console.log('invalid text input: ' + str)
    }
    return hex
}

function nonceFromTimestamp(tmstmp) {
    let nonce = hexToUint(String(tmstmp))

    while (nonce.length < nacl.box.nonceLength) {
        let tmp_nonce = Array.from(nonce)

        tmp_nonce.push(0)

        nonce = Uint8Array.from(tmp_nonce)
    }

    return nonce
}

function fromHex(hex, str) {
    try {
        str = decodeURIComponent(hex.replace(/(..)/g, '%$1'))
    } catch (e) {
        str = hex
        // console.log('invalid hex input: ' + hex)
    }
    return str
}

function trimExtra(extra) {
    try {
        let payload = fromHex(extra.substring(66))
        let payload_json = JSON.parse(payload)
        return fromHex(extra.substring(66))
    } catch (e) {
        return fromHex(Buffer.from(extra.substring(78)).toString())
    }
}

try {
    require('electron-reloader')(module)
} catch (e) {
    console.error(e)
}

const serveURL = serve({ directory: '.' })
const port = process.env.PORT || 5173
const dev = !app.isPackaged
let mainWindow

function createWindow() {
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
    // prepend: (defaultActions, params, browserWindow) => [
    //   {
    //     label: "Make App 💻"
    //   }
    // ]
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



async function download(link) {
    let client = new WebTorrent()

    let thisLink = link
    console.log('download', thisLink)
    client.add(thisLink, { path: downloadDir }, function (torrent) {
        console.log('Download started', torrent)
        // Got torrent metadata!
        torrent.on('download', function (bytes) {
            console.log('just downloaded: ' + bytes)
            console.log('total downloaded: ' + torrent.downloaded)
            console.log('download speed: ' + torrent.downloadSpeed)
            console.log('progress: ' + torrent.progress)
        })

        console.log('log log')
        torrent.on('done', function (bytes) {
            console.log('torrent finished downloading')

            torrent.files.forEach(function (file) {
                console.log('file', file)
                setTimeout(function () {
                    client.destroy()
                }, 60000)
            })
        })
    })

    console.log('log log')
}

function upload(filename, path, address) {
    let client = new WebTorrent({ maxConns: 1 })
    console.log('uploading', filename)
    console.log('from ', path)
    client.seed(path, function (torrent) {
        console.log('upload this', torrent)
        console.log('Client is seeding ' + torrent.magnetURI)
        torrent.files.forEach(function (file) {
            console.log('file', file)
        })
        sendMessage(torrent.magnetURI.split('&tr')[0], address)
    })
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

const userDataDir = app.getPath('userData')
const appPath = app.getAppPath()
const downloadDir = app.getPath('downloads')
const dbPath = userDataDir + '/SQLmessages.db'

function startDatabase() {
    loadDB(userDataDir, dbPath)

}

let daemon
let nodeUrl
let nodePort
//node will contain {node: nodeUrl, port: nodePort}
let node

//Create misc.db
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)

let js_wallet
let walletName
let known_keys = []
let known_pool_txs = []
let myPassword
let my_boards = []
let block_list = []
let hashed_pass = ""

ipcMain.on('app', (data) => {
    mainWindow.webContents.send('getPath', userDataDir)
    mainWindow.webContents.send('version', app.getVersion())
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

const sender = (channel, data) => {
    mainWindow.webContents.send(channel, data)
}

const checkNodeStatus = async (node) => {

    try {
        const req = await fetch('http://' + node.node + ':' + node.port.toString() + '/getinfo')
        if (!req.ok) return false

        const res = await req.json()

        if (res.status === 'OK') return true
    } catch (e) {
        console.log(e)
    }
}

const store = new Store();

async function startCheck() {

    store.set({
        wallet: {
            optimized: false
        }
    });

    if (fs.existsSync(userDataDir + '/misc.db')) {
        await db.read()
        let walletName = db.data.walletNames
        console.log('walletname', walletName)
        nodeUrl = db.data.node.node
        nodePort = db.data.node.port
        let node = { node: nodeUrl, port: nodePort }
        node = { node: "privacymine.net", port: 11898}
        console.log('START NODE', node)
        mainWindow.webContents.send('wallet-exist', true, walletName, node)
        daemon = new WB.Daemon(nodeUrl, nodePort)

        ipcMain.on('login', async (event, data) => {
            console.log('LOG IN USING ', data)
            nodeUrl = data.node
            nodePort = data.port
            node = { node: nodeUrl, port: nodePort }
            db.data.node.node = nodeUrl
            db.data.node.port = nodePort
            db.data.node = node
            await db.write()
            startWallet(data, node)
        })
    } else {
        //No wallet found, probably first start
        console.log('wallet not found')
        mainWindow.webContents.send('wallet-exist', false)
    }
}

const startWallet = async (data, node) => {
    let walletName = data.thisWallet
    let password = data.myPassword

    console.log('Starting this wallet', walletName)
    console.log('password', password)
    start_js_wallet(walletName, password, node)
}

const welcomeAddress =
    'SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1'


ipcMain.on('create-account', async (e, accountData) => {
    //Create welcome message
    console.log('accdata', accountData)
    let walletName = accountData.walletName
    let myPassword = accountData.password
    nodeUrl = accountData.node
    nodePort = accountData.port
    let node = { node: nodeUrl, port: nodePort }

    welcomeMessage()
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
})


async function logIntoWallet(walletName, password) {
    let parsed_wallet
    let json_wallet = await openWallet(walletName, password)
    console.log('Opened, want to log in, json_wallet')
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
    let check = await checkPass(password, hashed_pass)
    if (check) {
        await sleep(1000)
        mainWindow.webContents.send('login-success')
        return true
    } else {
        mainWindow.webContents.send('login-failed')
        return false
    }
}

async function start_js_wallet(walletName, password, node) {
    let nodeOnline = await checkNodeStatus(node)
    if (!nodeOnline) {
        mainWindow.webContents.send('node-not-ok')
        return
    }

    if (hashed_pass.length) {
        console.log('wallet started already')
        await verifyPassword(password)
        return
    }

    js_wallet = await logIntoWallet(walletName, password)

    if (js_wallet === 'Wrong password') {
        mainWindow.webContents.send('login-failed')
        return
    }

    hashed_pass = await hashPassword(password)

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

    //Load known pool txs from db.
    let checkedTxs
    let knownTxsIds = await loadKnownTxs()
    let my_groups = await getGroups()
    block_list = await loadBlockList()
    //Save backup wallet to file
    await saveWalletToFile(js_wallet, walletName, password)

    if (knownTxsIds.length > 0) {
        checkedTxs = knownTxsIds.map(function (knownTX) {
            return knownTX.hash
        })
    } else {
        checkedTxs = []
    }

    my_boards = await getMyBoardList()

    sendNodeInfo()

    //Incoming transaction event
    js_wallet.on('incomingtx', (transaction) => {
        const [wallet_count, daemon_count, network_height] = js_wallet.getSyncStatus()
        let synced = network_height - wallet_count <= 2
        if (!synced) return
        optimizeMessages()
        console.log(`Incoming transaction of ${transaction.totalAmount()} received!`)

        console.log('transaction', transaction)
        mainWindow.webContents.send('new-message', transaction.toJSON())
    })
    //Get primary address and fuse it with our message key to create our hugin address
    let myAddress = await js_wallet.getPrimaryAddress()
    let msgKey = getMsgKey()
    console.log('Hugin Address', myAddress + msgKey)

    mainWindow.webContents.send('addr', myAddress + msgKey)

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
    await sleep(2000)
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
        console.log('json wallet file?', json_wallet)
        return json_wallet
    } catch (err) {
        console.log('Json wallet error, try backup wallet file', err)
    }
}

//Checks the message for a view tag
async function checkMessage(extra) {
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys()
    try {
    const rawExtra = trimExtra(extra)
    const parsed_box = JSON.parse(rawExtra)
        if (parsed_box.vt) {
            const derivation = await crypto.generateKeyDerivation(parsed_box.txKey, privateViewKey);
            const hashDerivation = await crypto.cn_fast_hash(derivation)
            const possibleTag = hashDerivation.substring(0,1)
            const view_tag = parsed_box.vt
            if (possibleTag === view_tag) {
                console.log('**** FOUND VIEWTAG ****')
                return true
            }
        }
    } catch (err) {
        console.log('No box or viewtag')
    }
    return false
}

async function backgroundSyncMessages(checkedTxs = false) {
    if (checkedTxs) {
        console.log('First start, push knownTxs db to known pool txs')
        known_pool_txs = checkedTxs.slice(checkedTxs.length - 100, checkedTxs.length - 1)
    }

    console.log('Background syncing...')
    mainWindow.webContents.send('sync', 'Syncing')
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
        let transaction
        //Try clearing known pool txs from checked
        known_pool_txs = known_pool_txs.filter((n) => !json.deletedTxsIds.includes(n))
        if (transactions.length === 0) {
            console.log('Empty array...')
            console.log('No incoming messages...')
            return
        }

        for (transaction in transactions) {
            try {
                let thisExtra = transactions[transaction].transactionPrefixInfo.extra
                let thisHash = transactions[transaction].transactionPrefixInfotxHash

                if (thisExtra.length > 7000) {
                    known_pool_txs.push(thisHash)
                    continue;
                }

                if (known_pool_txs.indexOf(thisHash) === -1) {
                    known_pool_txs.push(thisHash)
                } else {
                    console.log('This transaction is already known', thisHash)
                    continue
                }
                let message
                if (thisExtra !== undefined && thisExtra.length > 200) {
                   
                    let checkTag = await checkMessage(thisExtra)

                    if (checkTag) {
                        console.log('Found a possible message to me')
                        //TODO try decrypt extradata to message here? else try check if its a group message
                    }

                    message = await extraDataToMessage(thisExtra, known_keys, getXKRKeypair())
                    if (!message || message === undefined) {
                        let group = trimExtra(thisExtra)
                        message = JSON.parse(group)
                        if (message.sb) {
                             await decryptGroupMessage(message, thisHash)
                        }
                        saveHash(thisHash)
                        console.log('Caught undefined null message, continue')
                        continue
                    }
                    message.sent = false
                    //console.log("message type", message.type);
                    if (message.brd) {
                        //   message.type = "board";
                        //   if (my_boards.indexOf(message.brd) == -1) {
                        //     if (message.brd == "Home") {
                        //       saveHash(thisHash)
                        //       continue;
                        //     }
                        //     console.log("Not my board");
                        //     sanitizeHtml(message.brd)
                        //     sanitizeHtml(message.k)
                        //     let newBoard = {board: message.brd, address: message.k}
                        //     mainWindow.webContents.send('newBoard', newBoard)
                        //     saveBoardMsg(message, thisHash, false)
                        //     continue;
                        //   }

                        //saveBoardMsg(message, thisHash, true);
                    } else if (message.type === 'sealedbox' || 'box') {
                        console.log('Saving Message')
                        // await saveMsg(message);
                        saveMessage(message, thisHash)
                    }

                    console.log('Transaction checked')
                    saveHash(thisHash)
                }
            } catch (err) {
                console.log(err)
            }
        }
    } catch (err) {
        console.log(err)
        console.log('Sync error')
    }
}

//Saves contact and nickname to db.
async function saveContact(hugin_address, nickname = false, first = false) {

    let name
    if (!nickname) {
        console.log('no nickname')
        name = 'Anon'
    } else {
        name = nickname
    }
    let addr = hugin_address.substring(0, 99)
    let key = hugin_address.substring(99, 163)

    if (known_keys.indexOf(key) == -1) {
        known_keys.push(key)
    }
    console.log('Pushing this to known keys ', known_keys)
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
        console.log('Not saving offchain message')
        mainWindow.webContents.send('groupRtcMsg', message)
    }
}


//Saves private message
async function saveMessage(msg, hash, offchain = false) {

    let torrent
    let text
    let sent = msg.sent
    let addr = sanitizeHtml(msg.from)
    let timestamp = sanitizeHtml(msg.t)
    let key = sanitizeHtml(msg.k)

    let exists = await messageExists(timestamp)
    if (exists) return

    let group_call = false

    console.log('Msg incoming')
    if (offchain) {
        group_call = true
    }
    //Checking if private msg is a call
    text = await parseCall(msg.msg, addr, sent, true, group_call)

    let message = sanitizeHtml(text)

    //If sent set chat to chat instead of from
    if (msg.chat) {
        addr = msg.chat
    }

    //New message from unknown contact
    if (msg.type === 'sealedbox' && !sent) {
        console.log('Saving key', key)
        let hugin = addr + key
        await saveContact(hugin)
    }

    // Call offer message
    switch (message.substring(0, 1)) {
        case 'Δ':
        // Fall through
        case 'Λ':
            message = `${message.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`
            break
        default:
            message = message
    }
    let magnetLinks = /(magnet:\?[^\s\"]*)/gim.exec(text)
    if (magnetLinks) {
        message = 'File uploaded'
        torrent = magnetLinks[0]
    }

    saveMsg(message, addr, sent, timestamp)

    if (!offchain) {
        saveHash(hash)
    }
    //New message object
    if (magnetLinks && !sent) {
        message = torrent
    }
    let newMsg = {
        msg: message,
        chat: addr,
        sent: sent,
        timestamp: timestamp,
        magnet: magnetLinks,
        offchain: offchain,
    }
    if (sent) {
        //If sent, update conversation list
        mainWindow.webContents.send('sent', newMsg)
        return
    }
    //Send message to front end
    console.log('sending newmessage')
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
    const viewTag = hashDerivation.substring(0,1)

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
        console.log('wrong key size', group)
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

    try {
        if (newMsg.msg.msg) {
            let group = newMsg.msg.msg
            if (group.key.length !== 64) return

            mainWindow.webContents.send('group-call', group)

            if (group.type == 'invite') {
                console.log('Group invite, thanks.')
                return
            }

            let type = false
            sleep(100)
            if (group.type == true) {
                type = true
            }
            group.invite.forEach((a) => {
                console.log('Invited to call, joining...')
                mainWindow.webContents.send('start-call', a, type, true)
                sleep(1500)
            })
            return
        }
    } catch (e) {
        console.log('Not an invite', e)
    }

    if (!newMsg) return

    saveMessage(newMsg, hash, true)
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

    console.log(key)
    console.log(payload_json)

    const from = payload_json.k

    const this_addr = await Address.fromAddress(from)

    const verified = await xkrUtils.verifyMessageSignature(
        payload_json.m,
        this_addr.spend.publicKey,
        payload_json.s
    )

    if (!verified) return
    if (block_list.some(a => a.address === from)) return

    payload_json.sent = false

    saveGroupMessage(payload_json, hash, tx.t, offchain)

    return [payload_json, tx.t, hash]
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
const sendMessage = async (message, receiver, off_chain = false, group = false, beam_this = false) => {
    let has_history
    console.log('want to send message', message)
    return
    //Assert address length
    if (receiver.length !== 163) {
        return
    }
    //Split address
    let address = receiver.substring(0, 99)
    let messageKey = receiver.substring(99, 163)

    //Check history
    if (known_keys.indexOf(messageKey) > -1) {
        console.log('I know this contact?')
        has_history = true
    } else {
        known_keys.push(messageKey)
        has_history = false
    }

    if (message.length == 0) {
        return
    }

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
            console.log(
                `Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(
                    result.fee
                )}`
            )
            saveMessage(sentMsg, result.transactionHash)
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
        try {
            if (message.msg.invite) {
                return
            }
        } catch (e) {
            let saveThisMessage = {
                msg: message,
                k: messageKey,
                sent: true,
                t: timestamp,
                chat: address,
            }
            saveMessage(saveThisMessage, randomKey, true)
        }
    }
}

async function optimizeMessages(force = false) {

    console.log('optimize')
    console.log('my addresses', js_wallet.subWallets.getAddresses())
    if (js_wallet.subWallets.getAddresses().length === 1) {
        const [address, error] = await js_wallet.addSubWallet()
        if (!error) {
            console.log(`Created subwallet with address of ${address}`)
            console.log('my addresses updated', js_wallet.subWallets.getAddresses())
        }
    }

    let [mainWallet, subWallet] = js_wallet.subWallets.getAddresses()

    const [walletHeight, localHeight, networkHeight] = await js_wallet.getSyncStatus()

    let inputs = await js_wallet.subWallets.getSpendableTransactionInputs(
        [subWallet],
        networkHeight
    )

    console.log('inputs', inputs.length)
    if (inputs.length > 16 && !force) {
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

function parseCall(msg, sender, sent, emitCall = true, group = false) {
    switch (msg.substring(0, 1)) {
        case 'Δ':
        // Fall through
        case 'Λ':
            // Call offer
            if (emitCall) {
                // Start ringing sequence
                console.log('sent?', sent)
                if (!sent) {
                    console.log('call  incoming')
                    mainWindow.webContents.send('call-incoming', msg, sender, group)
                    // Handle answer/decline here
                }
                console.log('call incoming')
            }
            return `${msg.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`
            break
        case 'δ':
        // Fall through
        case 'λ':
            // Answer
            if (sent) return 'Call answered'
            if (emitCall) {
                let callback = JSON.stringify(expand_sdp_answer(msg))
                let callerdata = {
                    data: callback,
                    chat: sender,
                }
                mainWindow.webContents.send('got-callback', callerdata)
            }

            return 'Call answered'

            break
        default:
            return msg
    }
}

//BEAM

ipcMain.on("beam", async (e, link, chat) => {
    let beamMessage = await newBeam(link, chat, getXKRKeypair(), sender);
    if (beamMessage === "Error") return
    if (!beamMessage) return
    sendMessage(beamMessage.msg, beamMessage.chat, false)

});


ipcMain.on("end-beam", async (e, chat) => {
    console.log("end beam");
    endBeam(chat);
});

//FILES

ipcMain.on('download', async (e, file, from) => {
    console.log('ipcmain downloading')
    requestDownload(downloadDir, file, from)
    return
    download(link)
})

ipcMain.on('upload', async (e, filename, path, address, fileSize) => {
    console.log('ipcmain uploading', )
    addLocalFile(filename, path, address, fileSize)
    console.log('Local file added return test.')
    return
    upload(filename, path, address)
})

//GROUPS

ipcMain.on('sendGroupsMessage', (e, msg, offchain) => {
    return
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
    console.log('addchat first', first)
    saveContact(hugin_address, nickname, first)
})


ipcMain.on('removeContact', async (e, contact) => {
    await removeContact(contact)
    await removeMessages(contact)
    mainWindow.webContents.send('sent')
})


//NODE

ipcMain.handle('getHeight', async () => {
    let [walletHeight, daemonCount, networkHeight] = await js_wallet.getSyncStatus()
    return { walletHeight, networkHeight }
})

ipcMain.on('switchNode', async (e, node) => {
    console.log(`Switching node to ${node}`)
    nodeUrl = node.split(':')[0]
    nodePort = parseInt(node.split(':')[1])

    const daemon = new WB.Daemon(nodeUrl, nodePort)
    await js_wallet.swapNode(daemon)

    node = { node: nodeUrl, port: nodePort }
    db.data.node.node = nodeUrl
    db.data.node.port = nodePort
    db.data.node = node
    await db.write()
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

//Rescan wallet //TODO add height
ipcMain.on('rescan', async (e) => {
    let [walletHeight, daemonCount, networkHeight] = await js_wallet.getSyncStatus()
    js_wallet.reset(networkHeight - 10000)
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

ipcMain.on('openLink', (e, url) => {
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
    console.log('get-sdp', data.type, data.contact, data.video)

    if (data.type == 'offer') {
        let parsed_data = `${data.video ? 'Δ' : 'Λ'}` + parse_sdp(data.data, false)
        let recovered_data = expand_sdp_offer(parsed_data)
        sendMessage(parsed_data, data.contact, data.offchain, data.group)
    } else if (data.type == 'answer') {
        let parsed_data = `${data.video ? 'δ' : 'λ'}` + parse_sdp(data.data, true)
        console.log('parsed data really cool sheet:', parsed_data)
        let recovered_data = expand_sdp_answer(parsed_data)
        //Send expanded recovered data to front end for debugging etc, this can be removed
        mainWindow.webContents.send('rec-off', recovered_data)
        sendMessage(parsed_data, data.contact, data.offchain, data.group)
    }
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



