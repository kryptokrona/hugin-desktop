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
const WB = require('kryptokrona-wallet-backend-js')
const nacl = require('tweetnacl')
const { autoUpdater } = require('electron-updater')
const { 
    expand_sdp_answer, 
    expand_sdp_offer, 
    parse_sdp } = require("./sdp.cjs")
const {
    sleep, 
    randomKey, 
    hexToUint } = require("./utils.cjs")
const {
    loadDB,
    loadKeys,
    getGroups,
    loadBlockList,
    getMyBoardList,
    getGroupReply,
    printGroup,
    firstContact,
    welcomeMessage,
    welcomeBoardMessage,
    addBoard
} = require("./database.cjs")

const { loadDaemon, createWallet, importFromSeed, loginWallet, loadWallet, saveWallet, saveWalletToFile, pickNode, saveNode, loadMiscData, checkPassword, createMessageSubWallet, getPrivKeys, getXKRKeypair} = require('./wallet.cjs')
const { newBeam, endBeam, addLocalFile, requestDownload, removeLocalFile } = require("./beam.cjs")
const { newSwarm, endSwarm} = require("./swarm.cjs")
const { startMessageSyncer, sendMessage, optimizeMessages} = require('./messages.cjs')

const Store = require('electron-store');
const appRoot = require('app-root-dir').get().replace('app.asar', '')
const appBin = appRoot + '/bin/'
const userDataDir = app.getPath('userData')
const downloadDir = app.getPath('downloads')
const dbPath = userDataDir + '/SQLmessages.db'
const serveURL = serve({ directory: '.' })
const port = process.env.PORT || 5173
const dev = !app.isPackaged

const DHT = require('@hyperswarm/dht')


let mainWindow

//Create misc.db
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)
const store = new Store()

const welcomeAddress =
    'SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1'

let js_wallet
let block_list = []

try {
    require('electron-reloader')(module)
} catch (e) {
    console.error(e)
}

function createWindow() {
    const windowStateManager = require('electron-window-state')
    const path = require('path')
    let windowState = windowStateManager({
        defaultWidth: 1100,
        defaultHeight: 700,
    })

    const mainWindow = new BrowserWindow({
        frame: false,
        autoHideMenuBar: true,
        minHeight: 700,
        minWidth: 1100,
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
    mainWindow.webContents.send('os-arch', {os: process.platform, arch: process.arch})
    
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
    wallet()

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

function startDatabase() {
    loadDB(userDataDir, dbPath)
}

function wallet() {
    loadWallet(sender)
}

function getKeyPair() {
    // return new Promise((resolve) => setTimeout(resolve, ms));
    const [privateSpendKey, privateViewKey] = getPrivKeys()
    let secretKey = hexToUint(privateSpendKey)
    let keyPair = nacl.box.keyPair.fromSecretKey(secretKey)
    return keyPair
}

function getMsgKey() {
    const naclPubKey = getKeyPair().publicKey
    return Buffer.from(naclPubKey).toString('hex')
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
    const [node, walletName] = await loadMiscData()
    console.log("Loaded misc",[node, walletName] )
    mainWindow.webContents.send('wallet-exist', true, walletName, node)
    loadDaemon(node.node, node.port)
}

const startWallet = async (data, node) => {
    start_js_wallet(data.thisWallet, data.myPassword, node)
}

async function loadAccount(data) {
    let node = {node: data.node, port: data.port}
    console.log("load acc node", node)
    saveNode(node)
    startWallet(data, node)
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

async function login(walletName, password) {
    const [loggedIn, wallet]  = await loginWallet(walletName, password)
    if (!loggedIn) return false
    js_wallet = wallet
    return true
}

async function start_js_wallet(walletName, password, node) {
    
    if (await checkPassword(password, node)) return

    if (!await login(walletName, password)) return
    
    pickNode(node.node + ":" + node.port.toString())
    //Load known public keys and contacts
    let [myContacts, keys] = await loadKeys((start = true))
    mainWindow.webContents.send('contacts', myContacts)
    //Sleep 300ms
    await sleep(300)
    //Disable wallet optimization
    await js_wallet.enableAutoOptimization(false)
    //Start wallet sync process
    await js_wallet.start()
    await createMessageSubWallet();
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
    
    startMessageSyncer(sender, keys, block_list)
   
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

async function shareScreen(start, conference) {
const windows = []
const { desktopCapturer } = require('electron')
    desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async (sources) => {
        for (const source of sources) {
            windows.push({
                id: source.id,
                img: source.thumbnail.toDataURL(),
                name: source.name,
            })
        }
        mainWindow.webContents.send('screen-share-sources', windows)
    })
}

function get_sdp(data) 
{
    if (data.type == 'offer') 
    {
        let parsed_data = `${data.video ? 'Δ' : 'Λ'}` + parse_sdp(data.data, false)
        sendMessage(parsed_data, data.contact, data.offchain, data.group)
    } 
    else if (data.type == 'answer') 
    {
        let parsed_data = `${data.video ? 'δ' : 'λ'}` + parse_sdp(data.data, true)
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

ipcMain.on("active-video", async (e, chat) => {
    mainWindow.webContents.send('activate-video')
});

ipcMain.on("end-beam", async (e, chat) => {
    console.log("end beam");
    endBeam(chat);
});

//SWARM


ipcMain.on('new-swarm', async (e, data) => {
    newSwarm(data, sender, getXKRKeypair())
})
ipcMain.on('end-swarm', async (e, key) => {
    endSwarm(key)
})

ipcMain.on('exit-voice-channel', async (e, key) => {
    mainWindow.webContents.send('leave-active-voice-channel')
})

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
    return randomKey()
})

//NODE

ipcMain.handle('getHeight', async () => {
    let [walletHeight, daemonCount, networkHeight] = await js_wallet.getSyncStatus()
    return { walletHeight, networkHeight }
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

ipcMain.on('shareScreen', async (e, start, conference) => {
    shareScreen(start, conference)
})

ipcMain.on('pick-screen-source', (e, src) => {
        mainWindow.webContents.send('screen-share', src)
        mainWindow.webContents.send('group-screen-share', src)
})

ipcMain.on('setCamera', async (e, contact, calltype) => {
    mainWindow.webContents.send('set-camera')
})

ipcMain.on('change-src', async (e, src, conference, add) => {
    if (conference) {
        console.log("Add===", add)
        mainWindow.webContents.send('group-change-source', src, add)
        return
    }
    mainWindow.webContents.send('change-source', src, add)
})

ipcMain.on('change-audio-src', async (e, id, conference, input) => {
    if (conference) {
        mainWindow.webContents.send('set-audio-input-group', id, input)
        return
    }
    mainWindow.webContents.send('set-audio-input', id, input)
})

ipcMain.on('check-srcs', async (e, src) => {
    mainWindow.webContents.send('check-src', src)
})


//WALLET

//Rescan wallet
ipcMain.on('rescan', async (e, height) => {
    js_wallet.reset(parseInt(height))
})

ipcMain.on('sendTx', (e, tx) => {
    sendTx(tx)
})

ipcMain.handle('getPrivateKeys', async () => {
    return getPrivKeys()
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



