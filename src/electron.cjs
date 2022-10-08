const windowStateManager = require("electron-window-state");
const contextMenu = require("electron-context-menu");
const { app, BrowserWindow, ipcMain, ipcRenderer, Tray, Menu, nativeTheme, systemPreferences } = require("electron");
const serve = require("electron-serve");
const path = require("path");
const { join } = require("path");
const { JSONFile, Low } = require("@commonify/lowdb");
const fs = require("fs");
const files = require('fs/promises');
const WB = require("kryptokrona-wallet-backend-js");
const { default: fetch } = require("electron-fetch");
const nacl = require("tweetnacl");
const naclUtil = require("tweetnacl-util");
const naclSealed = require("tweetnacl-sealed-box");
const { extraDataToMessage } = require("hugin-crypto");
const sanitizeHtml = require("sanitize-html");
const en = require("int-encoder");
const sqlite3 = require("sqlite3").verbose();
const Peer = require("simple-peer");
const WebTorrent = require("webtorrent");
const { desktopCapturer, shell } = require('electron');
const {autoUpdater} = require("electron-updater");
const {
  Address,
  AddressPrefix,
  Block,
  BlockTemplate,
  Crypto,
  CryptoNote,
  LevinPacket,
  Transaction
} = require("kryptokrona-utils");

const appRoot = require('app-root-dir').get().replace('app.asar', '');
const appBin = appRoot + '/bin/';

const xkrUtils = new CryptoNote();
const hexToUint = hexString => new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

function getXKRKeypair() {
  const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys();
  return { privateSpendKey: privateSpendKey, privateViewKey: privateViewKey };
}

function getKeyPair() {
  // return new Promise((resolve) => setTimeout(resolve, ms));
  const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys();
  let secretKey = naclUtil.decodeUTF8(privateSpendKey.substring(1, 33));
  let keyPair = nacl.box.keyPair.fromSecretKey(secretKey);
  return keyPair;
}

function getMsgKey() {

  const naclPubKey = getKeyPair().publicKey;
  return Buffer.from(naclPubKey).toString("hex");
}

async function createGroup() {
  return await Buffer.from(nacl.randomBytes(32)).toString('hex');
}


function toHex(str, hex) {
  try {
    hex = unescape(encodeURIComponent(str))
      .split("").map(function(v) {
        return v.charCodeAt(0).toString(16);
      }).join("");
  } catch (e) {
    hex = str;
    //console.log('invalid text input: ' + str)
  }
  return hex;
}

function nonceFromTimestamp(tmstmp) {

  let nonce = hexToUint(String(tmstmp));

  while (nonce.length < nacl.box.nonceLength) {

    let tmp_nonce = Array.from(nonce);

    tmp_nonce.push(0);

    nonce = Uint8Array.from(tmp_nonce);

  }

  return nonce;
}


function fromHex(hex, str) {
  try {
    str = decodeURIComponent(hex.replace(/(..)/g, "%$1"));
  } catch (e) {
    str = hex;
    // console.log('invalid hex input: ' + hex)
  }
  return str;
}


function trimExtra(extra) {

  try {
    let payload = fromHex(extra.substring(66));

    let payload_json = JSON.parse(payload);
    return fromHex(extra.substring(66));
  } catch (e) {
    return fromHex(Buffer.from(extra.substring(78)).toString());
  }
}

try {
  require("electron-reloader")(module);
} catch (e) {
  console.error(e);
}

const serveURL = serve({ directory: "." });
const port = process.env.PORT || 5173;
const dev = !app.isPackaged;
let mainWindow;

function createWindow() {
  let windowState = windowStateManager({
    defaultWidth: 1000,
    defaultHeight: 700
  });

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
      preload: path.join(__dirname, "preload.cjs")
    },
    x: windowState.x,
    y: windowState.y,
    width: windowState.width,
    height: windowState.height
  });
  
  windowState.manage(mainWindow);

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on("close", () => {
    windowState.saveState(mainWindow);
  });

  return mainWindow;
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
});

function loadVite(port) {
  mainWindow.loadURL(`http://localhost:${port}`).catch((e) => {
    console.log("Error loading URL, retrying", e);
    setTimeout(() => {
      loadVite(port);
    }, 200);
  });
}

function createMainWindow() {
  mainWindow = createWindow();
  mainWindow.once("close", () => {
    mainWindow = null;
  });

  if (dev) loadVite(port);
  else serveURL(mainWindow);
}


app.on("ready", createMainWindow);
app.on("activate", () => {
  if (!mainWindow) {
    createMainWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

ipcMain.on("close", () => {
  mainWindow.hide()
  if (process.platform === "darwin") {
    app.dock.hide()
  }
});

ipcMain.on("min", () => {
  mainWindow.minimize();
});

let tray
app.whenReady().then(() => {
  console.log(appBin);
  let isDark = nativeTheme.shouldUseDarkColors;
  tray = new Tray(appBin + `tray${isDark ? "-dark" : ""}@2x.png`)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show', click: function () {
        mainWindow.show()
        if (process.platform === "darwin") {
          app.dock.show()
        }
      }
    },
    {
      label: 'Hide', click: function () {
        mainWindow.hide()
        if (process.platform === "darwin") {
          app.dock.hide()
        }
      }
    },
    {
      label: 'Quit', click: function () {
        app.quit()
      }
    },
  ])
  tray.setContextMenu(contextMenu)
  tray.setIgnoreDoubleClickEvents(true)
})

async function download(link) {

  let client = new WebTorrent();


  let thisLink = link
  console.log("download", thisLink);
  client.add(thisLink, { path: downloadDir }, function(torrent) {
    console.log("Download started", torrent);
    // Got torrent metadata!
    torrent.on("download", function(bytes) {
      console.log("just downloaded: " + bytes);
      console.log("total downloaded: " + torrent.downloaded);
      console.log("download speed: " + torrent.downloadSpeed);
      console.log("progress: " + torrent.progress);
    });

    console.log("log log");
    torrent.on("done", function(bytes) {
      console.log("torrent finished downloading");

      torrent.files.forEach(function(file) {
        console.log("file", file);
        setTimeout(function() {

          client.destroy();

        }, 60000);

      });
    });


  });

  console.log("log log");

}

ipcMain.on("download", async (e, link) => {
  console.log("ipcmain downloading");
  download(link);
  return
});


ipcMain.on("upload", async (e, filename, path, address) => {
  console.log("ipcmain uploading");
  upload(filename, path, address);
});


function upload(filename, path, address) {

  let client = new WebTorrent({maxConns: 1});
  console.log("uploading", filename);
  console.log("from ", path);
  client.seed(path, function(torrent) {
    console.log("upload this", torrent);
    console.log("Client is seeding " + torrent.magnetURI);
    torrent.files.forEach(function(file) {
      console.log("file", file);
    });
    return
    sendMessage(torrent.magnetURI.split("&tr")[0], address);
  });
}


function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


const userDataDir = app.getPath("userData");
const appPath = app.getAppPath();
const downloadDir = app.getPath("downloads");

const dbPath = userDataDir + "/SQLmessages.db";
const database = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.log("Err", err);
  }
});

let daemon;
let node;
let ports;

//Create misc.db
const file = join(userDataDir, "misc.db");
const adapter = new JSONFile(file);
const db = new Low(adapter);


let js_wallet;
let walletName;
let known_keys = [];
let known_pool_txs = [];
let myPassword;
let my_boards = [];

ipcMain.on("app", (data) => {
  mainWindow.webContents.send("getPath", userDataDir);
  startCheck();
  if (dev) {
    console.log('Running in development');
     mainWindow.openDevTools();
  } else {
    console.log('Running in production');
    autoUpdater.checkForUpdates();

    var AutoLaunch = require('auto-launch');
    var autoLauncher = new AutoLaunch({
        name: "Hugin Messenger",
        isHidden: true
    });

    // Checking if autoLaunch is enabled, if not then enabling it.
    autoLauncher.isEnabled().then(function(isEnabled) {
      if (isEnabled) return;
       autoLauncher.enable();
    }).catch(function (err) {
      throw err;
    });
  }
});


if (process.platform !== 'darwin') {
  autoUpdater.on('update-downloaded', () => {

    notifier.notify({
      title: "Hugin Update",
      appID: "Hugin Messenger",
      message: "A new update is available, would you like to install it now?",
      wait: true, // Wait with callback, until user action is taken against notification,
      actions: ['Yes', 'Later']
    },function (err, response, metadata) {
      // Response is response from notification
      // Metadata contains activationType, activationAt, deliveredAt
      console.log(response, metadata.activationValue, err);

      if(metadata.activationValue != "Later" || metadata.button != "Later" ) {
            autoUpdater.quitAndInstall();
            app.exit();
        }
      });

    });

  } else {

    autoUpdater.on('update-available', () => {
      notifier.notify({
        title: "Hugin Messenger",
        appID: "Hugin Messenger",
        message: "A new update is available, would you like to install it now?",
        wait: true, // Wait with callback, until user action is taken against notification,
        actions: ['Yes', 'Later']
      },function (err, response, metadata) {
        // Response is response from notification
        // Metadata contains activationType, activationAt, deliveredAt
        console.log(response, metadata.activationValue, err);

        if(metadata.activationValue == "Yes" || metadata.button == "Yes" ) {


         shell.openExternal('https://github.com/kryptokrona/hugin-svelte/releases/latest');


          }
        });

  });
 }



