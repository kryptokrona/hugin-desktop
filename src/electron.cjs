const windowStateManager = require('electron-window-state');
const contextMenu = require('electron-context-menu');
const { app, BrowserWindow, ipcMain } = require('electron');
const serve = require('electron-serve');
const path = require('path');
const fs = require('fs');
const fetch = require('electron-fetch').default;
const WB = require('kryptokrona-wallet-backend-js');
let { join } = require('path');
const { Low, JSONFile } = require('@commonify/lowdb');
const utils = require('kryptokrona-utils');

let userDataDir = app.getPath('userData');

try {
	require('electron-reloader')(module);
} catch (e) {
	console.error(e);
}

const serveURL = serve({ directory: "." });
const port = process.env.PORT || 3000;
const dev = !app.isPackaged;
let mainWindow;

let node = 'explorer.kryptokrona.se'
let ports = 20001
const daemon = new WB.Daemon(node, ports);

function createWindow() {
	let windowState = windowStateManager({
		defaultWidth: 1000,
		defaultHeight: 600,
	});
	
	const mainWindow = new BrowserWindow({
		backgroundColor: 'whitesmoke',
		titleBarStyle: 'hidden',
		autoHideMenuBar: true,
		trafficLightPosition: {
			x: 17,
			y: 12,
		},
		minHeight: 600,
		minWidth: 500,
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
		height: windowState.height,
	});

	windowState.manage(mainWindow);

	mainWindow.once('ready-to-show', () => {
		mainWindow.show();
		mainWindow.focus();
	});

	mainWindow.on('close', () => {
		windowState.saveState(mainWindow);
	});

	return mainWindow;
}

contextMenu({
	showLookUpSelection: false,
	showSearchWithGoogle: false,
	showCopyImage: false,
	prepend: (defaultActions, params, browserWindow) => [
		{
			label: 'Make App 💻',
		},
	],
});

function loadVite(port) {
	mainWindow.loadURL(`http://localhost:${port}`).catch((e) => {
		console.log('Error loading URL, retrying', e);
		setTimeout(() => {
			loadVite(port);
		}, 200);
	});
}

function createMainWindow() {
	mainWindow = createWindow();
	mainWindow.once('close', () => { mainWindow = null });

	if (dev) loadVite(port);
	else serveURL(mainWindow);
}


function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

//Create misc.db
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)

const fileBoards = join(userDataDir, 'boards.db')
const adapterBoards = new JSONFile(fileBoards)
const dbBoards = new Low(adapterBoards)

let js_wallet;
let c = false;
if (fs.existsSync(userDataDir + '/boards.wallet')) {
	// We have found a boards wallet file
	c = 'o';
} else {
	c = 'c';
}
let syncing = true;


