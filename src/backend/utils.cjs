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
    const types = ['.png','.jpg','.gif', '.jpeg', '.jfif', '.mp4', '.webm', '.avi', '.webp', '.mov','.wmv', '.mkv', '.mpeg'];
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
        return new Promise((resolve, reject) => {
            try {
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
            } catch {
                return "File not found"
            }
        })
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

function check_hash(hash) {
    if (typeof hash !== 'string' || hash.length !== 64) return false
    return true
}

const sanitize_pm_message = (msg) => {
    let sent = msg.sent
    let addr = msg.sent ? sanitizeHtml(msg.chat) : sanitizeHtml(msg.from)
    let timestamp = sanitizeHtml(msg.t)
    let key = sanitizeHtml(msg.k)
    let message = sanitizeHtml(msg.msg)
    if (message?.length > 777 || msg.msg === undefined) return [false]
    if (addr?.length > 99 || addr === undefined) return [false]
    if (typeof sent !== 'boolean') return [false]
    if (timestamp?.length > 25) return [false]
    if (key?.length > 64) return [false]

    return [message, addr, key, timestamp, sent]
}

const sanitize_join_swarm_data = (data) => {
    if (data?.address.length > 99 || data.address === undefined) return false;
    const address = sanitizeHtml(data.address);
    if (data?.message.length > 128 || data.message === undefined) return false;
    const message = sanitizeHtml(data.message);
    if (data?.signature.length > 128 || data.signature === undefined) return false;
    const signature = sanitizeHtml(data.signature);
    if (data?.topic.length !== 64 || data.topic === undefined) return false;
    const topic = sanitizeHtml(data.topic);
    if (data?.name.length > 50 || data.name === undefined) return false;
    const name = sanitizeHtml(data.name);
    if (data?.time.length > 50 || data.time === undefined) return false;
    const time = sanitizeHtml(data.time);
  
    if (data.voice === undefined) return false;
    if (typeof data.voice !== 'boolean') return false;
    const voice = data.voice;
    if (typeof data.joined !== 'boolean') return false;
    const joined = data.joined;
    if (typeof data.video !== 'boolean') return false;
    const video = data.video;
  
    const idSig = data.idSig;
    if (typeof idSig !== 'string' || idSig.length > 128) return false;
    const audioMute = data?.audioMute;
    if (typeof audioMute !== 'boolean') return false;
    const videoMute = data?.videoMute;
    if (typeof videoMute !== 'boolean') return false;
    const screenshare = data?.screenshare;
    if (typeof screenshare !== 'boolean') return false;
    // if (typeof data?.avatar !== 'string') return false
    let avatar = ""
    if (data.avatar !== undefined || data.avatar?.length > 0) {
        avatar = Buffer.from(data.avatar, 'base64')
        if (avatar.length > 200000) {
        console.log("Avatar too big")
        return false
        } 
    }
  
    const channels = [];
  
    const clean_object = {
      address: address,
      avatar: avatar,
      message: message,
      signature: signature,
      topic: topic,
      name: name,
      voice: voice,
      joined: joined,
      channels: channels,
      video: video,
      time: time,
      idSig,
      audioMute,
      videoMute,
      screenshare
    };
  
    return clean_object;
  };
  
  const sanitize_group_message = (data, sent = false) => {
    let timestamp = sanitizeHtml(data.t);
    if (parseInt(timestamp) > Date.now()) timestamp = Date.now();
    if (timestamp?.length > 20 || data.t === undefined) return false;
    let room = sanitizeHtml(data.g);
    if (room?.length > 128 || data.g === undefined) return false;
    let text = sanitizeHtml(data.m);
    if (text?.length > 777 || data.m === undefined) return false;
    let addr = sanitizeHtml(data.k);
    if (addr?.length > 128 || data.k === undefined) return false;
    if (data.r === undefined) {
        data.r = ""
    }
    let reply = sanitizeHtml(data.r);
    if (reply?.length > 64) return false;
    let sig = sanitizeHtml(data.s);
    if (sig?.length > 200) return false;
    let nick = sanitizeHtml(data.n);
    if (nick?.length > 50 || data.n === undefined) return false;
    let txHash = sanitizeHtml(data.hash);
    if (txHash?.length > 128 || data.hash === undefined) return false;

    let tip = false;
    if (data.tip) {
        if (typeof data.tip.amount !== 'number' || data.tip.amount?.length > 100) return false;
        if (typeof data.tip.receiver !== 'string' || data.tip.receiver?.length > 100) return false;
        tip = {amount: data.tip.amount, receiver: sanitizeHtml(data.tip.receiver)}
    }
  
    const clean_object = {
      message: text,
      address: addr,
      signature: sig,
      group: room,
      time: timestamp,
      name: nick,
      reply: reply,
      hash: txHash,
      sent: sent,
      channel: 'channel',
      hash: txHash,
      tip
    };
  
    return clean_object;
  };
  
  const sanitize_voice_status_data = (data) => {
    const address = sanitizeHtml(data?.address);
    if (address?.length > 99 || data?.address === undefined) return false;
    const message = sanitizeHtml(data?.message);
    if (message?.length > 64 || data?.message === undefined) return false;
    const signature = sanitizeHtml(data?.signature);
    if (signature?.length > 128 || data?.signature === undefined) return false;
    const topic = sanitizeHtml(data?.topic);
    if (topic?.length !== 64 || data?.topic === undefined) return false;
    const name = sanitizeHtml(data?.name);
    if (name?.length > 50 || data?.name === undefined) return false;
    const voice = data?.voice;
    if (typeof voice !== 'boolean') return false;
    const video = data?.video;
    if (typeof video !== 'boolean') return false;
   
    const audioMute = data?.audioMute;
    if (typeof audioMute !== 'boolean') return false;
    const videoMute = data?.videoMute;
    if (typeof videoMute !== 'boolean') return false;
    const screenshare = data?.screenshare;
    if (typeof screenshare !== 'boolean') return false;

    let avatar = ""
    if (data.avatar !== undefined || data.avatar?.length > 0) {
        const base64 = /^[A-Za-z0-9+/]+={0,2}$/;
        if (!base64.test(data.avatar)) {
            return false
        }
        avatar = Buffer.from(sanitizeHtml(data.avatar), 'base64')
        if (avatar.length > 200000) {
        console.log("Avatar too big")
        return false
        } 
    }
  
    const clean_object = {
      address,
      avatar,
      message,
      signature,
      topic,
      name,
      voice,
      video,
      videoMute,
      audioMute,
      screenshare
    };
  
    return clean_object;
  };
  
  const sanitize_file_message = (data) => {
    //Check standard message
    const fileName = sanitizeHtml(data?.fileName);
    if (typeof data?.fileName !== 'string' || fileName.length > 100) return false;
  
    const address = sanitizeHtml(data?.address);
    if (typeof data?.address !== 'string' || address.length > 99) return false;
  
    const topic = sanitizeHtml(data?.topic);
    if (typeof data?.topic !== 'string' || topic.length > 64) return false;
  
    const type = sanitizeHtml(data?.type);
    if (typeof data?.type !== 'string' || type.length > 25) return false;
  
    const info = sanitizeHtml(data?.info);
    if (typeof data?.info !== 'string' || info.length > 25) return false;
  
    const size = sanitizeHtml(data?.size);
    if (size?.length > 20) return false;
  
    const time = sanitizeHtml(data?.time);
    if (time?.length > 25) return false;
  
    const sig = sanitizeHtml(data?.sig);
    if (size?.length > 128) return false;
  
    //Check optional
    const key = sanitizeHtml(data?.key);
    if (data?.key !== undefined) {
      if (typeof data?.key !== 'string' || key.length > 128) return false;
    }
    const hash = sanitizeHtml(data?.hash);
    if (data?.hash !== undefined) {
      if (typeof hash !== 'string' || hash.length > 64) return false;
    }
  
    if (typeof data?.file === 'boolean') return false;
  
    const object = {
      fileName,
      address,
      topic,
      info,
      type,
      size,
      time: parseInt(time),
      hash,
      key: key,
      sig,
    };
  
    return object;
  };

 

module.exports = {sleep, check_hash, trimExtra, fromHex, nonceFromTimestamp, randomKey, hexToUint, toHex, parse_call, sanitize_join_swarm_data, sanitize_voice_status_data, hash, sanitize_pm_message, sanitize_file_message, sanitize_group_message}