async function startCheck() {


  if (fs.existsSync(userDataDir + "/misc.db")) {
    await db.read();
    let walletName = db.data.walletNames
    console.log("walletname", walletName);
    mainWindow.webContents.send("wallet-exist", true, walletName);
    createTables()
    node = db.data.node.node;
    ports = db.data.node.port;
    let mynode = { node: node, port: ports };
    daemon = new WB.Daemon(node, ports);

    ipcMain.on("login", async (event, data) => {

      startWallet(data, mynode);

    });

  } else {
    //No wallet found, probably first start
    console.log("wallet not found");
    createTables()
    mainWindow.webContents.send("wallet-exist", false);
  }

}

async function createTables() {
  boardMessageTable();
  messagesTable();
  knownTxsTable();
  contactsTable();
  boardsSubscriptionsTable();
  groupMessageTable()
  groupsTable()
}

async function startWallet(data, mynode) {
  let walletName = data.thisWallet;
  let password = data.myPassword;
  console.log("Starting this wallet", walletName);
  console.log("password", password);
  start_js_wallet(walletName, password, mynode);
}

function contactsTable() {
  const contactsTable = `
                    CREATE TABLE IF NOT EXISTS contacts (
                       address TEXT,
                       key TEXT,
                       name TEXT,
                       UNIQUE (key)
                   )`;
  return new Promise((resolve, reject) => {
    database.run(contactsTable, (err) => {
    });
    console.log("created contacts Table");

  }, () => {
    resolve();
  });
}

function knownTxsTable() {
  const knownTxTable = `
                  CREATE TABLE IF NOT EXISTS knownTxs (
                     hash TEXT,
                     UNIQUE (hash)
                 )`;
  return new Promise((resolve, reject) => {
    database.run(knownTxTable, (err) => {
    });
    console.log("created Known TX Table");

  }, () => {
    resolve();
  });
}


function boardMessageTable() {
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
                    )`;
  return new Promise((resolve, reject) => {
    database.run(boardTable, (err) => {
    });
    console.log("created Board Table");
  }, () => {
    resolve();
  });
}

function messagesTable() {
  const messageTable = `
                CREATE TABLE IF NOT EXISTS messages (
                   msg TEXT,
                   chat TEXT,
                   sent BOOLEAN,
                   timestamp TEXT,
                   UNIQUE (timestamp)
               )`;
  return new Promise((resolve, reject) => {
    database.run(messageTable, (err) => {
    });
    console.log("created Table");
  }, () => {
    resolve();
  });
}

function boardsSubscriptionsTable() {
  const subscriptionTable = `
            CREATE TABLE IF NOT EXISTS subscription (
              board TEXT,
              UNIQUE (board)
          )`;
  return new Promise((resolve, reject) => {
    database.run(subscriptionTable, (err) => {
    });
    console.log("created subscription Table");
  }, () => {
    resolve();
  });
}

function groupsTable() {
  const groupsTable = `
            CREATE TABLE IF NOT EXISTS pgroups (
              key TEXT,
              name TEXT,
              UNIQUE (key)
          )`;
  return new Promise((resolve, reject) => {
    database.run(groupsTable, (err) => {
    });
    console.log("created groups Table");
  }, () => {
    resolve();
  });
}


function groupMessageTable() {
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
            )`;
  return new Promise((resolve, reject) => {
    database.run(groupTable, (err) => {
    });
    console.log("created group Table");

  }, () => {
    resolve();
  });
}

function welcomeBoardMessage() {
  let sent = false;
  const boardMessage =
    `INSERT INTO boards  (
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
            (? ,?, ?, ?, ?, ?, ?, ?, ?)`;
  return new Promise((resolve, reject) => {
    database.run(boardMessage,
      [
        "Welcome to Hugin",
        "SEKReSxkQgANbzXf4Hc8USCJ8tY9eN9eadYNdbqb5jUG5HEDkb2pZPijE2KGzVLvVKTniMEBe5GSuJbGPma7FDRWUhXXDVSKHWc",
        "lol",
        "Home",
        "1650919475",
        "Hugin Messenger",
        "",
        "b80a4dc4fa60bf26dd31161702a165e43295adc1895f7333ad9eeeb819e20936",
        sent
      ], (err) => {
        console.log("Error creating msg", err);
      });
    console.log("created board msg");
  }, () => {
    resolve();
  });
}

function welcomeMessage() {
  const huginMessage = `INSERT INTO messages (msg, chat, sent, timestamp)
                          VALUES (?, ?, ?, ?)`;
  return new Promise((resolve, reject) => {
    database.run(huginMessage,
      [
        "Welcome to hugin",
        "SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1",
        false,
        "1650919475320"
      ], (err) => {
        console.log("Error creating msg", err);
      });
    console.log("created welcome msg");
  }, () => {
    resolve();
  });
}

function firstContact() {
  const firstContact = `INSERT INTO contacts (address, key, name)
                          VALUES (?, ?, ?)`;
  return new Promise((resolve, reject) => {
    database.run(firstContact,
      [
        "SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1",
        "133376bcb04a2b6c62fc9ebdd719fbbc0c680aa411a8e5fd76536915371bba7f",
        "Hugin"
      ], (err) => {
        console.log("Error creating contact msg", err);
      });
    console.log("created first contact msg");
  }, () => {
    resolve();
  });
}


ipcMain.on("create-account", async (e, accountData) => {


  //Create welcome message
  welcomeMessage();
  console.log("accdata", accountData);
  let walletName = accountData.walletName;
  let myPassword = accountData.password;
  node = accountData.node;
  ports = accountData.port;
  daemon = new WB.Daemon(node, ports);


  const [js_wallet, error] = ( accountData.mnemonic.length > 0 ? await WB.WalletBackend.importWalletFromSeed(daemon, accountData.blockheight, accountData.mnemonic) : [await WB.WalletBackend.createWallet(daemon), null]);

  //Create Hugin welcome contact
  firstContact();
  //Create Boards welcome message
  welcomeBoardMessage();
  
  // Save js wallet to file as backup
  await saveWallet(js_wallet, walletName, myPassword)
  addBoard('Home')
  
  //Create misc DB template on first start
  db.data = {
    walletNames: [],
    node: { node: "", port: "" }
  };
  //Saving node
  let mynode = { node: node, port: ports };
  db.data.node = mynode;
  //Saving wallet name
  db.data.walletNames.push(walletName);
  await db.write();
  console.log("creating dbs...");
  start_js_wallet(walletName, myPassword, mynode);
});

async function loadGroups() {

  const rows = [];
  return new Promise((resolve, reject) => {
    const getAllGroups = `SELECT * FROM pgroups`;
    database.each(getAllGroups, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      rows.push(row);
    }, () => {
      resolve(rows);
    });
  });
}

async function loadKeys(start = false) {

//Load known public keys from db and push them to known_keys
  let contacts = await getContacts();
  if (start) {
    contacts.forEach(function(keys) {
      known_keys.push(keys.key);
    });

  }

  return contacts;
}

async function loadKnownTxs() {

//Load known txs from db and then load them in to known_pool_txs
  const knownTransactions = [];
  return new Promise((resolve, reject) => {
    const getAllknownTxs = `SELECT * FROM knownTxs`;
    database.each(getAllknownTxs, (err, txs) => {
      if (err) {
        console.log("Error", err);
      }
      knownTransactions.push(txs);
    }, () => {
      resolve(knownTransactions);
    });
  });
}

async function logIntoWallet(walletName, password) {

  let parsed_wallet
  let json_wallet = await openWallet(walletName, password)
  console.log('Opened, want to log in, json_wallet')
  try {
  //Try parse json wallet
  parsed_wallet = JSON.parse(json_wallet)
  //Open encrypted json wallet
  const [js_wallet, error] = await WB.WalletBackend.openWalletFromEncryptedString(daemon, parsed_wallet, password);
  if (error) {
      console.log('Failed to open wallet: ' + error.toString());
      mainWindow.webContents.send("login-failed");
      return "Wrong password";
  }
    return js_wallet;

  } catch (err) {
    console.log('error parsing wallet', err)
    let wallet = await openWalletFromFile(walletName, password)
    return wallet
  //Probably a wallet file, return this
  }

}

async function openWalletFromFile(walletName, password) {

  console.log('Open wallet from file')
  const [js_wallet, error] = await WB.WalletBackend.openWalletFromFile(daemon, userDataDir + "/" + walletName + ".wallet", password);
  if (error) {
    console.log("Failed to open wallet: " + error.toString());
    mainWindow.webContents.send("login-failed");
    return "Wrong password";
  }
  return js_wallet;
}

