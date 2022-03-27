import {join} from "path";
import {JSONFile, Low} from "@commonify/lowdb";
import fs from "fs";
import {app, ipcMain, ipcRenderer} from "electron";
import WB from "kryptokrona-wallet-backend-js";
import {default as fetch} from "electron-fetch";

let userDataDir = app.getPath('userData');

let node = 'explorer.kryptokrona.se'
let ports = 20001
const daemon = new WB.Daemon(node, ports);

//Create misc.db
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)

//Create boards.db
const fileBoards = join(userDataDir, 'boards.db')
const adapterBoards = new JSONFile(fileBoards)
const dbBoards = new Low(adapterBoards)

let js_wallet;
let c = false;
if (fs.existsSync(userDataDir + '/mywallet.wallet')) {
    // We have found a boards wallet file
    start_js_wallet();
    ipcRenderer.send('account-exist', true)
    c = 'o';
} else {

    c = 'c';
}
let syncing = true;

let myPassword;

ipcMain.on('create-account',  async (event, password, walletName) => {
    myPassword = password
    const newWallet = await WB.WalletBackend.createWallet(daemon);
    newWallet.saveWalletToFile(userDataDir + '/' + walletName, myPassword)
    console.log(password)
    start_js_wallet();
})

async function start_js_wallet() {
    /* Initialise our blockchain cache api. Can use a public node or local node
       with `const daemon = new WB.Daemon('127.0.0.1', 11898);` */

    if (c === 'c') {

        let height = 2;

        try {
            let re = await fetch('http://' + node + ':' + ports + '/getinfo');

            height = await re.json();

        } catch (err) {

        }

    } else if (c === 'o') {
        /* Open wallet, giving our wallet path and password */
        const [openedWallet, error] = await WB.WalletBackend.openWalletFromFile(daemon, userDataDir + '/mywallet.wallet', 'hunter2');
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