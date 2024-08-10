const nacl = require('tweetnacl')
const sanitizeHtml = require('sanitize-html')
const { Crypto, Keys } = require('kryptokrona-utils')
const {ipcMain, dialog} = require('electron')
const crypto = new Crypto()
const {createReadStream} = require("fs");


ipcMain.handle('load-file', async (e, path, size) => {
    return await load_file(path, size)
})

ipcMain.handle('select-directory', () => {
    let dir = dialog.showOpenDialog({
        properties: ['openDirectory']

    });
    return dir;
});

//Check if it is an image or video with allowed type
function checkImageOrVideoType(path, size) {
    if (path === undefined) return false
    if (size >= 50000000) return false
    const types = ['.png','.jpg','.gif', '.jpeg', '.mp4', '.webm', '.avi', '.webp', '.mov','.wmv', '.mkv', '.mpeg'];
    for (a in types) {
        if (path.toLowerCase().endsWith(types[a])) {
            return true
        }
    }
    return false
}

async function load_file(path, size) {
    let imgArray = []
    if (checkImageOrVideoType(path, size)) {
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

const hexToUint = (hexString) =>
    new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

function randomKey() {
    return Buffer.from(nacl.randomBytes(32)).toString('hex')
}

async function hash(text) {
    return await crypto.cn_fast_hash(toHex(text))
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


function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

function parse_call(msg, sender, sent, group = false, timestamp) {
    const {expand_sdp_answer} = require("./sdp.cjs")

    switch (msg.substring(0, 1)) {
        case 'Δ':
        // Fall through
        case 'Λ':
            // Call offer
            return [`${msg.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`, {msg, sender, group, timestamp}, true, sent]
            break
        case 'δ':
        // Fall through
        case 'λ':
            // Answer
            if (sent) return ['Call answered', {}, false, false ]
                let callback = JSON.stringify(expand_sdp_answer(msg))
                let callerdata = {
                    data: callback,
                    chat: sender,
                }
            return ['Call answered', callerdata, true, sent]

            break
        default:
            return [msg, false, false, false]
    }
}

function parse_torrent(m) {
    if (m.startsWith('TORRENT://')) {
        const link = m.split('TORRENT://')[1]
        try {
            const torrent = link.replaceAll(/&amp;/g, "&")
            const fileName = torrent.split('&dn=').pop().split('&tr=')[0];
            const infoHash = torrent.split('?xt=urn:btih:').pop().split('&dn=')[0]
            console.log("Got torrent!", torrent)
            console.log('Got filename', fileName)
            console.log("Got hash!", infoHash)
            if (!torrent || !fileName || !infoHash) return [true, false]
            if (infoHash.length > 64) return [true, false]
            return [true, true, torrent, fileName, infoHash]
        }catch (e) {
            return [true, false]
        }
    }
    return [false, false]
}

const sanitize_join_swarm_data = (data) => {

    const address = sanitizeHtml(data.address)
    // if (address.length !== 99) return false
    const message = sanitizeHtml(data.message)
    if (message.length > 64) return false 
    const signature = sanitizeHtml(data.signature)
    if (signature.length > 128) return false
    const topic = sanitizeHtml(data.topic)
    if (topic.length !== 64) return false
    const name = sanitizeHtml(data.name) 
    if (name.length > 50) return false
    let voice = data.voice
    if (typeof voice !== 'boolean') return false
    const joined = data.joined
    if (typeof joined !== 'boolean') return false
    const video = data.video
    if (typeof video !== 'boolean') return false
    const time = sanitizeHtml(data.time) 
    if (typeof time !== 'string') return false
    if (time.length > 50) return false

    const channels = []
    
    // if (data.channels.length) {
    //     //Disable channels
        
    //     // if (data.channels.length > 100) return false
    //     // for (const a of data.channels) {
    //     //     let channel = sanitizeHtml(a)
    //     //     if (channel.length > 50) return false
    //     //     channels.push(channel)
    //     // }
    //     return false
    // }

    const clean_object = {
        address: address,
        message: message,
        signature: signature,
        topic: topic,
        name: name,
        voice: voice,
        joined: joined,
        channels: channels,
        video: video,
        time: time
    }

    return clean_object
}

const sanitize_voice_status_data = (data) => {

    const address = sanitizeHtml(data.address)
    // if (address.length !== 99) return false
    const message = sanitizeHtml(data.message)
    if (message.length > 64) return false 
    const signature = sanitizeHtml(data.signature)
    // if (signature.length !== 128) return false
    const topic = sanitizeHtml(data.topic)
    if (topic.length !== 64) return false
    const name = sanitizeHtml(data.name) 
    if (name.length > 50) return false
    const voice = data.voice
    if (typeof voice !== 'boolean') return false
    const video = data.video
    if (typeof video !== 'boolean') return false

    const clean_object = {
        address: address,
        message: message,
        signature: signature,
        topic: topic,
        name: name,
        voice: voice,
        video: video
    }

    return clean_object
}

const sanitize_pm_message = (msg) => {
    let sent = msg.sent
    let addr = sanitizeHtml(msg.from)
    let timestamp = sanitizeHtml(msg.t)
    let key = sanitizeHtml(msg.k)
    let message = sanitizeHtml(msg.msg)
    if (message.length > 777) return [false]
    if (addr.length > 99) return [false]
    if (typeof sent !== 'boolean') return [false]
    if (timestamp.length > 25) return f[false]
    if (key.length > 64) return [false]
    if (message.length > 777) return [false]

    return [message, addr, key, timestamp, sent]
}

const sanitize_file_message = (data) => {
    console.log("sanitize", data)
     //Check standard message
    const fileName = sanitizeHtml(data?.fileName)
    if (typeof data?.fileName !== "string" || fileName.length > 100) return false

    const address = sanitizeHtml(data?.address)
    if (typeof data?.address !== "string" || address.length > 99) return false
  
    const topic = sanitizeHtml(data?.topic)
    if (typeof data?.topic !== "string" || topic.length > 64) return false

    const type = sanitizeHtml(data?.type)
    if (typeof data?.type !== "string" || type.length > 25) return false
 
    const info = sanitizeHtml(data?.info)
    if (typeof data?.info !== "string" || info.length > 25) return false

    const size = sanitizeHtml(data?.size)
    if (size.length > 20) return false

    const time = sanitizeHtml(data?.time)
    if (time.length > 25) return false
    
    //Check optional
    const key = sanitizeHtml(data?.key)
    if (data?.key !== undefined) {
        if (typeof data?.key !== "string" || key.length > 64) return false
    }
    const hash = sanitizeHtml(data?.hash)
    if (data?.hash !== undefined) {
        console.log("Hash not undefined", hash, data.hash)
        if (typeof hash !== "string" || hash.length > 64) return false
    }
    
    if (typeof data?.file === "boolean") return false


    const object = {
        fileName,
        address,
        topic,
        info,
        type,
        size,
        time,
        hash,
        key: key
    }

    return object
}

const sanitize_group_message = (msg) => {
    let timestamp = sanitizeHtml(msg.t);
    if (timestamp.length > 20) return false;
    let group = sanitizeHtml(msg.g);
    if (group.length > 128) return false;
    let text = sanitizeHtml(msg.m);
    if (text.length === 0) return false
    if (text.length > 777) return false;
    let addr = sanitizeHtml(msg.k);
    // if (addr.length > 99) return false;
    let reply = sanitizeHtml(msg.r);
    if (reply.length > 64) return false;
    let sig = sanitizeHtml(msg.s);
    if (sig.length > 200) return false;
    let nick = sanitizeHtml(msg.n);
    if (nick.length > 50) return false;
    let txHash = sanitizeHtml(msg.hash);
    if (txHash.length > 64) return false;
  
    const clean_object = {
      message: text,
      address: addr,
      signature: '',
      group: group,
      time: timestamp,
      name: nick,
      reply: reply,
      hash: txHash,
      sent: false,
      channel: '',
      hash: txHash,
    };
  
    return clean_object;
  };

 

module.exports = {sleep, trimExtra, fromHex, nonceFromTimestamp, randomKey, hexToUint, toHex, parse_call, parse_torrent, sanitize_join_swarm_data, sanitize_voice_status_data, hash, sanitize_pm_message, sanitize_file_message, sanitize_group_message}