async function start_js_wallet(walletName, password, mynode) {


  js_wallet = await logIntoWallet(walletName, password);

  if (js_wallet === "Wrong password") {
    console.log("A", js_wallet);
    return;
  }
  /* Start wallet sync process */
  await js_wallet.start();
  js_wallet.enableAutoOptimization(false);
  //Load known pool txs from db.
  let checkedTxs;
  let knownTxsIds = await loadKnownTxs();
  let my_groups = await getGroups()

  //Save backup wallet to file
  await saveWalletToFile(js_wallet, walletName, password);
  console.log('my', my_groups)
  if (knownTxsIds.length > 0) {

    checkedTxs = knownTxsIds.map(function(knownTX) {
      return knownTX.hash;
    });

  } else {
    //Push one test hash to the array if this is a new account, this should be empty?
    checkedTxs = [];
  }
  //Load known public keys
  let myContacts = await loadKeys(start = true);
  my_boards = await getMyBoardList();

  const [walletBlockCount, localDaemonBlockCount, networkBlockCount] = js_wallet.getSyncStatus();
  mainWindow.webContents.send("sync", "Not syncing");
  mainWindow.webContents.send("node-sync-data", { walletBlockCount, localDaemonBlockCount, networkBlockCount });


  //Incoming transaction event
  js_wallet.on("incomingtx", (transaction) => {
    optimizeMessages();
    console.log(`Incoming transaction of ${transaction.totalAmount()} received!`);

    console.log("transaction", transaction);
    mainWindow.webContents.send("new-message", transaction.toJSON());

  });

  //Get primary address and fuse it with our message key to create our hugin address
  let myAddress;
  let msgKey;
  myAddress = await js_wallet.getPrimaryAddress();

  console.log("XKR Address", myAddress);
  msgKey = getMsgKey();
  console.log("Hugin Address", myAddress + msgKey);

  mainWindow.webContents.send("addr", myAddress + msgKey);

  js_wallet.on('createdtx', async (tx) => {
    console.log('***** outgoing *****', tx);
    await saveWallet(js_wallet, walletName, password)
  })


  //Wallet heightchange event with funtion that saves wallet only if we are synced
  js_wallet.on("heightchange", async (walletBlockCount, localDaemonBlockCount, networkBlockCount) => {
    let synced = networkBlockCount - walletBlockCount <= 2;
    if (synced) {
      //Send synced event to frontend
      mainWindow.webContents.send("sync", "Synced");

      // Save js wallet to file
      console.log("///////******** SAVING WALLET *****\\\\\\\\");
      await saveWallet(js_wallet, walletName, password)
    } else if (!synced) {
      return;
    }
  });

  mainWindow.webContents.send("wallet-started", myContacts, mynode, my_groups);
  console.log("Started wallet");
  await sleep(2000);
  console.log("Loading Sync");
  //Load knownTxsIds to backgroundSyncMessages on startup
  backgroundSyncMessages(checkedTxs);
  while (true) {

    try {
      //Start syncing
      await sleep(1000 * 10);

      backgroundSyncMessages();

      const [walletBlockCount, localDaemonBlockCount, networkBlockCount] = js_wallet.getSyncStatus();
      mainWindow.webContents.send("node-sync-data", { walletBlockCount, localDaemonBlockCount, networkBlockCount });

      if ((localDaemonBlockCount - walletBlockCount) < 2) {
        // Diff between wallet height and node height is 1 or 0, we are synced
        console.log("**********SYNCED**********");
        console.log("My Wallet ", walletBlockCount);
        console.log("The Network", networkBlockCount);
        mainWindow.webContents.send("sync", "Synced");
      } else {
        //If wallet is somehow stuck at block 0 for new users due to bad node connection, reset to the last 100 blocks.
        if (walletBlockCount === 0) {
          await js_wallet.reset(networkBlockCount - 100);
        }
        console.log("*.[~~~].SYNCING BLOCKS.[~~~].*");
        console.log("My Wallet ", walletBlockCount);
        console.log("The Network", networkBlockCount);
        mainWindow.webContents.send("sync", "Syncing");
      }

    } catch (err) {
      console.log(err);
    }
  }
}


async function encryptWallet(wallet, pass) {

  const encrypted_wallet = await wallet.encryptWalletToString(pass);

  return encrypted_wallet

}

async function saveWallet(wallet, walletName, password) {
  
  let my_wallet = await encryptWallet(wallet, password)
  
  let wallet_json = JSON.stringify(my_wallet)

  try {
    await files.writeFile(userDataDir + "/" + walletName + ".json", wallet_json);
  } catch (err) {
    console.log('Wallet json saving error, revert to saving wallet file');
    saveWalletToFile(wallet, walletName, password)
  }
}

 function saveWalletToFile(wallet, walletName, password) {
    wallet.saveWalletToFile(userDataDir + "/" + walletName + ".wallet", password);
}

 async function openWallet(walletName, password) {
  console.log('Open wallet', walletName)
  let json_wallet
  
  try {
    json_wallet = await files.readFile(userDataDir + "/" + walletName + ".json");
    console.log('json wallet file?', json_wallet)
    return json_wallet

  } catch (err) {

    console.log('Json wallet error, try backup wallet file', err)
  }

}

async function backgroundSyncMessages(checkedTxs = false) {

  if (checkedTxs) {
    console.log("First start, push knownTxs db to known pool txs");
    known_pool_txs = checkedTxs;
  }

  console.log("Background syncing...");
  mainWindow.webContents.send("sync", "Syncing");
  let message_was_unknown;
  try {
    const resp = await fetch("http://" + node + ":" + ports.toString() + "/get_pool_changes_lite", {
      method: "POST",
      body: JSON.stringify({ knownTxsIds: known_pool_txs })
    });

    let json = await resp.json();
    json = JSON.stringify(json).replaceAll(".txPrefix", "").replaceAll("transactionPrefixInfo.txHash", "transactionPrefixInfotxHash");

    json = JSON.parse(json);

    let transactions = json.addedTxs;
    let transaction;
    //Try clearing known pool txs from checked
    known_pool_txs = known_pool_txs.filter(n => !json.deletedTxsIds.includes(n));
    if (transactions.length === 0) {
      console.log("Empty array...");
      console.log("No incoming messages...");
      return;
    }

    for (transaction in transactions) {
      try {
        let thisExtra = transactions[transaction].transactionPrefixInfo.extra;
        let thisHash = transactions[transaction].transactionPrefixInfotxHash;

        if (known_pool_txs.indexOf(thisHash) === -1) {
          known_pool_txs.push(thisHash);

        } else {
          console.log("This transaction is already known", thisHash);
          continue;
        }
        let message;
        if (thisExtra !== undefined && thisExtra.length > 200) {
          message = await extraDataToMessage(thisExtra, known_keys, getXKRKeypair());
          if (!message || message === undefined) {
            let group = trimExtra(thisExtra)
            console.log('group', group)
            message = JSON.parse(group)
            if (message.sb)
            {
              decryptGroupMessage(message, thisHash)
            }
            saveHash(thisHash)
            console.log("Caught undefined null message, continue");
            continue;
          }

          message.sent = false;
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
            saveHash(thisHash)
            //saveBoardMsg(message, thisHash, true);
          } else if (message.type === "sealedbox" || "box") {
            console.log("Saving Message");
            // await saveMsg(message);
            saveMessage(message, thisHash);

          }

          console.log("Transaction checked");
          saveHash(thisHash);
        }

      } catch (err) {
        console.log(err);
      }

    }


  } catch (err) {
    console.log(err);
    console.log("Sync error");
  }
}

//Adds board to my_boards array so backgroundsync is up to date wich boards we are following.
ipcMain.on("addBoard", async (e, board) => {
  my_boards.push(board);
  addBoard(board)
});

ipcMain.on("removeBoard", async (e, board) => {
  my_boards.pop(board);
  removeBoard(board)
});

//Adds board to my_boards array so backgroundsync is up to date wich boards we are following.
ipcMain.on("addGroup", async (e, grp) => {
  addGroup(grp)
  saveGroupMessage(grp, parseInt(Date.now() / 1000), parseInt(Date.now()))
});

ipcMain.on("removeGroup", async (e, grp) => {
  removeGroup(grp)
});


//Listens for event from frontend and saves contact and nickname.
ipcMain.on("addChat", async (e, hugin_address, nickname, first = false) => {
  console.log("addchat first", first);
  saveContact(hugin_address, nickname, first);
});

async function addBoard(brd) {

  database.run(
    `REPLACE INTO subscription
      (board)
        VALUES
          (?)`,
    [
      brd,
    ]
  );

  console.log('saved board', brd)
}

async function removeBoard(brd) {

  database.run(
    `DELETE FROM
        subscription
      WHERE
        board = ?`,
    [ brd ]
  );

console.log('removed brd', brd)
}


async function addGroup(group) {
  console.log('adding', group)
  database.run(
    `REPLACE INTO pgroups
      (key, name)
        VALUES
          (?, ?)`,
    [
      group.k,
      group.n
    ]
  );

  console.log('saved group', group)
}

async function removeGroup(group) {

  database.run(
    `DELETE FROM
        pgroups
      WHERE
        key = ?`,
    [ group ]
  );

console.log('removed brd', group)
}




//Saves contact and nickname to db.
async function saveContact(hugin_address, nickname = false, first = false) {
  console.log("huginadress", hugin_address);
  console.log(first);
  let name;
  if (!nickname) {
    console.log("no nickname");
    name = "Anon";
  } else {
    name = nickname;
  }
  console.log("known_keys", known_keys);
  let addr = hugin_address.substring(0, 99);
  let key = hugin_address.substring(99, 163);

  if (known_keys.indexOf(key) == -1) {

    known_keys.push(key);
  }
  console.log("Pushing this to known keys ", known_keys);
  mainWindow.webContents.send("saved-addr", hugin_address);
  database.run(
    `REPLACE INTO contacts
         (address, key, name)
      VALUES
          (?, ?, ?)`,
    [
      addr,
      key,
      name
    ]
  );

  if (first) {
    saveMessage({ msg: "New friend added!", k: key, from: addr, chat: addr, sent: true, t: Date.now() });
    known_keys.pop(key);
    console.log("known_keys poped", known_keys);
  }

}

//Saves txHash as checked to avoid syncing old messages from mempool in Munin upgrade.
async function saveHash(txHash) {

  if (txHash == undefined || txHash.length < 64) {
    console.log("caught undefined hash");
    return;
  }

  database.run(
    `REPLACE INTO knownTxs (
                 hash
               )
               VALUES
                   ( ? )`,
    [
      txHash
    ]
  );
  console.log("saved hash");
}

