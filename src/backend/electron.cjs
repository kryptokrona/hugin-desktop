const contextMenu = require('electron-context-menu')
const {
    app,
    BrowserWindow,
    ipcMain,
    Tray,
    Menu,
    nativeTheme,
    systemPreferences,
    globalShortcut
} = require('electron')
const serve = require('electron-serve')
const { join } = require('path')
const { JSONFile, Low } = require('@commonify/lowdb')
const fs = require('fs')
const WB = require('kryptokrona-wallet-backend-js')
const nacl = require('tweetnacl')
const { autoUpdater } = require('electron-updater')
const Store = require('electron-store');
const appRoot = require('app-root-dir').get().replace('app.asar', '')
const appBin = appRoot + '/bin/'
const userDataDir = app.getPath('userData')
// const dbPath = userDataDir + '/SQLmessages.db'
const serveURL = serve({ directory: '.' })
const port = process.env.PORT || 5173
const dev = !app.isPackaged
const { loadHugin, loadWallet } = require('./wallet.cjs')
const { Hugin } = require('./account.cjs')

let mainWindow

const sender = (channel, data) => {
    mainWindow.webContents.send(channel, data)
}

//Create misc.db
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)
const store = new Store()

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

    mainWindow.on('blur', () => {
        mainWindow.webContents.send('blur')
    })
    
    mainWindow.on('focus', () => {
        mainWindow.webContents.send('focus')
    })

    mainWindow.on("system-context-menu", (event, _point) => {
        event.preventDefault();
    });

    globalShortcut.unregisterAll()


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


const gotTheLock = app.requestSingleInstanceLock()
    
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (mainWindow) {
       showWindow()
    }
  })
    
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
    tray.on('click', function(e) {
        showWindow()
    })
})

function showWindow() {
    mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
}


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
    
    startCheck(sender)

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

const startCheck = async () => {
   
    store.set({
        wallet: {
            optimized: false
        }
    });
    
    loadWallet(sender)

    if (fs.existsSync(userDataDir + '/misc.db')) {
        //A misc database exits, probably we have an account
            loadHugin(mainWindow)
    } else {
        //No wallet found, probably first start
        console.log('wallet not found')
        sender('wallet-exist', false)
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


ipcMain.on("active-video", async (e, chat) => {
    mainWindow.webContents.send('activate-video')
});

ipcMain.on('exit-voice-channel', async (e, key) => {
    mainWindow.webContents.send('leave-active-voice-channel')
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


//CALLS

ipcMain.on('answer-call', (e, msg, contact, key, offchain = false) => {
    console.log('Answer call', msg, contact, key, offchain)
    mainWindow.webContents.send('answer-call', msg, contact, key, offchain)
})

ipcMain.on('end-call', async (e, peer, stream, contact) => {
    mainWindow.webContents.send('endCall', peer, stream, contact)
})

ipcMain.on('start_group_call', async (e, contacts) => { })

ipcMain.on('create-room', async (e, type) => {
    mainWindow.webContents.send('start-room', type)
})

//CALL USER MEDIA

ipcMain.on('start-call', async (e, contact, calltype) => {
    if (process.platform === 'darwin') {
        const cameraAccess = systemPreferences.askForMediaAccess('camera')
        const microphoneAccess = systemPreferences.askForMediaAccess('microphone')
    }
    console.log('CALL STARTED')

    console.log('contact', contact + calltype)
    mainWindow.webContents.send('start-call', contact, calltype)
})

ipcMain.on('share-screen', async (e, start, conference) => {
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


ipcMain.on('openLink', (e, url) => {
    const {shell} = require('electron')
    console.log('url', url)
    shell.openExternal(url)
})

ipcMain.on('open-download-folder', (e) => {
    const {shell} = require('electron')
    shell.showItemInFolder(Hugin.downloadDir)
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





