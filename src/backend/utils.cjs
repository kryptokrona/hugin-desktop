const nacl = require('tweetnacl')
const sanitizeHtml = require('sanitize-html')
const { Crypto, Keys } = require('kryptokrona-utils')
const {ipcMain, dialog} = require('electron')
const crypto = new Crypto()
const {createReadStream} = require("fs");
const MEDIA_TYPES = [
    { file: '.png', type: 'image' },
    { file: '.jpg', type: 'image' },
    { file: '.gif', type: 'image' },
    { file: '.jfif', type: 'image' },
    { file: '.jpeg', type: 'image' },
    { file: '.webp', type: 'image' },
    { file: '.mp4', type: 'video' },
    { file: '.webm', type: 'video' },
    { file: '.avi', type: 'video' },
    { file: '.webp', type: 'video' },
    { file: '.mov', type: 'video' },
    { file: '.wmv', type: 'video' },
    { file: '.mkv', type: 'video' },
    { file: '.mpeg', type: 'video' },
    { file: '.m4a', type: 'audio' },
    { file: '.mp3', type: 'audio' },
    { file: '.wav', type: 'audio' },
  ];

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
function check_if_media(path, size, check = false) {
    if (path === undefined && !check) return [false]
    if (size >= 10000000) return [false]
        for (const a of MEDIA_TYPES) {
          if (path.toLowerCase().endsWith(a.file)) {
            return [true, a.type];
          }
        }
        return [false];
}

async function load_file(path, size) {
    let imgArray = []
    const [media, type] = check_if_media(path, size)
    if (media) {
        //Read the file as an image
        return new Promise((resolve, reject) => {
            try {
            const stream = createReadStream(path)
            
                stream.on('data', (data) => { 
                    imgArray.push(data)
                })
                stream.on('error', (data) => {
                    return ["File not found"]
                })

                stream.on('end', () => {
                    resolve([Buffer.concat(imgArray), type])
                })
            } catch {
                return ["File not found"]
            }
        })
    } else {
        return ["File"]
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
    const messages = data?.messages;
    if (!Array.isArray(data?.messages)) return false;
    
    let avatar = ""
    if (data.avatar !== undefined && data.avatar?.length > 0) {
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
      screenshare,
      messages
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
    if (data.tip && data.tip !== 'false') {
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
    if (data.avatar !== undefined && data.avatar?.length > 0) {
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
  
    const sig = sanitizeHtml(data?.signature);
    if (sig?.length > 128) return false;
  
    //Check optional
    const key = sanitizeHtml(data?.key);
    if (data?.key !== undefined) {
      if (typeof data?.key !== 'string' || key.length > 128) return false;
    }
    const hash = sanitizeHtml(data?.hash);
    if (data?.hash !== undefined) {
      if (typeof hash !== 'string' || hash.length > 64) return false;
    }

    const name = sanitizeHtml(data?.name);
    if (data?.name !== undefined) {
      if (typeof name !== 'string' || name.length > 100) return false;
    }
  
    if (typeof data?.file === 'boolean') return false;
  
    const object = {
      fileName,
      address,
      name,
      topic,
      info,
      type,
      size: parseInt(size),
      time: parseInt(time),
      hash,
      key: key,
      sig,
    };
  
    return object;
  };


  const sanitize_feed_message = (data) => {
    const address = sanitizeHtml(data?.address);
    if (address?.length > 99 || data?.address === undefined) return false;
    const message = sanitizeHtml(data?.message);
    if (message?.length > 777 || data?.message === undefined) return false;
    const signature = sanitizeHtml(data?.signature);
    if (signature?.length > 128 ) return false;
    const nickname = sanitizeHtml(data?.nickname);
    if (nickname?.length > 50 || data?.nickname === undefined) return false;
    const hash = sanitizeHtml(data.hash)
    if (typeof data.hash !== 'string' || hash.length > 64) return false;
    const timestamp = sanitizeHtml(data?.timestamp);
    if (timestamp?.length > 25) return false;
    const reply = sanitizeHtml(data.reply);
    if (reply?.length > 64) return false;

    let tip = false;
    if (data.tip && data.tip !== 'false') {
        if (typeof data.tip.amount !== 'number' || data.tip.amount?.length > 100) return false;
        if (typeof data.tip.receiver !== 'string' || data.tip.receiver?.length > 100) return false;
        tip = {amount: data.tip.amount, receiver: sanitizeHtml(data.tip.receiver)}
    }

    const clean = {
        message,
        address,
        nickname,
        signature,
        reply,
        hash,
        timestamp: parseInt(timestamp),
        tip,
    }
    return clean
  }

  const isLatin = (text) => {
    const REGEX_CHINESE =
      /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
    const isChinese = text.match(REGEX_CHINESE);
    if (isChinese) {
      return false;
    }
    const REGEX_JAPAN = /[\u3040-\u30FF\u31F0-\u31FF\uFF00-\uFFEF]/;
    const isJapanese = text.match(REGEX_JAPAN);
    if (isJapanese) {
      return false;
    }
    const REGEX_KOREA = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    const isKorean = text.match(REGEX_KOREA);
    if (isKorean) {
      return false;
    }
    return true;
  };

  const containsOnlyEmojis = (text) => {
    if (!isLatin(text)) {
      return false;
    }
    const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '');
    const visibleChars = text.replace(new RegExp('[\n\rs]+|( )+', 'g'), '');
    return onlyEmojis.length === visibleChars.length;
  };

  // Map from raw key codes (e.g., evdev or native input) to browser keyCode
const rawToBrowserKeyCode = {
  1: 27,     // Esc
  2: 49,     // 1
  3: 50,     // 2
  4: 51,     // 3
  5: 52,     // 4
  6: 53,     // 5
  7: 54,     // 6
  8: 55,     // 7
  9: 56,     // 8
  10: 57,    // 9
  11: 48,    // 0
  14: 8,     // Backspace
  15: 9,     // Tab
  16: 81,    // Q
  17: 87,    // W
  18: 69,    // E
  19: 82,    // R
  20: 84,    // T
  21: 89,    // Y
  22: 85,    // U
  23: 73,    // I
  24: 79,    // O
  25: 80,    // P
  28: 13,    // Enter
  30: 65,    // A
  31: 83,    // S
  32: 68,    // D
  33: 70,    // F
  34: 71,    // G
  35: 72,    // H
  36: 74,    // J
  37: 75,    // K
  38: 76,    // L
  44: 90,    // Z
  45: 88,    // X
  46: 67,    // C
  47: 86,    // V
  48: 66,    // B
  49: 78,    // N
  50: 77,    // M
  57: 32,    // Space
  58: 20,    // Caps Lock
  59: 112,   // F1
  60: 113,   // F2
  61: 114,   // F3
  62: 115,   // F4
  63: 116,   // F5
  64: 117,   // F6
  65: 118,   // F7
  66: 119,   // F8
  67: 120,   // F9
  68: 121,   // F10
};

// Convert raw code to browser keyCode
function toBrowbroserKey(rawCode) {
  return rawToBrowserKeyCode[rawCode] || 0; // 0 = unknown
}

 

module.exports = {isLatin, toBrowbroserKey, containsOnlyEmojis, sleep, check_hash, trimExtra, fromHex, nonceFromTimestamp, randomKey, hexToUint, toHex, sanitize_join_swarm_data,sanitize_feed_message, sanitize_voice_status_data, hash, sanitize_pm_message, sanitize_file_message, sanitize_group_message, check_if_media, MEDIA_TYPES}