//Saves board message.
async function saveBoardMsg(msg, hash, follow=false) {
  return
  let to_board = sanitizeHtml(msg.brd);
  let text = sanitizeHtml(msg.m);
  let addr = sanitizeHtml(msg.k);
  let reply = sanitizeHtml(msg.r);
  let sig = sanitizeHtml(msg.s);
  let timestamp = sanitizeHtml(msg.t);
  let nick = sanitizeHtml(msg.n);
  let txHash = sanitizeHtml(hash);
  if (nick === "") {
    nick = "Anonymous";
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
    sent: msg.sent
  };

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
    [
      text,
      addr,
      sig,
      to_board,
      timestamp,
      nick,
      reply,
      txHash,
      msg.sent
    ]
  );
    saveHash(hash)
  if (msg.sent || !follow) return;
  //Send new board message to frontend.
  mainWindow.webContents.send("boardMsg", message)
  mainWindow.webContents.send("newBoardMessage", message)
}

async function saveGroupMessage(msg, hash, time, offchain) {

  let group = sanitizeHtml(msg.g);
  let text = sanitizeHtml(msg.m);
  let addr = sanitizeHtml(msg.k);
  let reply = sanitizeHtml(msg.r);
  let sig = sanitizeHtml(msg.s);
  let timestamp = sanitizeHtml(time);
  let nick = sanitizeHtml(msg.n);
  let txHash = sanitizeHtml(hash);
  
  if (nick === "") {
    nick = "Anonymous";
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
    sent: msg.sent
  };

  if (!offchain) {
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
    [
      text,
      addr,
      sig,
      group,
      timestamp,
      nick,
      reply,
      txHash,
      msg.sent
    ]
  );
    saveHash(hash)
  
  //Send new board message to frontend.
  mainWindow.webContents.send("groupMsg", message);
  mainWindow.webContents.send("newGroupMessage", message);
  } else if (offchain) {
    console.log('Not saving offchain message')
  mainWindow.webContents.send("groupRtcMsg", message);
  }
}

//Get all messages from db
async function getMessages() {
  const rows = [];
  return new Promise((resolve, reject) => {
    const getAllMessages = `SELECT * FROM messages`;
    database.each(getAllMessages, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      rows.push(row);
    }, () => {
      resolve(rows);
    });
  });

}

//Get all boardmessages from db.
async function getBoardMsgs() {
  const allBoards = [];
  return new Promise((resolve, reject) => {
    const getAllBrds = `SELECT * FROM boards`;
    database.each(getAllBrds, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      allBoards.unshift(row);
    }, () => {
      resolve(allBoards);
    });
  });

}

//Get one message from every unique board sorted by latest timestmap.
async function getMyBoardList() {

  const myBoards = [];
  return new Promise((resolve, reject) => {
    const getMyBoards = `
          SELECT *
          FROM subscription
          `;
    database.each(getMyBoards, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      myBoards.push(row.board);
    }, () => {
      resolve(myBoards);
    });
  });

}

//Get one message from every unique user sorted by latest timestmap.
async function getGroups() {
  let my_groups = await loadGroups();
  let name;
  let newRow;
  let key;
  const myGroups = [];
  return new Promise((resolve, reject) => {
    const getMyGroups = `
          SELECT *
          FROM groupmessages D
          WHERE time = (SELECT MAX(time) FROM groupmessages WHERE grp = D.grp)
          ORDER BY
              time
          ASC
          `;
    database.each(getMyGroups, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      my_groups.some(function(chat) {
        if (chat.key === row.grp) {
          name = chat.name;
          key = chat.key;
          newRow = { name: name, msg: row.message, chat: row.grp, timestamp: row.time, sent: row.sent, key: key, hash: row.hash, nick: row.name };
          myGroups.push(newRow);
        }
      });

    }, () => {
      resolve(myGroups);
    });
  });

}

//Get one message from every unique user sorted by latest timestmap.
async function getConversations() {
  let contacts = await getContacts();
  let name;
  let newRow;
  let key;
  const myConversations = [];
  return new Promise((resolve, reject) => {
    const getMyConversations = `
          SELECT *
          FROM messages D
          WHERE timestamp = (SELECT MAX(timestamp) FROM messages WHERE chat = D.chat)
          ORDER BY
              timestamp
          ASC
          `;
    database.each(getMyConversations, (err, row) => {

      if (err) {
        console.log("Error", err);
      }
      contacts.some(function(chat) {
        if (chat.address == row.chat) {
          name = chat.name;
          key = chat.key;
        }
      });
      newRow = { name: name, msg: row.msg, chat: row.chat, timestamp: row.timestamp, sent: row.sent, key: key};
      myConversations.push(newRow);
    }, () => {
      resolve(myConversations);
    });
  });

}

//Get a chosen conversation from the reciepients xkr address.
async function getConversation(chat = false) {

  const thisConversation = [];
  return new Promise((resolve, reject) => {
    const getChat = `SELECT
            msg,
            chat,
            sent,
            timestamp
        FROM
            messages
        ${chat ? "WHERE chat = \"" + chat + "\"" : ""}
        ORDER BY
            timestamp
        ASC`;
    database.each(getChat, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      thisConversation.push(row);
    }, () => {
      resolve(thisConversation);
    });
  });
}


//Print a chosen group from the shared key.
async function printGroup(group = false) {

  const thisGroup = [];
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
        ${group ? "WHERE grp = \"" + group + "\"" : ""}
        ORDER BY
            time
        ASC`;
    database.each(getGroup, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      thisGroup.push(row);
    }, () => {
      resolve(thisGroup);
    });
  });
}

//Get all messages from a specific board from db
async function printBoard(board = false) {
  const boardArray = [];
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
        ${board ? "WHERE board = \"" + board + "\"" : ""}
        ORDER BY
            time
        ASC`;
    database.each(getBoard, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      boardArray.push(row);
    }, () => {
      boardArray.reverse();
      resolve(boardArray);
    });
  });
}

//Get original messsage from a chosen reply hash
async function getReply(reply = false) {
  console.log("Get reply", reply);
  let thisReply;
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
      ${reply ? "WHERE hash = \"" + reply + "\"" : ""}
      ORDER BY
          time
      ASC`;
    database.each(sql, (err, row) => {

      thisReply = row;
      if (err) {
        console.log("Error", err);
      }
    }, () => {
      resolve(thisReply);
    });
  });
}

//Get original messsage from a chosen reply hash
async function getGroupReply(reply) {
  console.log("Get reply", reply);
  let thisReply;
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
      ${reply ? "WHERE hash = \"" + reply + "\"" : ""}
      ORDER BY
          time
      ASC`;
    database.each(sql, (err, row) => {

      thisReply = row;
      console.log(thisReply)
      if (err) {
        console.log("Error", err);
      }
    }, () => {
      resolve(thisReply);
    });
  });
}

