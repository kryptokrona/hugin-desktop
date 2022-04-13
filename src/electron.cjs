const windowStateManager = require('electron-window-state');
const contextMenu = require('electron-context-menu');
const {app, BrowserWindow, ipcMain, ipcRenderer} = require('electron');
const serve = require('electron-serve');
const path = require('path');
const {join} = require('path')
const {JSONFile, Low} = require("@commonify/lowdb");
const fs = require('fs')
const WB = require("kryptokrona-wallet-backend-js");
const {default: fetch} = require("electron-fetch");
const nacl = require('tweetnacl')
const naclUtil = require('tweetnacl-util')
const naclSealed = require('tweetnacl-sealed-box')
const {extraDataToMessage} = require('hugin-crypto')
const wrtc = require('@koush/wrtc')
// const { startCall, answerCall, endCall, parseCall  } = import('./lib/utils/hugin-calls.js');

const en = require ('int-encoder');

const { Address,
    AddressPrefix,
    Block,
    BlockTemplate,
    Crypto,
    CryptoNote,
    LevinPacket,
    Transaction} = require('kryptokrona-utils')


const xkrUtils = new CryptoNote()
const hexToUint = hexString => new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

function getXKRKeypair() {
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys();
    return {privateSpendKey: privateSpendKey, privateViewKey: privateViewKey};
}

function getKeyPair() {
    // return new Promise((resolve) => setTimeout(resolve, ms));
    const [privateSpendKey, privateViewKey] = js_wallet.getPrimaryAddressPrivateKeys();
    let secretKey = naclUtil.decodeUTF8(privateSpendKey.substring(1, 33));
    let keyPair = nacl.box.keyPair.fromSecretKey(secretKey);
    return keyPair;
}

function getMsgKey() {

    const naclPubKey = getKeyPair().publicKey
    return  Buffer.from(naclPubKey).toString('hex');
}

function toHex(str,hex){
    try{
        hex = unescape(encodeURIComponent(str))
            .split('').map(function(v){
                return v.charCodeAt(0).toString(16)
            }).join('')
    }
    catch(e){
        hex = str
        //console.log('invalid text input: ' + str)
    }
    return hex
}



function nonceFromTimestamp(tmstmp) {

    let nonce = hexToUint(String(tmstmp));

    while ( nonce.length < nacl.box.nonceLength ) {

        let tmp_nonce = Array.from(nonce);

        tmp_nonce.push(0);

        nonce = Uint8Array.from(tmp_nonce);

    }

    return nonce;
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
        let payload = fromHex(extra.substring(66));

        let payload_json = JSON.parse(payload);
        return fromHex(extra.substring(66))
    } catch (e) {
        return fromHex(Buffer.from(extra.substring(78)).toString())
    }
}

try {
    require('electron-reloader')(module);
} catch (e) {
    console.error(e);
}

const serveURL = serve({directory: "."});
const port = process.env.PORT || 3000;
const dev = !app.isPackaged;
let mainWindow;

