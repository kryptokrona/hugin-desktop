const nacl = require('tweetnacl')
const sanitizeHtml = require('sanitize-html')
const { Crypto } = require('kryptokrona-utils')

const crypto = new Crypto()
const hexToUint = (hexString) =>
    new Uint8Array(hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)))

async function createGroup() {
    return await Buffer.from(nacl.randomBytes(32)).toString('hex')
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

function parseCall(msg, sender, sent, group = false, timestamp) {
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

const sanitize_join_swarm_data = (data) => {

    const address = sanitizeHtml(data.address)
    if (address.length !== 99) return false
    const message = sanitizeHtml(data.message)
    if (message.length > 20) return false 
    const signature = sanitizeHtml(data.signature)
    if (signature.length !== 128) return false
    const topic = sanitizeHtml(data.topic)
    if (topic.length !== 64) return false
    const name = sanitizeHtml(data.name) 
    if (name.length > 50) return false
    let voice = data.voice
    if (typeof voice !== 'boolean') return false
    const joined = data.joined
    if (typeof joined !== 'boolean') return false

    const clean_object = {
        address: address,
        message: message,
        signature: signature,
        topic: topic,
        name: name,
        voice: voice,
        joined: joined
    }

    return clean_object
}

const sanitize_voice_status_data = (data) => {

    const address = sanitizeHtml(data.address)
    if (address.length !== 99) return false
    const message = sanitizeHtml(data.message)
    if (message.length > 20) return false 
    const signature = sanitizeHtml(data.signature)
    if (signature.length !== 128) return false
    const topic = sanitizeHtml(data.topic)
    if (topic.length !== 64) return false
    const name = sanitizeHtml(data.name) 
    if (name.length > 50) return false
    const voice = data.voice
    if (typeof voice !== 'boolean') return false

    const clean_object = {
        address: address,
        message: message,
        signature: signature,
        topic: topic,
        name: name,
        voice: voice,
    }

    return clean_object
}


module.exports = {sleep, trimExtra, fromHex, nonceFromTimestamp, createGroup, hexToUint, toHex, parseCall, sanitize_join_swarm_data, sanitize_voice_status_data, hash}