//Get all replies to a specific post
async function getReplies(hash = false) {
  const replies = [];
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
        ${hash ? "WHERE r = \"" + hash + "\"" : ""}
        ORDER BY
            time
        ASC`;
    database.each(sql, (err, row) => {
      console.log(row);
      if (err) {
        console.log("Error", err);
      }
      replies.push(row);
    }, () => {
      resolve(replies);
    });
  });
}



//Saves private message
async function saveMessage(msg, hash, offchain = false) {
  let torrent;
  let text;
  let sent = msg.sent;
  let addr = sanitizeHtml(msg.from);
  let timestamp = sanitizeHtml(msg.t);
  let key = sanitizeHtml(msg.k);
  console.log("msg", msg);

  let group_call = false

  console.log('Msg incoming')
  if (offchain) {
    group_call = true
  }
  //Checking if private msg is a call
  text = await parseCall(msg.msg, addr, sent, true, group_call);

  let message = sanitizeHtml(text);

  //If sent set chat to chat instead of from
  if (msg.chat) {
    addr = msg.chat;
  }


  //New message from unknown contact
  if (msg.type === "sealedbox" && !sent) {

    console.log("Saving key", key);
    let hugin = addr + key;
    await saveContact(hugin);

  }

  // Call offer message
  switch (message.substring(0, 1)) {
    case "Δ":
    // Fall through
    case "Λ":

      message = `${message.substring(0, 1) == "Δ" ? "Video" : "Audio"} call started`;
      break;
    default:
      message = message;

  }
  let magnetLinks = /(magnet:\?[^\s\"]*)/gmi.exec(text);
  if (magnetLinks) {
    message = "File uploaded";
    torrent = magnetLinks[0]
  }
  console.log("Saving message", message, addr, sent, timestamp);
  //Save to DB
  database.run(
    `REPLACE INTO messages
            (msg, chat, sent, timestamp)
         VALUES
             (?, ?, ?, ?)`,
    [
      message,
      addr,
      sent,
      timestamp
    ]
  );

  if (!offchain) {
    saveHash(hash)
  }
  //New message object
  if (magnetLinks && !sent) {
    message = torrent;
  }
  let newMsg = { msg: message, chat: addr, sent: sent, timestamp: timestamp, magnet: magnetLinks, offchain: offchain };
  if (sent) {
    //If sent, update conversation list
    mainWindow.webContents.send("sent", newMsg);
    return;
  }
  //Send message to front end
  console.log("sending newmessage");
  mainWindow.webContents.send("newMsg", newMsg)
  mainWindow.webContents.send("privateMsg", newMsg)
}


//Get all contacts from db
async function getContacts() {
  const myContactList = [];
  return new Promise((resolve, reject) => {
    const getMyContacts = `SELECT * FROM contacts`;
    database.each(getMyContacts, (err, row) => {
      if (err) {
        console.log("Error", err);
      }
      myContactList.push(row);
    }, () => {
      resolve(myContactList);
    });
  });

}

ipcMain.handle("createGroup", async () => {
  return await createGroup();
});

ipcMain.handle("getPrivateKeys", async () => {
  const [spendKey, viewKey] = await js_wallet.getPrimaryAddressPrivateKeys();
  return [spendKey, viewKey];
});

ipcMain.handle("getMnemonic", async () => {
  return await js_wallet.getMnemonicSeed();
});

//Gets n transactions per page to view in frontend
ipcMain.handle('getTransactions', async (e, startIndex) => {

  let startFrom = startIndex
  const showPerPage = 10
  const allTx = await js_wallet.getTransactions()
  const pages = Math.ceil(allTx.length / showPerPage)
  const pageTx = []
  for (const tx of await js_wallet.getTransactions(startFrom, showPerPage)) {
      pageTx.push({hash: tx.hash, amount: WB.prettyPrintAmount(tx.totalAmount()), time: tx.timestamp})
  }

  return {pageTx, pages}
})

ipcMain.on("openLink", (e,url) => {
 shell.openExternal(url)
});


//SWITCH NODE
ipcMain.on("switchNode", async (e, newNode) => {
  console.log(`Switching node to ${newNode}`);
  node = newNode.split(":")[0]
  ports = parseInt(newNode.split(":")[1])

  const daemon = new WB.Daemon(node, ports);
  await js_wallet.swapNode(daemon);

  let mynode = { node: node, port: ports };
  db.data.node = mynode;
  db.write();
});

ipcMain.on("sendTx", (e, tx) => {
  sendTx(tx);
}
);

ipcMain.on("sendMsg", (e, msg, receiver, off_chain, grp) => {
    sendMessage(msg, receiver, off_chain, grp);
    console.log(msg, receiver, off_chain);
  }
);

ipcMain.on("sendBoardMsg", (e, msg) => {
    sendBoardMessage(msg);
  }
);

ipcMain.on("sendGroupsMessage", (e, msg, offchain) => {
  sendGroupsMessage(msg, offchain);
}
);


ipcMain.on("answerCall", (e, msg, contact, key, offchain = false) => {
    console.log("Answer call", msg, contact, key, offchain);
    mainWindow.webContents.send("answer-call", msg, contact, key, offchain);
  }
);

ipcMain.on("endCall", async (e, peer, stream, contact) => {
  mainWindow.webContents.send("endCall", peer, stream, contact);
});

ipcMain.on("start_group_call", async (e, contacts) => {

});




async function sendGroupsMessage(message, offchain = false) {
  console.log('Send group msg', message, offchain)
  const my_address = message.k

  const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys();

  const signature = await xkrUtils.signMessage(message.m, privateSpendKey);

  const timestamp = parseInt(Date.now());

  const nonce = nonceFromTimestamp(timestamp);

  let group
  let reply = ""

    group = message.g

  if (group.length !== 64) {
    console.log('wrong key size', group)
    return
  }

  let message_json = {
    "m": message.m,
    "k": my_address,
    "s": signature,
    "g": group,
    "n": message.n,
    "r": reply
  }

  if (message.r.length === 64) {
    message_json.r = message.r
  }
  
  let [mainWallet, subWallet] = js_wallet.subWallets.getAddresses()

  const payload_unencrypted = naclUtil.decodeUTF8(JSON.stringify(message_json));

  const secretbox = nacl.secretbox(payload_unencrypted, nonce, hexToUint(group));

  const payload_encrypted = {"sb":Buffer.from(secretbox).toString('hex'), "t":timestamp};

  const payload_encrypted_hex = toHex(JSON.stringify(payload_encrypted));

  if (!offchain) {

  let result = await js_wallet.sendTransactionAdvanced(
      [[my_address, 1000]], // destinations,
      3, // mixin
      {fixedFee: 1000, isFixedFee: true}, // fee
      undefined, //paymentID
      [subWallet], // subWalletsToTakeFrom
      undefined, // changeAddress
      true, // relayToNetwork
      false, // sneedAll
      Buffer.from(payload_encrypted_hex, 'hex')
  );

  if (result.success) {
    console.log(result)
    message_json.sent = true
    saveGroupMessage(message_json, result.transactionHash, timestamp)
    mainWindow.webContents.send("sent_group", {hash: result.transactionHash, time: message.t});
    known_pool_txs.push(result.transactionHash);
    optimizeMessages()
  } else {
    let error = {
      message: "Failed to send",
      name: "Error",
      hash: Date.now()
    };
    mainWindow.webContents.send("error_msg", error);
    console.log(`Failed to send transaction: ${result.error.toString()}`);
  }
  } else if (offchain) {
    //Generate a random hash
    let randomKey = await createGroup()
    
    let sentMsg = Buffer.from(payload_encrypted_hex, 'hex')
    console.log("sending group rtc message");
    let sendMsg = randomKey + '99' + sentMsg
    let messageArray = [sendMsg]
    mainWindow.webContents.send("rtc_message", messageArray, true);
    mainWindow.webContents.send("sent_rtc_group", {hash: randomKey, time: message.t});
    console.log('payload', messageArray)
    //let saveMsg = { msg: message, k: messageKey, sent: true, t: timestamp, chat: address };
    //saveMessageSQL(saveMsg, randomKey, true);
  }
}

async function decryptGroupMessage(tx, hash, group_key = false) {

  console.log(tx);

  let decryptBox = false;
  let offchain = false
  let groups = await loadGroups()
  console.log('group key', group_key)
  if (group_key.length === 64) {
    let msg = tx
    tx = JSON.parse(trimExtra(msg))
    groups.unshift({key:group_key})
    offchain = true
  }

  let key;

  let i = 0;

  while (!decryptBox && i < groups.length) {

    let possibleKey = groups[i].key;

    i += 1;

    console.log('Trying key: ' + possibleKey);

    try {

     decryptBox = nacl.secretbox.open(
       hexToUint(tx.sb),
       nonceFromTimestamp(tx.t),
       hexToUint(possibleKey)
     );

     key = possibleKey;
    } catch (err) {
      console.log(err);
     continue;
    }



  }

  if (!decryptBox) {
    return false;
  }

  const message_dec = naclUtil.encodeUTF8(decryptBox);

  const payload_json = JSON.parse(message_dec);

  console.log(key);
  console.log(payload_json);

  const from = payload_json.k;

  const this_addr = await Address.fromAddress(from);

  const verified = await xkrUtils.verifyMessageSignature(payload_json.m, this_addr.spend.publicKey, payload_json.s);

  if (!verified) return
  
  payload_json.sent = false

  saveGroupMessage(payload_json, hash, tx.t, offchain);
 

  return [payload_json, tx.t, hash];


}

async function sendBoardMessage(message) {
  console.log("sending board", message);
  let reply = message.r;
  let to_board = message.brd;
  let my_address = message.k;
  let nickname = message.n;
  let msg = message.m;
  try {

    let timestamp = parseInt(Date.now() / 1000);
    let [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys();
    let xkr_private_key = privateSpendKey;
    let signature = await xkrUtils.signMessage(msg, xkr_private_key);

    let payload_json = {
      "m": msg,
      "k": my_address,
      "s": signature,
      "brd": to_board,
      "t": timestamp,
      "n": nickname
    };

    if (reply) {
      payload_json.r = reply;
    }

    payload_hex = toHex(JSON.stringify(payload_json));

    let [mainWallet, subWallet] = js_wallet.subWallets.getAddresses()

    let result = await js_wallet.sendTransactionAdvanced(
      [[subWallet, 1000]], // destinations,
      3, // mixin
      { fixedFee: 1000, isFixedFee: true }, // fee
      undefined, //paymentID
      [subWallet], // subWalletsToTakeFrom
      undefined, // changeAddress
      true, // relayToNetwork
      false, // sneedAll
      Buffer.from(payload_hex, "hex")
    );

    if (result.success) {
      console.log(`Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(result.fee)}`);
      mainWindow.webContents.send('sent_board', {hash: result.transactionHash, time: message.t})
      known_pool_txs.push(result.transactionHash);
      const sentMsg = payload_json;
      sentMsg.sent = true;
      sentMsg.type = "board";
      saveBoardMsg(sentMsg, result.transactionHash);
    } else {
      let error = {
        message: "Failed to send",
        name: "Error",
        hash: Date.now()
      };
      mainWindow.webContents.send("error_msg", error);
      console.log(`Failed to send transaction: ${result.error.toString()}`);
    }

  } catch (err) {
    mainWindow.webContents.send("error_msg");
    console.log("Error", err);
  }

  optimizeMessages()

}

async function sendMessage(message, receiver, off_chain = false, group = false) {
  let has_history;
  console.log("address", receiver.length);
  if (receiver.length !== 163) {
    return;
  }
  let address = receiver.substring(0, 99);
  let messageKey = receiver.substring(99, 163);
  //receiver.substring(99,163);
  if (known_keys.indexOf(messageKey) > -1) {

    console.log("I know this contact?");
    has_history = true;

  } else {
    known_keys.push(messageKey);
    has_history = false;

  }

  if (message.length == 0) {
    return;
  }


  let my_address = await js_wallet.getPrimaryAddress();

  let my_addresses = await js_wallet.getAddresses();

  try {

    let [munlockedBalance, mlockedBalance] = await js_wallet.getBalance();
    //console.log('bal', munlockedBalance, mlockedBalance);

    if (munlockedBalance < 11 && mlockedBalance > 0) {

      log;
      return;

    }
  } catch (err) {
    return;
  }

  let timestamp = Date.now();


  // History has been asserted, continue sending message

  let box;

  if (!has_history) {
    //console.log('No history found..');
    // payload_box = {"box":Buffer.from(box).toString('hex'), "t":timestamp};
    const addr = await Address.fromAddress(my_address);
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys();
    let xkr_private_key = privateSpendKey;
    let signature = await xkrUtils.signMessage(message, xkr_private_key);
    let payload_json = {
      "from": my_address,
      "k": Buffer.from(getKeyPair().publicKey).toString("hex"),
      "msg": message,
      "s": signature
    };
    let payload_json_decoded = naclUtil.decodeUTF8(JSON.stringify(payload_json));
    box = new naclSealed.sealedbox(payload_json_decoded, nonceFromTimestamp(timestamp), hexToUint(messageKey));
  } else {
    //console.log('Has history, not using sealedbox');
    // Convert message data to json
    let payload_json = { "from": my_address, "msg": message };

    let payload_json_decoded = naclUtil.decodeUTF8(JSON.stringify(payload_json));


    box = nacl.box(payload_json_decoded, nonceFromTimestamp(timestamp), hexToUint(messageKey), getKeyPair().secretKey);

  }

  let payload_box = { "box": Buffer.from(box).toString("hex"), "t": timestamp };

  // let payload_box = {"box":Buffer.from(box).toString('hex'), "t":timestamp, "key":Buffer.from(getKeyPair().publicKey).toString('hex')};
  // Convert json to hex
  let payload_hex = toHex(JSON.stringify(payload_box));
  //Choose subwallet with message inputs
  let messageWallet = js_wallet.subWallets.getAddresses()[1]

  if (!off_chain) {

    let result = await js_wallet.sendTransactionAdvanced(
      [[address, 1000]], // destinations,
      3, // mixin
      { fixedFee: 1000, isFixedFee: true }, // fee
      undefined, //paymentID
      [messageWallet], // subWalletsToTakeFrom
      messageWallet, // changeAddresss
      true, // relayToNetwork
      false, // sneedAll
      Buffer.from(payload_hex, "hex")
    );

    let sentMsg = { msg: message, k: messageKey, sent: true, t: timestamp, chat: address };
    if (result.success) {
      known_pool_txs.push(result.transactionHash);
      console.log(`Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(result.fee)}`);
      saveMessage(sentMsg, result.transactionHash);
      optimizeMessages()
    } else {
      let error = {
        message: `Failed: ${result.error.toString()}`,
        name: "Error",
        hash: Date.now()
      };
      
      optimizeMessages()
      console.log(`Failed to send transaction: ${result.error.toString()}`);
      mainWindow.webContents.send("error_msg", error);

    }

  } else if (off_chain) {

    let randomKey = await createGroup()
    let sentMsg = Buffer.from(payload_hex, "hex");
    console.log("sending rtc message");
    let sendMsg = randomKey + '99' + sentMsg
    let messageArray = []
    messageArray.push(sendMsg)
    messageArray.push(address)
    if (group) {
    messageArray.push('group')
    }
    mainWindow.webContents.send("rtc_message", messageArray);
     //Do not save invite message.
    try {
     if (message.msg.invite) {
      return
     }
    }catch (e) {
    console.log('payload', messageArray)
    let saveMsg = { msg: message, k: messageKey, sent: true, t: timestamp, chat: address };
    saveMessage(saveMsg, randomKey, true);
    }
  }
}

async function optimizeMessages(nbrOfTxs) {
  console.log("optimize");
  console.log('my addresses', js_wallet.subWallets.getAddresses())
  if (js_wallet.subWallets.getAddresses().length === 1) {
    const [address, error] = await js_wallet.addSubWallet();
      if (!error) {
          console.log(`Created subwallet with address of ${address}`);
          console.log('my addresses updated', js_wallet.subWallets.getAddresses())
      }
  }
  console.log('Have two addresses now', js_wallet.subWallets.getAddresses())


    let [mainWallet, subWallet] = js_wallet.subWallets.getAddresses()

    console.log('got main address',mainWallet)
    console.log('got sub address',subWallet)

    const [walletHeight, localHeight, networkHeight] = await js_wallet.getSyncStatus();

    let messageAddress = []
    messageAddress.push(subWallet)

    let inputs = await js_wallet.subWallets.getSpendableTransactionInputs(messageAddress, networkHeight);
    console.log("inputs", inputs.length)
    if (inputs.length > 17) {

      return;
    }
    let subWallets = js_wallet.subWallets.subWallets;
    let txs
    subWallets.forEach((value, name) => {
      txs = value.unconfirmedIncomingAmounts.length;
    });
    if (txs > 1 && inputs.length > 9) {
      console.log("Already have incoming inputs, aborting..");
      return;
    }
    let payments = [];
    let i = 0;
    /* User payment */
    while (i <= 49) {
      payments.push([
        subWallet,
        1000
      ]);
      console.log(payments.length)
      i += 1;

    }

    console.log("addresses", payments);

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
    );

    if (result.success) {
      let sent = {
        message: "Your wallet is optimizing",
        name: "Optimizing",
        hash: parseInt(Date.now()),
        key: mainWallet
      }
      mainWindow.webContents.send('sent_tx', sent)
      console.log("optimize completed");
    } else {
      console.log('optimize failed')
    }



}


async function sendTx(tx) {

  console.log('transactions', tx)
  console.log(`✅ SENDING ${tx.amount} TO ${tx.to}`)
    const result = await js_wallet.sendTransactionBasic(tx.to, tx.amount, tx.paymentID)
    if (result.success) {
      let amount = tx.amount / 100000
      let sent = {
        message: `You sent ${amount} XKR`,
        name: "Transaction sent",
        hash: parseInt(Date.now()),
        key: tx.to
      };
        mainWindow.webContents.send('sent_tx', sent)
        console.log(`Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(result.fee)}`);
    } else {
        console.log(`Failed to send transaction: ${result.error.toString()}`);
        let error = {
          message: "Failed to send",
          name: "Transaction error",
          hash: Date.now()
        };
        mainWindow.webContents.send("error_msg", error);
    }

}

ipcMain.handle("getMessages", async (data) => {
  return await getMessages();
});

ipcMain.handle("getReply", async (e, data) => {
  return await getReply(data);
});

ipcMain.handle("getGroupReply", async (e, data) => {
  return await getGroupReply(data);
});

ipcMain.handle("getConversations", async (e) => {
  let contacts = await getConversations();
  return contacts.reverse();
});

ipcMain.handle("getGroups", async (e) => {
  let groups = await getGroups();
  return groups.reverse();
});

ipcMain.handle("printGroup", async (e, grp) => {
  let resp = await printGroup(grp);
  return resp.reverse();
});

//Listens for ipc call from RightMenu board picker and prints any board chosen
ipcMain.handle("printBoard", async (e, board) => {
  return await printBoard(board);
});

ipcMain.handle("getAllBoards", async () => {
  return await getBoardMsgs();
});

ipcMain.handle("getMyBoards", async () => {
  return await getMyBoardList();
});

ipcMain.handle("getBalance", async () => {
  return await js_wallet.getBalance();
});

ipcMain.handle("getAddress", async () => {
  return js_wallet.getAddresses();

});

ipcMain.handle("getHeight", async () => {
  let [walletHeight, daemonCount, networkHeight] = await js_wallet.getSyncStatus();
  return { walletHeight, networkHeight };
});


ipcMain.on("startCall", async (e, contact, calltype) => {
  if (process.platform === "darwin") {
    const cameraAccess = systemPreferences.askForMediaAccess('camera')
    const microphoneAccess = systemPreferences.askForMediaAccess('microphone')
  }
  console.log("CALL STARTEeeeeeeeeeeeeD");

  console.log("contact", contact + calltype);
  mainWindow.webContents.send("start-call", contact, calltype);

});

ipcMain.handle("shareScreen", async (e, start) => {
  desktopCapturer.getSources({ types: ['window', 'screen'] }).then(async sources => {
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

});

ipcMain.on("setCamera", async (e, contact, calltype) => {
  mainWindow.webContents.send('set-camera')
})

ipcMain.on("change-src", async (e, src) => {
  console.log('ipc main on',)
  mainWindow.webContents.send('change-source', src)
})

ipcMain.on("check-srcs", async (e, src) => {
  mainWindow.webContents.send('check-src', src)
})

ipcMain.on("decrypt_message", async (e, message) => {

  console.log('message to decrypt??', message)
  let hash = message.substring(0,64)
  let newMsg = await extraDataToMessage(message, known_keys, getXKRKeypair())
  console.log('message decrypted? ', newMsg)
  
  if (newMsg) {
    newMsg.sent = false
  }

  try {

  if (newMsg.msg.msg) {
    
    let group = newMsg.msg.msg
    console.log('group?', group)
    console.log('Group key?', group.key)
    console.log('Group key length?', group.key.length)

    if (group.key.length !== 64) return
    
    mainWindow.webContents.send("group-call", group)

    if (group.type == "invite") {
      console.log('Got key', group.key)
      console.log('Group invite, thanks.')
      return
    }

    let type = false
    sleep(100)
    console.log('type true?', type)
    if (group.type == true) {
        type = true
    }
      group.invite.forEach(a => {
        console.log('Invited to call, joining...')
        mainWindow.webContents.send("start-call", a, type, true);
        sleep(1500)
    })
    return
  }
  } catch (e) {
    console.log('Not an invite', e)
  }

  if (!newMsg) return

  saveMessage(newMsg, hash, true);
})

ipcMain.on("decrypt_rtc_group_message", async (e, message, key) => {

  let msg

  console.log('key?', key)

  try {
  let hash = message.substring(0,64)
  console.log('hash?', hash)
  decryptGroupMessage(message, hash, key)
  if (!msg) {
    //Not a message to me, tunnel this
  }
  } catch(e) {
    console.log('error decrypting group msg', e)
    return
  }

})


let emitCall;
let awaiting_callback;
let active_calls = [];
let callback;

function parse_sdp(sdp) {

  let ice_ufrag = "";
  let ice_pwd = "";
  let fingerprint = "";
  let ips = [];
  let prts = [];
  let ssrcs = [];
  let msid = "";
  let ip;
  let port;

  let lines = sdp.sdp.split("\n")
    .map(l => l.trim()); // split and remove trailing CR
  lines.forEach(function(line) {

    if (line.includes("a=fingerprint:") && fingerprint == "") {

      let parts = line.substr(14).split(" ");
      let hex = line.substr(22).split(":").map(function(h) {
        return parseInt(h, 16);
      });

      fingerprint = btoa(String.fromCharCode.apply(String, hex));


      console.log("BASED64", fingerprint);


    } else if (line.includes("a=ice-ufrag:") && ice_ufrag == "") {

      ice_ufrag = line.substr(12);


    } else if (line.includes("a=ice-pwd:") && ice_pwd == "") {

      ice_pwd = line.substr(10);

    } else if (line.includes("a=candidate:")) {

      let candidate = line.substr(12).split(" ");

      ip = candidate[4];
      port = candidate[5];
      type = candidate[7];


      let hexa = ip.split(".").map(function(h) {
        return h.toString(16);
      });

      let ip_hex = btoa(String.fromCharCode.apply(String, hexa));
      console.log("IP CODED", ip_hex);

      if (type == "srflx") {
        ip_hex = "!" + ip_hex;
      } else {
        ip_hex = "?" + ip_hex;
      }

      if (!ips.includes(ip_hex)) {
        ips = ips.concat(ip_hex);

      }

      let indexedport = port + ips.indexOf(ip_hex).toString();

      prts = prts.concat(en.encode(parseInt(indexedport)));


    } else if (line.includes("a=ssrc:")) {

      let ssrc = en.encode(line.substr(7).split(" ")[0]);

      if (!ssrcs.includes(ssrc)) {

        ssrcs = ssrcs.concat(ssrc);

      }


    } else if (line.includes("a=msid-semantic:")) {

      msid = line.substr(16).split(" ")[2];
      console.log("msid", msid);

    }


  });

  return ice_ufrag + "," + ice_pwd + "," + fingerprint + "," + ips.join("&") + "," + prts.join("&") + "," + ssrcs.join("&") + "," + msid;

}


function parseCall(msg, sender, sent, emitCall = true, group = false) {
  console.log("🤤🤤🤤🤤🤤🤤", sender, msg);
  switch (msg.substring(0, 1)) {
    case "Δ":
    // Fall through
    case "Λ":
      // Call offer
      if (emitCall) {

        // Start ringing sequence
        console.log("sent?", sent);
        if (!sent) {
          console.log("call  incoming");
          mainWindow.webContents.send("call-incoming", msg, sender, group);
          // Handle answer/decline here
        }
        console.log("call incoming");
      }
      return `${msg.substring(0, 1) == "Δ" ? "Video" : "Audio"} call started`;
      break;
    case "δ":
    // Fall through
    case "λ":
      // Answer
      if (sent) return "Call answered";
      if (emitCall) {
        let callback = JSON.stringify(expand_sdp_answer(msg));
        let callerdata = {
          data: callback,
          chat: sender
        };
        mainWindow.webContents.send("got-callback", callerdata);
        console.log("got sdp", msg);
      }

      return "Call answered";

      break;
    default:
      return msg;

  }

}

let stream;

ipcMain.on("expand-sdp", (e, data, address) => {
  console.log("INCOMING EXPAND SDP", address);
  let recovered_data = expand_sdp_offer(data);
  console.log("TYPE EXPAND_O", recovered_data);
  let expanded_data = [];
  expanded_data.push(recovered_data);
  expanded_data.push(address);
  mainWindow.webContents.send("got-expanded", expanded_data);
});


ipcMain.on("get-sdp", (e, data) => {
  console.log("get-sdp", data.type, data.contact, data.video);

  if (data.type == "offer") {
    console.log("Offer",  data.type, data.contact, data.video);
    let parsed_data = `${data.video ? "Δ" : "Λ"}` + parse_sdp(data.data);
    let recovered_data = expand_sdp_offer(parsed_data);
    sendMessage(parsed_data, data.contact, data.offchain, data.group);

  } else if (data.type == "answer") {
    console.log("Answerrrrrrrr", data.type, data.contact, data.video);
    let parsed_data = `${data.video ? "δ" : "λ"}` + parse_sdp(data.data);
    console.log("parsed data really cool sheet:", parsed_data);
    let recovered_data = expand_sdp_answer(parsed_data);
    sendMessage(parsed_data, data.contact, data.offchain, data.group);

  }
});

function expand_sdp_offer(compressed_string) {

  let type = compressed_string.substring(0, 1);

  let split = compressed_string.split(",");

  let ice_ufrag = split[0].substring(1);

  let ice_pwd = split[1];

  let fingerprint = decode_fingerprint(split[2]);

  let ips = split[3];

  let prts = split[4];

  let ssrc = split[5].split("&").map(function(h) {
    return en.decode(h);
  });

  let msid = split[6];

  let external_ip = "";

  let external_ports = [];

  let candidates = ["", "", "", ""];

  ips = ips.split("&").map(function(h) {
    return decode_ip(h.substring(1), h.substring(0, 1));
  });

  prts = prts.split("&").map(function(h) {
    return en.decode(h);
  });

  console.log("Pörts:", prts);


  let prio = 2122260223;

  let tcp_prio = 1518280447;

  let i = 1;
  let j = 1;
  let external_port_found = false;

  let current_internal = "";
  let port;
  prts.forEach(function(port) {
    console.log("checking in offer port", port);
    let ip_index = port.slice(-1);
    if (i == 1) {

      current_internal = port.substring(0, port.length - 1);

    }
    if (ips[ip_index].substring(0, 1) == "!") {
      external_ip = ips[ip_index].substring(1);
      external_ports = external_ports.concat(port.substring(0, port.length - 1));
      external_port_found = true;
      candidates[j] += "a=candidate:3098175849 1 udp 1686052607 " + ips[ip_index].replace("!", "") + " " + port.substring(0, port.length - 1) + " typ srflx raddr " + ips[0].replace("!", "").replace("?", "") + " rport " + current_internal + " generation 0 network-id 1 network-cost 50\r\n";
    } else if (port.substring(0, port.length - 1) == "9") {

      candidates[j] += "a=candidate:3377426864 1 tcp " + tcp_prio + " " + ips[ip_index].replace("?", "") + " " + port.substring(0, port.length - 1) + " typ host tcptype active generation 0 network-id 1 network-cost 50\r\n";
      tcp_prio = tcp_prio - 500;

    } else {
      candidates[j] += "a=candidate:1410536466 1 udp " + prio + " " + ips[ip_index].replace("?", "") + " " + port.substring(0, port.length - 1) + " typ host generation 0 network-id 1 network-cost 10\r\n";
      prio = parseInt(prio * 0.8);
    }


    if (i == (prts.length / 3)) {
      i = 0;
      j += 1;
      external_port_found = false;
    }

    i += 1;

  });

  if (external_ip.length == 0) {
    external_id = ips[0].substring(1);
  }

  console.log("candidates", candidates);
  console.log("ports:", external_ports);

  console.log((external_ports.length / 3));
  console.log(((external_ports.length / 3) * 2));

  if (!external_ports[0]) {
    external_ports[0] = "9";
  }

  let sdp = `v=0