function createWindow() {
    let windowState = windowStateManager({
        defaultWidth: 1100,
        defaultHeight: 700,
    });

    const mainWindow = new BrowserWindow({
        backgroundColor: '#202020',
        titleBarStyle: 'hidden',
        autoHideMenuBar: true,
        trafficLightPosition: {
            x: 17,
            y: 12,
        },
        minHeight: 600,
        minWidth: 800,
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
        mainWindow.webContents.openDevTools()
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
    mainWindow.once('close', () => {
        mainWindow = null
    });

    if (dev) loadVite(port);
    else serveURL(mainWindow);
}


app.on('ready', createMainWindow)
app.on('activate', () => {
    if (!mainWindow) {
        createMainWindow();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});



function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

let userDataDir = app.getPath('userData');

let node = 'blocksum.org'
let ports = 11898
const daemon = new WB.Daemon(node, ports);

//Create misc.db
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)

//Create boards.db
const fileBoards = join(userDataDir, 'boards.db')
const adapterBoards = new JSONFile(fileBoards)
const dbBoards = new Low(adapterBoards)

//Create messages.db
const fileMessages = join(userDataDir, 'messages.db')
const adapterMessages= new JSONFile(fileMessages)
const dbMessages = new Low(adapterMessages)

let js_wallet;
let c = false;

if (fs.existsSync(userDataDir + '/mywallet.wallet')) {
    // We have found a wallet file
    ipcMain.on('app', (data) => {
        mainWindow.webContents.send('getPath', userDataDir)
        return mainWindow.webContents.send('wallet-exist', true);
    })
    c = 'o';
    start_js_wallet();
    console.log(c)
} else {

    console.log('wallet not found')
    c = 'c';
}

let syncing = true;

let myPassword;

ipcMain.on('create-account', async (event, password) => {
    myPassword = password
    const newWallet = await WB.WalletBackend.createWallet(daemon);
    newWallet.saveWalletToFile(userDataDir + '/mywallet.wallet', myPassword)
    js_wallet = newWallet
    console.log(password)
    await start_js_wallet();
})

async function start_js_wallet() {
    /* Initialise our blockchain cache api. Can use a public node or local node
       with `const daemon = new WB.Daemon('127.0.0.1', 11898);` */

    if (c === 'c') {

        let height = 1022500;

        try {
            let re = await fetch('http://' + node + ':' + ports + '/getinfo');

            height = await re.json();

        } catch (err) {

        }

    } else if (c === 'o') {
        /* Open wallet, giving our wallet path and password */
        const [openedWallet, error] = await WB.WalletBackend.openWalletFromFile(daemon, userDataDir + '/mywallet.wallet', 'aaa');
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
        let msgKey = getMsgKey()
        console.log('HuginAddress',address + msgKey)
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

    console.log('Started wallet');

    while (true) {
        await sleep(1000 * 20);
        await backgroundSyncMessages()
        /* Save the wallet to disk */
        js_wallet.saveWalletToFile(userDataDir + '/boards.wallet', 'aaa');
        const [walletBlockCount, localDaemonBlockCount, networkBlockCount] =
            await js_wallet.getSyncStatus();
        if ((localDaemonBlockCount - walletBlockCount) < 2) {
            // Diff between wallet height and node height is 1 or 0, we are synced
            mainWindow.webContents.send('sync', 'synced');
            console.log('walletBlockCount', walletBlockCount);
            console.log('localDaemonBlockCount', localDaemonBlockCount);
            console.log('networkBlockCount', networkBlockCount);
            syncing = false;
        } else {
            if ((localDaemonBlockCount - walletBlockCount) > 19000) {
                console.log('rewinding forward');
                js_wallet.rewind(networkBlockCount - 9000);
                await sleep(3000 * 10);
            }
        }
        //Save height to misc.db
        db.data = {walletBlockCount, localDaemonBlockCount, networkBlockCount}
        await db.write(db.data)
        console.log( await js_wallet.getBalance())

    }
    console.log('Save wallet to file');
}



let known_pool_txs = [];
let known_keys = [
    '23bca14514952399f6bb1f5052f6a680e3248210f2e5c92498f2c8b47c8f5b34',
    '21863496282548462aaf47bc93d2be46ec8eff1f053f47b77f96d9e69d1fd133',
    '641d345f2da0cc77bbc8a32d766cc57a53e2723da01c972b4930eccce1f4fb75',
    '55544c5abf01f4ea13b15223d24d68fc35d1a33b480ee24b4530cb3011227d56',
    'c01f004798701d6ab148ed1bec614634c0560ae6b1cd90a253beb7971a94da0d',
    'ca6ecad317b5c4913ad77a71c94af75b8f56d179febc939b6c78be6d2fa76b2e',
    '1b0034a4745a5e49224a93eec14cd95460690ef401d762e3b1fe1eb25d68343e',
    '8ef256b7f2387644617f6a8fcee21aff7f9772cb334a85aae5b5c4fd7b7ddc7c'
];
console.log('known_keys', known_keys)

async function backgroundSyncMessages() {

    console.log('Background syncing...');
    mainWindow.webContents.send('sync', 'syncing');
    let message_was_unknown;
    let dec_message;
    try {
        const resp = await fetch('http://' + 'blocksum.org:11898' + '/get_pool_changes_lite', {
            method: 'POST',
            body: JSON.stringify({
                knownTxsIds: known_pool_txs
            })
        })

        let json = await resp.json();

        dbBoards.data = dbBoards.data || {messages: []}
        dbMessages.data = dbMessages.data || {messages: []}

        json = JSON.stringify(json).replaceAll('.txPrefix', '').replaceAll('transactionPrefixInfo.txHash', 'transactionPrefixInfotxHash');

        json = JSON.parse(json);

        let transactions = json.addedTxs;
        let transaction;

        for (transaction in transactions) {

            try {
                console.log('tx', transactions[transaction].transactionPrefixInfo);
                let thisExtra = transactions[transaction].transactionPrefixInfo.extra;
                let thisHash = transactions[transaction].transactionPrefixInfotxHash;

                if (known_pool_txs.indexOf(thisHash) === -1) {
                    known_pool_txs.push(thisHash);
                    message_was_unknown = true;
                } else {
                    message_was_unknown = false;
                    console.log("This transaction is already known", thisHash);
                    continue;
                }

                let message = await extraDataToMessage(thisExtra, known_keys, getXKRKeypair());
                message.sent = false

                parseCall(message.msg, message.from)

                console.log('Message?', message.msg)

                switch (message.type) {
                    case "sealedbox":
                        dbMessages.data.messages.push(message)
                        await dbMessages.write()
                        mainWindow.webContents.send('newMsg', dbMessages.data)
                        break;
                    case "box":
                        dbMessages.data.messages.push(message)
                        await dbMessages.write()
                        mainWindow.webContents.send('newMsg', dbMessages.data)
                        break;
                    default:
                        if (message) {
                            dbBoards.data.messages.push(message)
                            await dbBoards.write()
                        }
                        break;
                }
            } catch (err) {
                //console.log(err)
            }
        }
    } catch (err) {
        console.log('Sync error')
    }
}

//SWITCH NODE
ipcMain.on('switchNode', async (e, node) => {
    console.log(`Switching node to ${node}`)
    const daemon = new WB.Daemon(node.split(':')[0], parseInt(node.split(':')[1]));
    await js_wallet.swapNode(daemon);
    db.write()
});



ipcMain.on('sendMsg', (e, msg, receiver) => {
        sendMessage(msg, receiver);
        console.log(msg, receiver)
    }
)

async function sendMessage(message, receiver) {
    console.log('Want to send')
    let address = receiver.substring(0,99);
    let messageKey =  receiver.substring(99,163);
    let has_history = true;
//receiver.substring(99,163);
    if (message.length == 0) {
        return;
    }


    let my_address = await js_wallet.getPrimaryAddress();

    let my_addresses = await js_wallet.getAddresses();

    try {

        let [munlockedBalance, mlockedBalance] = await js_wallet.getBalance();
        //console.log('bal', munlockedBalance, mlockedBalance);

        if (munlockedBalance < 11 && mlockedBalance > 0) {

            log
            return;

        }
    } catch (err) {
        return;
    }

    let timestamp = Date.now();


    // **TO DO** Check whether this is the first outgoing transaction to the recipient
    // CHECK IN SVELT FROM ACTIVE CONTACT???


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
            "k": Buffer.from(getKeyPair().publicKey).toString('hex'),
            "msg": message,
            "s": signature
        };
        let payload_json_decoded = naclUtil.decodeUTF8(JSON.stringify(payload_json));
        box = new naclSealed.sealedbox(payload_json_decoded, nonceFromTimestamp(timestamp), hexToUint(messageKey));
    } else {
        //console.log('Has history, not using sealedbox');
        // Convert message data to json
        let payload_json = {"from": my_address, "msg": message};

        let payload_json_decoded = naclUtil.decodeUTF8(JSON.stringify(payload_json));


        box = nacl.box(payload_json_decoded, nonceFromTimestamp(timestamp), hexToUint(messageKey), getKeyPair().secretKey);

    }

    let payload_box = {"box": Buffer.from(box).toString('hex'), "t": timestamp};

    // let payload_box = {"box":Buffer.from(box).toString('hex'), "t":timestamp, "key":Buffer.from(getKeyPair().publicKey).toString('hex')};
    // Convert json to hex
    let payload_hex = toHex(JSON.stringify(payload_box));

    let result = await js_wallet.sendTransactionAdvanced(
        [[address, 1]], // destinations,
        3, // mixin
        {fixedFee: 7500, isFixedFee: true}, // fee
        undefined, //paymentID
        undefined, // subWalletsToTakeFrom
        undefined, // changeAddress
        true, // relayToNetwork
        false, // sneedAll
        Buffer.from(payload_hex, 'hex')
    );

    if (result.success) {
        console.log(`Sent transaction, hash ${result.transactionHash}, fee ${WB.prettyPrintAmount(result.fee)}`);
        const sentMsg = {msg: message, k: messageKey, from: address, sent: true, t: timestamp}
        dbMessages.data.messages.push(sentMsg)
        await dbMessages.write()
        mainWindow.webContents.send('newMsg', dbMessages.data)
        known_pool_txs.push(result.transactionHash)
    } else {
        console.log(`Failed to send transaction: ${result.error.toString()}`);
    }
}

ipcMain.handle('getMessages', async () => {
    await dbMessages.read()
    return dbMessages.data
})

ipcMain.handle('getBalance', async () => {
    return await js_wallet.getBalance()
})

ipcMain.handle('getAddress',  async () => {
    return js_wallet.getAddresses()

})



ipcMain.on('startCall', async (e ,contact, calltype) => {
    console.log('CALL STARTEeeeeeeeeeeeeD')

    console.log('contact', contact + calltype);
    startCall(contact, true, true)

    // }
})


ipcMain.on('answerCall', async (e, msg, contact) => {
    console.log('CALL STARTED')
    return answerCall(msg, contact)
})


ipcMain.on('endCall', async (e, peer, stream) => {
    console.log('CALL STARTED')

    return endCall(peer, stream)
})

// const { expand_sdp_offer, expand_sdp_answer } = require("./sdp.js")
const Peer = require('simple-peer')

//const wrtc = require('wrtc)')

let emitCall;
let awaiting_callback;
let active_calls = []
let callback;

function parse_sdp (sdp) {

    let ice_ufrag = '';
    let ice_pwd = '';
    let fingerprint = '';
    let ips = [];
    let ports = [];
    let ssrcs = "";
    let msid = "";
    let ip;
    let port;



    let lines = sdp.sdp.split('\n')
        .map(l => l.trim()); // split and remove trailing CR
    lines.forEach(function(line) {

        if (line.includes('a=fingerprint:') && fingerprint == '') {

            let parts = line.substr(14).split(' ');
            let hex = line.substr(22).split(':').map(function (h) {
                return parseInt(h, 16);
            });

            fingerprint = btoa(String.fromCharCode.apply(String, hex))



            console.log('BASED64', fingerprint);


        } else if (line.includes('a=ice-ufrag:') && ice_ufrag == '') {

            ice_ufrag = line.substr(12);


        } else if (line.includes('a=ice-pwd:') && ice_pwd == '') {

            ice_pwd = line.substr(10);

        } else if (line.includes('a=candidate:')) {

            let candidate = line.substr(12).split(" ");

            ip = candidate[4]
            port = candidate[5]
            type = candidate[7]



            let hexa = ip.split('.').map(function (h) {
                return h.toString(16);
            });

            let ip_hex = btoa(String.fromCharCode.apply(String, hexa))
            console.log('IP CODED', ip_hex);

            if (type == "srflx") {
                ip_hex = "!" + ip_hex
            } else {
                ip_hex = "?" + ip_hex
            }

            if (!ips.includes(ip_hex)) {
                ips = ips.concat(ip_hex)

            }

            let indexedport = port+ips.indexOf(ip_hex).toString();

            ports = ports.concat(en.encode(parseInt(indexedport)));


        } else if (line.includes('a=ssrc:')) {

            // let ssrc = en.encode(line.substr(7).split(" ")[0]);
            //
            // if (!ssrcs.includes(ssrc)) {
            //
            //     ssrcs = ssrcs.concat(ssrc)
            //
            // }


        } else if (line.includes('a=msid-semantic:')) {

            // msid = line.substr(16).split(" ")[2];
            // console.log('msid', msid);

        }



    })

    return ice_ufrag + "," + ice_pwd + "," + fingerprint + "," + ips.join('&') + "," + ports.join('&');

}


async function startCall (contact, audio, video, screenshare=false) {
    // spilt input to addr and pubkey
    let contact_address = contact.substring(0,99);
    console.log('contact address', contact_address)
    let msg;

    console.log('Starting call..');

    // $('#video-button').unbind('click');
    //
    // $('#call-button').unbind('click');
    //
    // $('#screen-button').unbind('click');

    mainWindow.webContents.send('start-call', audio, contact)
    ipcMain.on('got-media', () => {
        console.log('got MEDIA BACKKK');
        console.log('got audo BACKKK', video);
        //console.log('got contact BACKKK', contact);
        let sdp;

        let peer1 = new Peer({
            initiator: true,
            trickle: false,
            stream: stream,
            wrtc: wrtc,
            offerOptions: {offerToReceiveVideo: true, offerToReceiveAudio: true},
            sdpTransform: (sdp) => {
                return sdp;
            }
        })

        // let transceivers =  peer1._pc.getTransceivers();
        // console.log('transievers', transceivers);
        // select the desired transceiver
        //  if (video) {
        //    transceivers[1].setCodecPreferences(custom_codecs)
        // }

        let first = true;

        peer1.on('close', () => {

            console.log('Connection lost..')

            endCall(peer1, stream);

            // ENDCALL AUDIO
        })

        peer1.on('error', () => {

            console.log('Connection lost..')

            endCall(peer1, stream);
            // ENDCALL AUDIO

        })

        peer1.on('stream', stream => {
            // got remote video stream, now let's show it in a video tag
            let extra_class = "";
            if (video) {
                extra_class = " video"
            }
            // SELECT AND SHOW VIDEO ELEMENT
            let video_element = ""


            if ('srcObject' in video_element) {
                video_element.srcObject = stream
            } else {
                video_element.src = window.URL.createObjectURL(stream) // for older browsers
            }
            video_element.play()

        })

        peer1.on('connect', () => {
            // CONNECT SOUND
            // SEND WEBCONTENTS " CONNECTED "
            console.log('Connection established; with', contact)

        });


        peer1.on('signal', data => {
            try {
                //  console.log('real data:', data);
                console.log('SDP', data);
                mainWindow.webContents.send('sdp-data', data)
                let parsed_data = `${video ? "Δ" : "Λ"}` + parse_sdp(data);
                // console.log('parsed data:', parsed_data);
                let recovered_data = expand_sdp_offer(parsed_data);
                // console.log('recovered data:', recovered_data);
                // console.log('some other data:', {'type': 'offer', 'sdp': recovered_data});
                // peer1._pc.setLocalDescription(recovered_data);
                msg = parsed_data;

                console.log('PARSED MESSAGE', msg)
            } catch (err) {
                console.log('error', err)
            }

            if (!first) {
                return
            }
            sendMessage(msg, contact);

            awaiting_callback = true;

            first = false;

        })
        //Awaits msg answer with sdp from contact
        ipcMain.on('got-callback', async (e, callback, sender) => {
            console.log('callback', callback);
            console.log('from', sender);
            peer1.signal(callback);
            console.log('Connecting to ...', sender)

        })

    })
}

function parseCall (msg, sender, emitCall=true) {
    console.log('🤤🤤🤤🤤🤤🤤',sender)
    switch (msg.substring(0,1)) {
        case "Δ":
        // Fall through
        case "Λ":
            // Call offer
            if (emitCall) {

                // Start ringing sequence

                mainWindow.webContents.send('call-incoming', msg, sender)
                // Handle answer/decline here

                console.log('call incoming')
            }
            return `${msg.substring(0,1) == "Δ" ? "Video" : "Audio"} call started`;
            break;
        case "δ":
        // Fall through
        case "λ":
            // Answer
            if (emitCall) {
                callback = JSON.stringify(expand_sdp_answer(msg));
                mainWindow.webContents.send('get-callback', callback, sender)
                console.log('got sdp', msg)
                console.log('got answer expanded', callback)
            }
            return "";

            break;
        default:
            return msg;

    }

}

let stream;

function answerCall (msg, contact) {
    console.log('APPLE', msg, contact)
    let video
    let audio
    if(msg.substring(0,1) === 'Δ') {
        video = true
    } else {audio = true}
    // $('#messages_contacts').addClass('in-call');
    // $('#settings').addClass('in-call');

    // get video/voice stream
    mainWindow.webContents.send('get-media', audio ,contact)
    ipcMain.on('send-media', () => {
        console.log('Got media')

        // let video_codecs = window.RTCRtpSender.getCapabilities('video');
        //
        // let custom_codecs = [];
        //
        // for (codec in video_codecs.codecs) {
        //     let this_codec = video_codecs.codecs[codec];
        //     if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0,5) == "level") {
        //         custom_codecs.push(this_codec);
        //     }
        //
        // }
        let peer2 = new Peer({stream: stream, trickle: false, wrtc: wrtc})

        // let transceivers = peer2._pc.getTransceivers();
        //
        // // select the desired transceiver
        // if (video) {
        //     transceivers[1].setCodecPreferences(custom_codecs);
        // }

        peer2.on('close', () => {

            console.log('Connection closed..')
            endCall(peer2, stream);

        })

        peer2.on('error', () => {

            console.log('Connection lost..')

            endCall(peer2, stream);

        })

        let first = true;

        peer2.on('signal', data => {
            console.log('initial data:', data);
            let parsed_data = `${video ? 'δ' : 'λ'}` + parse_sdp(data);
            console.log('parsed data really cool sheet:', parsed_data);
            let recovered_data = expand_sdp_answer(parsed_data);
            data = recovered_data;
            console.log('recovered data:', recovered_data);
            // peer2._pc.setLocalDescription(recovered_data);
            if (!first) {
                return
            }
            console.log('Sending answer ', parsed_data);
            sendMessage(parsed_data, contact);
            first = false;

        })
        let signal = expand_sdp_offer(msg);
        peer2.signal(signal);

        peer2.on('track', (track, stream) => {
            console.log('Setting up link..', track, stream)
        })

        peer2.on('connect', () => {

            // SOUND EFFECT
            console.log('Connection established;')
            mainWindow.webContents.send('call-established')

        });

        peer2.on('stream', stream => {
            // got remote video stream, now let's show it in a video tag
            console.log('peer2 stream', stream)
            //if ('srcObject' in video) {
              //  video.srcObject = stream
            //} else {
              //  video.src = window.URL.createObjectURL(stream) // for older browsers
            //}


            console.log('Setting up link..');

        })
    })
}

function endCall (peer, stream) {
    try {
        peer.destroy();
        stream.getTracks().forEach(function(track) {
            track.stop();
        });
    } catch (e) {
        console.log('TRACKS', e)
    }

    //var myvideo = document.getElementById('myvideo');

    myvideo.srcObject = stream;
    myvideo.pause();
    myvideo.srcObject = null;

    awaiting_callback = false;

}

function expand_sdp_offer (compressed_string) {

    let type = compressed_string.substring(0,1);

    let split = compressed_string.split(",");

    console.log('split', split);

    let ice_ufrag = split[0].substring(1);

    let ice_pwd = split[1];

    let fingerprint = decode_fingerprint(split[2]);

    console.log('fingerprint', fingerprint);

    let ipss = split[3];

    console.log('IPS', ipss);

    let prts =  split[4];

    let ssrc = "";

    console.log('src', ssrc);

    let msid = "";

    console.log('msida ', msid);

    let external_ip = '';

    let external_ports = [];

    let candidates = ['','','',''];

    console.log('IPS', ipss)

    let ips = ipss.split('&').map(function (h) {
        return decode_ip(h.substring(1),h.substring(0,1));
    })

    if (ips[0] == undefined) {
        ips.splice(0, 1);
    }

    console.log('IPS SPLIT', ips);

    let ports = prts.split('&').map(function (h) {
        return en.decode(h);
    });

    let prio = 2122260223;

    let tcp_prio = 1518280447;

    let i = 1;
    let j = 1;
    let external_port_found = false;

    let current_internal = '';
    let p;
    for (p in ports) {
        try {
            console.log('port', parseInt(ports[p]));
            let prt = parseInt(ports[p])
            if (!prt) {
                console.log('nanananananaa', prt);
                continue;
            }

            let ip_index = ports[p].slice(-1);
            console.log('ip_index', ip_index);
            if (i == 1 ) {

                current_internal = ports[p].substring(0, ports[p].length - 1);

            }

            if (ips[ip_index] == undefined) {
                continue;
            }

            if (ips[ip_index].substring(0,1) == '!') {
                external_ip = ips[ip_index].substring(1);
                external_ports = external_ports.concat(ports[p].substring(0, ports[p].length - 1));
                console.log('external', external_ports);
                external_port_found = true;
                candidates[j] += "a=candidate:3098175849 1 udp 1686052607 " + ips[ip_index].replace('!','') + " " + ports[p].substring(0, ports[p].length - 1) + " typ srflx raddr " + ips[0].replace('!','').replace('?','') + " rport " + current_internal + " generation 0 network-id 1 network-cost 50\r\n"
            } else if (ports[p].substring(0, ports[p].length - 1) == "9") {

                candidates[j] += "a=candidate:3377426864 1 tcp "  + tcp_prio + " " + ips[ip_index].replace('?','') + " " + ports[p].substring(0, ports[p].length - 1) +  " typ host tcptype active generation 0 network-id 1 network-cost 50\r\n"
                tcp_prio = tcp_prio - 500;

            } else {
                candidates[j] += "a=candidate:1410536466 1 udp " + prio + " " + ips[ip_index].replace('?','') + " " + ports[p].substring(0, ports[p].length - 1) + " typ host generation 0 network-id 1 network-cost 10\r\n"
                prio = parseInt(prio*0.8);
            }


            if ( i == (ports.length / 3) ) {
                i = 0;
                j += 1;
                external_port_found = false;
            }

        } catch (err) {
            console.log('err', err);

            console.log('IPS', ips)
            continue;
        }

        i += 1;

    }

    if (external_ip.length == 0) {
        external_ip = ips[0].substring(1);
    }

    console.log(candidates);
    console.log("ports:", external_ports);

    console.log((external_ports.length / 3));
    console.log(((external_ports.length / 3)*2));

    if (!external_ports[0]) {
        external_ports[0] = "9";
    }

    let sdp = `v=0
o=- 5726742634414877819 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=extmap-allow-mixed
a=msid-semantic: WMS
m=audio ` + external_ports[0] + ` UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates[1] +
        `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=recvonly
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:63 red/48000/2
a=fmtp:63 111/111
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
a=rtpmap:102 ILBC/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:106 CN/32000
a=rtpmap:105 CN/16000
a=rtpmap:13 CN/8000
a=rtpmap:110 telephone-event/48000
a=rtpmap:112 telephone-event/32000
a=rtpmap:113 telephone-event/16000
a=rtpmap:126 telephone-event/8000
m=video ` + external_ports[(external_ports.length / 3)] +  ` UDP/TLS/RTP/SAVPF 102 104 106 108
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates[2] +
        `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
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
a=recvonly
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=rtpmap:97 rtx/90000
a=fmtp:97 apt=96
a=rtpmap:98 VP9/90000
a=rtcp-fb:98 goog-remb
a=rtcp-fb:98 transport-cc
a=rtcp-fb:98 ccm fir
a=rtcp-fb:98 nack
a=rtcp-fb:98 nack pli
a=fmtp:98 profile-id=0
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 VP9/90000
a=rtcp-fb:100 goog-remb
a=rtcp-fb:100 transport-cc
a=rtcp-fb:100 ccm fir
a=rtcp-fb:100 nack
a=rtcp-fb:100 nack pli
a=fmtp:100 profile-id=2
a=rtpmap:101 rtx/90000
a=fmtp:101 apt=100
a=rtpmap:121 VP9/90000
a=rtcp-fb:121 goog-remb
a=rtcp-fb:121 transport-cc
a=rtcp-fb:121 ccm fir
a=rtcp-fb:121 nack
a=rtcp-fb:121 nack pli
a=fmtp:121 profile-id=1
a=rtpmap:127 H264/90000
a=rtcp-fb:127 goog-remb
a=rtcp-fb:127 transport-cc
a=rtcp-fb:127 ccm fir
a=rtcp-fb:127 nack
a=rtcp-fb:127 nack pli
a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:120 rtx/90000
a=fmtp:120 apt=127
a=rtpmap:125 H264/90000
a=rtcp-fb:125 goog-remb
a=rtcp-fb:125 transport-cc
a=rtcp-fb:125 ccm fir
a=rtcp-fb:125 nack
a=rtcp-fb:125 nack pli
a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:119 rtx/90000
a=fmtp:119 apt=125
a=rtpmap:124 H264/90000
a=rtcp-fb:124 goog-remb
a=rtcp-fb:124 transport-cc
a=rtcp-fb:124 ccm fir
a=rtcp-fb:124 nack
a=rtcp-fb:124 nack pli
a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:107 rtx/90000
a=fmtp:107 apt=124
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
a=rtpmap:109 rtx/90000
a=fmtp:109 apt=108
a=rtpmap:123 H264/90000
a=rtcp-fb:123 goog-remb
a=rtcp-fb:123 transport-cc
a=rtcp-fb:123 ccm fir
a=rtcp-fb:123 nack
a=rtcp-fb:123 nack pli
a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f
a=rtpmap:118 rtx/90000
a=fmtp:118 apt=123
a=rtpmap:122 H264/90000
a=rtcp-fb:122 goog-remb
a=rtcp-fb:122 transport-cc
a=rtcp-fb:122 ccm fir
a=rtcp-fb:122 nack
a=rtcp-fb:122 nack pli
a=fmtp:122 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f
a=rtpmap:117 rtx/90000
a=fmtp:117 apt=122
a=rtpmap:35 AV1/90000
a=rtcp-fb:35 goog-remb
a=rtcp-fb:35 transport-cc
a=rtcp-fb:35 ccm fir
a=rtcp-fb:35 nack
a=rtcp-fb:35 nack pli
a=rtpmap:36 rtx/90000
a=fmtp:36 apt=35
a=rtpmap:114 red/90000
a=rtpmap:115 rtx/90000
a=fmtp:115 apt=114
a=rtpmap:116 ulpfec/90000
a=rtpmap:37 flexfec-03/90000
a=rtcp-fb:37 goog-remb
a=rtcp-fb:37 transport-cc
a=fmtp:37 repair-window=10000000
m=application ` + external_ports[((external_ports.length / 3)*2)] + ` UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 ` + external_ip +  `
` + candidates[3] +
        `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:actpass
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`

    console.log('ice', ice_ufrag)
    console.log('ice', ice_pwd)
    console.log('fingerprint', fingerprint)
    console.log('SRCS', ssrc)
    console.log('MSID', msid)
    console.log('MSID', candidates)
    return {type: "offer", sdp: sdp};

}

function expand_sdp_answer (compressed_string) {

    let split = compressed_string.split(",");

    console.log("split:", split);

    let type = compressed_string.substring(0,1);

    let ice_ufrag = split[0].substring(1);

    let ice_pwd = split[1];

    let fingerprint = decode_fingerprint(split[2]);

    let ips = split[3];

    console.log('ips1', ips)

    let prts =  split[4];

    // let ssrc = split[5].split('&').map(function (h) {
    //   return en.decode(h);
    // });
    let ssrc = "";

    // if (ssrc[1] == undefined) {
    //   ssrc[1] = ssrc[0];
    // }

    let msid = "";

    let candidates = '';

    let external_ip = '';

    ips = ips.split('&').map(function (h) {
        return decode_ip(h.substring(1),h.substring(0,1));
    })

    let ports = prts.split('&').map(function (h) {
        return en.decode(h);
    });;

    let external_port = '';

    console.log("ips:", ips);
    console.log("ports:", ports);

    let prio = 2122260223;
    let tcp_prio = 1518280447;
    if (ports.length > 1) {

        console.log('More than 1 port!');
        let p;
        for (p in ports) {
            if (ports[p] == undefined) {
                continue;
            }
            console.log('IPS', ips);

            console.log('this expand port', ports[p]);
            try {
                let ip_index = ports[p].slice(-1);

                if (ips[ip_index] == undefined) {
                    continue;
                }

                if (ips[ip_index].substring(0,1) == '!') {
                    if (external_port.length == 0) {
                        external_port = ports[p].substring(0, ports[p].length - 1);
                    }
                    external_ip = ips[ip_index].substring(1);
                    candidates += "a=candidate:3098175849 1 udp 1686052607 " + ips[ip_index].replace('!','') + " " + ports[p].substring(0, ports[p].length - 1)  + " typ srflx raddr " + ips[0].replace('?','') + " rport " + ports[0].substring(0, ports[p].length - 1)  + " generation 0 network-id 1 network-cost 50\r\n"
                } else if (ports[p].substring(0, ports[p].length - 1)  == "9") {

                    candidates += "a=candidate:3377426864 1 tcp "  + tcp_prio + " " + ips[ip_index].replace('?','').replace('!','') + " " + ports[p].substring(0, ports[p].length - 1)  +  " typ host tcptype active generation 0 network-id 1 network-cost 50\r\n"
                    tcp_prio = tcp_prio - 500;

                } else {

                    candidates += "a=candidate:1410536466 1 udp " + prio + " " + ips[ip_index].replace('?','') + " " + ports[p].substring(0, ports[p].length - 1)  + " typ host generation 0 network-id 1 network-cost 10\r\n"
                    prio = parseInt(prio*0.8);
                }

            } catch (err) {
                console.log('err', err);
                continue;
            }

        }
    } else {

        external_ip = ips[0].replace('!','').replace('?','');

        external_port = ports[0].substring(0, ports[0].length - 1) ;
        candidates = "a=candidate:1410536466 1 udp 2122260223 " + ips[0].replace('!','').replace('?','') + " " + ports[0].substring(0, ports[0].length - 1)  + " typ host generation 0 network-id 1 network-cost 10\r\n"
    }

    if (external_port == "") {
        external_port = "9";
    }

    let sdp = `v=0
o=- 8377786102162672707 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=msid-semantic: WMS
m=audio ` + external_port + ` UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates +
        `a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:active
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
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
m=video 9 UDP/TLS/RTP/SAVPF 102 104 106 108
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:active
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:12 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:11 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:9 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:5 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:6 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:102 H264/90000
a=rtcp-fb:102 goog-remb
a=rtcp-fb:102 transport-cc
a=rtcp-fb:102 ccm fir
a=rtcp-fb:102 nack
a=rtcp-fb:102 nack pli
a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:104 H264/90000
a=rtcp-fb:104 goog-remb
a=rtcp-fb:104 transport-cc
a=rtcp-fb:104 ccm fir
a=rtcp-fb:104 nack
a=rtcp-fb:104 nack pli
a=fmtp:104 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:106 H264/90000
a=rtcp-fb:106 goog-remb
a=rtcp-fb:106 transport-cc
a=rtcp-fb:106 ccm fir
a=rtcp-fb:106 nack
a=rtcp-fb:106 nack pli
a=fmtp:106 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:active
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`


    return {type: 'answer', sdp: sdp}
}


let decode_fingerprint = (fingerprint) => {
    console.log('fingerprint', fingerprint);
    let decoded_fingerprint = "";
    let piece;
    let letters = atob(fingerprint).split('')
    for (letter in letters) {
        try {

            let piece = letters[letter].charCodeAt(0).toString(16);
            console.log('del', piece);
            if (piece.length == 1) {
                piece = "0" + piece;
            }
            decoded_fingerprint += piece;



        } catch (err) {
            console.log('error', piece)
            console.log('error', letter)

            continue;
        }
    }
    console.log('almost', decoded_fingerprint) ;

    decoded_fingerprint = decoded_fingerprint.toUpperCase().replace(/(.{2})/g,"$1:").slice(0,-1);

    console.log('There', decoded_fingerprint) ;

    return decoded_fingerprint;
}

let decode_ip = (ip, type) => {
    let decoded_ip = "";
    let piece;
    let letters = atob(ip).split('')
    if (letters.length < 2) {
        console.log('RETURN', letters)
        return;
    }
    for (letter in letters) {
        try {
            let piece = letters[letter].charCodeAt(0).toString(16);
            console.log('del ip', piece);
            if (piece.length == 1) {
                piece = "0" + piece;
            }
            decoded_ip += parseInt(piece, 16) + ".";


        } catch (err) {
            console.log('error', piece)
            continue;
        }
    }
    console.log('decoded ip', decoded_ip.slice(0,-1))

    decoded_ip = decoded_ip.slice(0,-1)

    return type+decoded_ip
}