let start_js_wallet = async () => {
	/* Initialise our blockchain cache api. Can use a public node or local node
       with `const daemon = new WB.Daemon('127.0.0.1', 11898);` */

	if (c === 'c') {

		let height = 2;

		try {
			let re = await fetch('http://' + node + ':' + ports + '/getinfo');

			height = await re.json();

		} catch (err) {

		}

		const newWallet = await WB.WalletBackend.createWallet(daemon);

		js_wallet = newWallet;
	} else if (c === 'o') {
		/* Open wallet, giving our wallet path and password */
		const [openedWallet, error] = await WB.WalletBackend.openWalletFromFile(daemon, userDataDir + '/boards.wallet', 'hunter2');
		if (error) {
			console.log('Failed to open wallet: ' + error.toString());
			return;
		}

		js_wallet = openedWallet;

	} else {
		console.log('Bad input');
		return;
	}

	js_wallet.enableAutoOptimization(false);

	/* Enable debug logging to the console */


	/* Start wallet sync process */
	await js_wallet.start();



	js_wallet.on('incomingtx', (transaction) => {

		console.log(`Incoming transaction of ${transaction.totalAmount()} received!`);

		// if (!syncing) {
		mainWindow.webContents.send('new-message', transaction.toJSON());
		// }

	});

	let i = 1;

	for (const address of js_wallet.getAddresses()) {
		console.log(`Address [${i}]: ${address}`);
		i++;
	}

	i = 1;

	let boards_addresses = [];

	for (const address of js_wallet.getAddresses()) {
		const [publicSpendKey, privateSpendKey, err] = await js_wallet.getSpendKeys(address);
		boards_addresses[boards_addresses.length] = [address, publicSpendKey];
		console.log(`Address [${i}]: ${address}`);
		i++;
	}

	global.boards_addresses = boards_addresses;

	console.log('Started wallet');

	while(true) {
		await sleep(1000 * 20);
		await backgroundSyncMessages()
		/* Save the wallet to disk */
		js_wallet.saveWalletToFile(userDataDir + '/boards.wallet', 'hunter2');
		const [walletBlockCount, localDaemonBlockCount, networkBlockCount] =
			await js_wallet.getSyncStatus();
		if((localDaemonBlockCount - walletBlockCount) < 2  ) {
			// Diff between wallet height and node height is 1 or 0, we are synced
			mainWindow.webContents.send('synced');
			console.log('walletBlockCount',walletBlockCount);
			console.log('localDaemonBlockCount', localDaemonBlockCount);
			console.log('networkBlockCount', networkBlockCount);
			syncing = false;
		} else {
			if ((localDaemonBlockCount - walletBlockCount) > 19000 ) {
				console.log('rewinding forward');
				js_wallet.rewind(networkBlockCount - 9000);
				await sleep(3000 * 10);
			}
		}
		//Save height to misc.db
		db.data = { walletBlockCount, localDaemonBlockCount, networkBlockCount }
		await db.write(db.data)
	}
	console.log('Save wallet to file');
}
start_js_wallet();



function fromHex(hex,str){
	try{
		str = decodeURIComponent(hex.replace(/(..)/g,'%$1'))
	}
	catch(e){
		str = hex
		// console.log('invalid hex input: ' + hex)
	}
	return str
}


function trimExtra (extra) {

	try {
		let payload = fromHex(extra.substring(66));

		let payload_json = JSON.parse(payload);
		return fromHex(extra.substring(66))
	}catch (e) {
		return fromHex(Buffer.from(extra.substring(78)).toString())
	}
}

let known_pool_txs = [];

async function backgroundSyncMessages() {

	console.log('Background syncing...');
	let message_was_unknown;

	let json = await fetch('http://' + 'explorer.kryptokrona.se:20001' + '/get_pool_changes_lite', {
		method: 'POST',
		body: JSON.stringify({
			knownTxsIds: known_pool_txs
		})
	})

	json = await json.json();

	console.log(json);

	json = JSON.stringify(json).replaceAll('.txPrefix', '').replaceAll('transactionPrefixInfo.txHash', 'transactionPrefixInfotxHash');

	console.log('doc', json);

	json = JSON.parse(json);

	// known_pool_txs = $(known_pool_txs).not(json.deletedTxsIds).get();

	let transactions = json.addedTxs;

	dbBoards.data = dbBoards.data || { messages: [] }

	for (transaction in transactions) {

		try {
			let thisExtra = transactions[transaction].transactionPrefixInfo.extra;
			let thisHash = transactions[transaction].transactionPrefixInfotxHash;
			let extra = trimExtra(thisExtra);
			console.log(extra)
			dbBoards.data.messages.push(extra);
			console.log(dbBoards.data)
			await dbBoards.write(dbBoards.data);

			if (known_pool_txs.indexOf(thisHash) === -1) {
				known_pool_txs.push(thisHash);
				message_was_unknown = true;
			} else {
				message_was_unknown = false;
				console.log("This transaction is already known", thisHash);
				continue;
			}
		}catch(err){
			console.log(err)
		}
	}
}

app.once('ready', createMainWindow);
app.on('activate', () => {
	if (!mainWindow) {
		createMainWindow();
	}
});
app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

ipcMain.on('password',  (event, password) => {
	//GÖR NÅTT MED PASS
	console.log(password)
	return mainWindow.webContents.send('password', `password is ${password}`);
})