o=- 5726742634414877819 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=extmap-allow-mixed
a=msid-semantic: WMS ` + msid + `
m=audio ` + external_ports[0] + ` UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates[1] +
    `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint + `
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=sendrecv
a=msid:` + msid + ` 333cfa17-df46-4ffc-bd9a-bc1c47c90485
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:63 red/48000/2
a=fmtp:63 111/111
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:106 CN/32000
a=rtpmap:105 CN/16000
a=rtpmap:13 CN/8000
a=rtpmap:110 telephone-event/48000
a=rtpmap:112 telephone-event/32000
a=rtpmap:113 telephone-event/16000
a=rtpmap:126 telephone-event/8000
a=ssrc:` + ssrc[0] + ` cname:c2J8K3mNIXGEi9qt
a=ssrc:` + ssrc[0] + ` msid:` + msid + ` 333cfa17-df46-4ffc-bd9a-bc1c47c90485
a=ssrc:` + ssrc[0] + ` mslabel:` + msid + `
a=ssrc:` + ssrc[0] + ` label:333cfa17-df46-4ffc-bd9a-bc1c47c90485
m=video ` + external_ports[(external_ports.length / 3)] + ` UDP/TLS/RTP/SAVPF 127 125 108 124 123 35 114
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates[2] +
    `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint + `
