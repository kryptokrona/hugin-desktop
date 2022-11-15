const Hyperbeam = require('hyperbeam')
const { extraDataToMessage } = require('hugin-crypto')
const { saveMsg } = require('./database.cjs')
const sanitizeHtml = require('sanitize-html')
let active_beams = []
let chat_keys

const newBeam = async (key, chat, xkr_keys, sender) => {
    //If we want to switch key set for decryption or add session key. 
    //The beam is already encrypted. We add Hugin encryption inside.
    setKeys(xkr_keys)
    return await startBeam(key, chat, sender)
}

const setKeys = (xkr) => {
    chat_keys = xkr
}

const startBeam = async (key, chat, sender) => {
    //Create new or join existing beam and start beamEvent()
    try {
        if (key === "new") {
            beam = new Hyperbeam()
            console.log('Beam key', beam.key)
            beam.write('Start')
            beamEvent(beam, chat, key, sender)
            return {msg:"BEAM://" + beam.key, chat: chat}
        } else {
            beam = new Hyperbeam(key)
            beamEvent(beam, chat, beam.key, sender)
            return false
        }
    } catch (e) {
        console.log('Error', e)
        return "Error"
    }
}

const beamEvent = (beam, chat, key, sender) => {

    let addr = chat.substring(0,99)
    active_beams.push({key, chat: addr, beam})
    console.log('Beam event active beams',active_beams)
    sender('new-beam', {key, chat: addr})
    beam.on('remote-address', function ({ host, port }) {
        if (!host) console.log('Could not find the host')
        else console.log('Connected to DHT with' + host + ':' + port)
        if (port) console.log('Connection ready')
    })

    beam.on('connected', function () {
        console.log('Beam connected to peer')
        checkIfOnline(addr)
        sender('beam-connected', chat.substring(0,99))
    })
    
    //Incoming message
    beam.on('data', async (data) => {
        console.log('data', data )
        const str = new TextDecoder().decode(data);
        console.log('string', str)
        if (str === "Start") return
        if (str === "Ping") return
        let hash = str.substring(0,64)
        let msgKey = chat.substring(99,163)
        decryptMessage(str, msgKey, sender)
    })

    beam.on('end', () => {
        endBeam(addr, sender)
    })

    beam.on('error', function (e) {
        console.log('Beam error')
        endBeam(addr, sender)
      })

    process.once('SIGINT', () => {
        if (!beam.connected) closeASAP()
        else beam.end()
    })

    function closeASAP () {
        console.error('Shutting down beam...')
        const timeout = setTimeout(() => process.exit(1), 2000)
        beam.destroy()
        beam.on('close', function () {
        clearTimeout(timeout)
        })
    }
}

const decryptMessage = async (str, msgKey, sender) => {

    let decrypted_message = await extraDataToMessage(str, [msgKey], chat_keys)
    let address = sanitizeHtml(decrypted_message.from)
    let timestamp = sanitizeHtml(decrypted_message.t)
    let message = sanitizeHtml(decrypted_message.msg)
    let sent = false

    let newMsg = {
        msg: message,
        chat: address,
        sent: false,
        timestamp: timestamp,
        offchain: true,
        beam: true,
    }

    sender('newMsg', newMsg)
    sender('privateMsg', newMsg)
    saveMsg(message, address, sent, timestamp)
}

const sendBeamMessage = (message, to) => {
    let contact = active_beams.find(a => a.chat === to)
    contact.beam.write(message)
}


const endBeam = (contact, sender) => {
    let active = active_beams.find(a => a.chat === contact)
    if (!active) return
    sender('stop-beam', contact)
    active.beam.end()
    let filter = active_beams.filter(a => a.chat !== contact)
    active_beams = filter
    console.log('Active beams', active_beams)
}

const checkIfOnline = (addr) => {

    let interval = setInterval(ping, 10 * 1000)
    function ping() {
        let active = active_beams.find(a => a.chat === addr)
        if (!active) {
            clearInterval(interval)
            return
        } else {
            active.beam.write('Ping')
        }
    }
}

module.exports = {endBeam, newBeam, sendBeamMessage}