a=setup:actpass
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
${type == "Δ" ? "a=sendrecv\r\na=msid:" + msid + " 0278bd6c-5efa-4fb7-838a-d9ba6a1d8baa" : "a=inactive"}
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:127 H264/90000
a=rtcp-fb:127 goog-remb
a=rtcp-fb:127 transport-cc
a=rtcp-fb:127 ccm fir
a=rtcp-fb:127 nack
a=rtcp-fb:127 nack pli
a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:125 H264/90000
a=rtcp-fb:125 goog-remb
a=rtcp-fb:125 transport-cc
a=rtcp-fb:125 ccm fir
a=rtcp-fb:125 nack
a=rtcp-fb:125 nack pli
a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:124 H264/90000
a=rtcp-fb:124 goog-remb
a=rtcp-fb:124 transport-cc
a=rtcp-fb:124 ccm fir
a=rtcp-fb:124 nack
a=rtcp-fb:124 nack pli
a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
a=rtpmap:123 H264/90000
a=rtcp-fb:123 goog-remb
a=rtcp-fb:123 transport-cc
a=rtcp-fb:123 ccm fir
a=rtcp-fb:123 nack
a=rtcp-fb:123 nack pli
a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f
a=rtpmap:35 H264/90000
a=rtcp-fb:35 goog-remb
a=rtcp-fb:35 transport-cc
a=rtcp-fb:35 ccm fir
a=rtcp-fb:35 nack
a=rtcp-fb:35 nack pli
a=fmtp:35 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f
a=rtpmap:114 H264/90000
a=rtcp-fb:114 goog-remb
a=rtcp-fb:114 transport-cc
a=rtcp-fb:114 ccm fir
a=rtcp-fb:114 nack
a=rtcp-fb:114 nack pli
a=fmtp:114 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f
${type == "Δ" ?
      "a=ssrc:" + ssrc[1] + " cname:qwjy1Thr/obQUvqd\r\n" +
      "a=ssrc:" + ssrc[1] + " msid:" + msid + " 6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n" +
      "a=ssrc:" + ssrc[1] + " mslabel:" + msid + "\r\n" +
      "a=ssrc:" + ssrc[1] + " label:6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n" : ""}m=application ` + external_ports[((external_ports.length / 3) * 2)] + ` UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 ` + external_ip + `
` + candidates[3] +
    `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint + `
a=setup:actpass
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`;

  console.log("ice", ice_ufrag);
  console.log("ice", ice_pwd);
  console.log("fingerprint", fingerprint);
  console.log("SRCS", ssrc);
  console.log("MSID", msid);
  console.log("candidates", candidates);
  return { type: "offer", sdp: sdp };

}

function expand_sdp_answer(compressed_string) {

  let split = compressed_string.split(",");

  console.log("split:", split);

  let type = compressed_string.substring(0, 1);

  let ice_ufrag = split[0].substring(1);

  let ice_pwd = split[1];

  let fingerprint = decode_fingerprint(split[2]);

  let ips = split[3];

  let prts = split[4];

  let ssrc = split[5].split("&").map(function(h) {
    return en.decode(h);
  });


  if (ssrc[1] == undefined) {
    ssrc[1] = ssrc[0];
  }

  let msid = split[6];

  let candidates = "";

  let external_ip = "";

  ips = ips.split("&").map(function(h) {
    return decode_ip(h.substring(1), h.substring(0, 1));
  });

  prts = prts.split("&").map(function(h) {
    return en.decode(h);
  });
  ;

  let external_port = "";

  console.log("ips:", ips);
  console.log("ports:", ports);

  let prio = 2122260223;
  let tcp_prio = 1518280447;

  if (prts.length > 1) {

    console.log("More than 1 port!");
    let port;
    prts.forEach(function(port) {
      console.log("checking in answer port", port);
      let ip_index = port.slice(-1);
      if (ips[ip_index].substring(0, 1) == "!") {
        if (external_port.length == 0) {
          external_port = port.substring(0, port.length - 1);
        }
        external_ip = ips[ip_index].substring(1);
        candidates += "a=candidate:3098175849 1 udp 1686052607 " + ips[ip_index].replace("!", "") + " " + port.substring(0, port.length - 1) + " typ srflx raddr " + ips[0].replace("?", "") + " rport " + port.substring(0, port.length - 1) + " generation 0 network-id 1 network-cost 50\r\n";
      } else if (port.substring(0, port.length - 1) == "9") {

        candidates += "a=candidate:3377426864 1 tcp " + tcp_prio + " " + ips[ip_index].replace("?", "").replace("!", "") + " " + port.substring(0, port.length - 1) + " typ host tcptype active generation 0 network-id 1 network-cost 50\r\n";
        tcp_prio = tcp_prio - 500;

      } else {

        candidates += "a=candidate:1410536466 1 udp " + prio + " " + ips[ip_index].replace("?", "") + " " + port.substring(0, port.length - 1) + " typ host generation 0 network-id 1 network-cost 10\r\n";
        prio = parseInt(prio * 0.8);
      }


    });

  } else {

    external_ip = ips[0].replace("!", "").replace("?", "");

    external_port = prts[0].substring(0, prts[0].length - 1);
    candidates = "a=candidate:1410536466 1 udp 2122260223 " + ips[0].replace("!", "").replace("?", "") + " " + prts[0].substring(0, prts[0].length - 1) + " typ host generation 0 network-id 1 network-cost 10\r\n";
  }

  if (!external_port) {
    external_port = "9";
  }


  let sdp = `v=0
o=- 8377786102162672707 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=extmap-allow-mixed
a=msid-semantic: WMS ` + msid + `
m=audio ` + external_port + ` UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates +
    `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint + `
a=setup:active
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=sendrecv
a=msid:` + msid + ` a18f5f6a-2e4e-4012-8caa-8c28936bdb66
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:63 red/48000/2
a=fmtp:63 111/111
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:106 CN/32000
a=rtpmap:105 CN/16000
a=rtpmap:13 CN/8000
a=rtpmap:110 telephone-event/48000
a=rtpmap:112 telephone-event/32000
a=rtpmap:113 telephone-event/16000
a=rtpmap:126 telephone-event/8000
a=ssrc:` + ssrc[0] + ` cname:vhWDFlNcJ4vSUvs5
m=video 9 UDP/TLS/RTP/SAVPF 127 125 108 124 123 35 114
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint + `
a=setup:active
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
${type == "δ" ? "a=sendrecv\r\na=msid:" + msid + " 06691570-5673-40ba-a027-72001bbc6f70" : "a=recvonly"}
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:127 H264/90000
a=rtcp-fb:127 goog-remb
a=rtcp-fb:127 transport-cc
a=rtcp-fb:127 ccm fir
a=rtcp-fb:127 nack
a=rtcp-fb:127 nack pli
a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:125 H264/90000
a=rtcp-fb:125 goog-remb
a=rtcp-fb:125 transport-cc
a=rtcp-fb:125 ccm fir
a=rtcp-fb:125 nack
a=rtcp-fb:125 nack pli
a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:124 H264/90000
a=rtcp-fb:124 goog-remb
a=rtcp-fb:124 transport-cc
a=rtcp-fb:124 ccm fir
a=rtcp-fb:124 nack
a=rtcp-fb:124 nack pli
a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
a=rtpmap:123 H264/90000
a=rtcp-fb:123 goog-remb
a=rtcp-fb:123 transport-cc
a=rtcp-fb:123 ccm fir
a=rtcp-fb:123 nack
a=rtcp-fb:123 nack pli
a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f
a=rtpmap:35 H264/90000
a=rtcp-fb:35 goog-remb
a=rtcp-fb:35 transport-cc
a=rtcp-fb:35 ccm fir
a=rtcp-fb:35 nack
a=rtcp-fb:35 nack pli
a=fmtp:35 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f
a=rtpmap:114 H264/90000
a=rtcp-fb:114 goog-remb
a=rtcp-fb:114 transport-cc
a=rtcp-fb:114 ccm fir
a=rtcp-fb:114 nack
a=rtcp-fb:114 nack pli
a=fmtp:114 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f
${type == "δ" ?
      `a=ssrc:` + ssrc[1] + ` cname:0v7phLz3L82cIhVT"\r\n` : ""}m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
b=AS:30
a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint + `
a=setup:active
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`;

  console.log("ice", ice_ufrag);
  console.log("ice", ice_pwd);
  console.log("fingerprint", fingerprint);
  console.log("SRCS", ssrc);
  console.log("MSID", msid);
  console.log("candidates", candidates);

  return { type: "answer", sdp: sdp };
}


let decode_fingerprint = (fingerprint) => {
  console.log("fingerprint", fingerprint);
  let decoded_fingerprint = "";
  let piece;
  let letters = atob(fingerprint).split("");
  for (letter in letters) {
    try {

      let piece = letters[letter].charCodeAt(0).toString(16);
      console.log("del", piece);
      if (piece.length == 1) {
        piece = "0" + piece;
      }
      decoded_fingerprint += piece;


    } catch (err) {
      console.log("error", piece);
      console.log("error", letter);

      continue;
    }
  }
  console.log("almost", decoded_fingerprint);

  decoded_fingerprint = decoded_fingerprint.toUpperCase().replace(/(.{2})/g, "$1:").slice(0, -1);

  console.log("There", decoded_fingerprint);

  return decoded_fingerprint;
};

let decode_ip = (ip, type) => {
  let decoded_ip = "";

  let letters = atob(ip).split("");
  letters.forEach(function(letter) {
    if (letter.length > 1) return;
    let piece = letter.charCodeAt(0).toString(16);

    if (piece.length === 1) {
      piece = "0" + piece;
    }

    decoded_ip += parseInt(piece, 16) + ".";
  });

  console.log("decoded ip", decoded_ip);


  return type + decoded_ip.slice(0, -1);
};
