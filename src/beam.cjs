const Hyperbeam = require('hyperbeam')
const { extraDataToMessage } = require('hugin-crypto')
const { saveMessage } = require('./database.cjs')

let active_beams = []
let chat_keys

const newBeam = async (key, chat, xkr_keys) => {
    //If we want to switch key set for decryption or add session key. 
    //The beam is already encrypted. We add Hugin encryption inside.
    setKeys(xkr_keys)
    return await startBeam(key, chat)
}

const setKeys = (xkr) => {
    chat_keys = xkr
}

const startBeam = async (key, chat) => {
    //Create new or join existing beam and start beamEvent()
        if (key === "new") {
            beam = new Hyperbeam()
            console.log('Beam key', beam.key)
            beam.write('Start')
            beamEvent(beam, chat, key)
            return {msg:"BEAM://" + beam.key, chat: chat}
        } else {
            beam = new Hyperbeam(key)
            beamEvent(beam, chat, key)
            return false
        }
}

const beamEvent = async (beam, chat, key) => {

    active_beams.push({key, chat: chat.substring(0,99), beam})
    console.log('Beam event active beams',active_beams)
    mainWindow.webContents.send('new-beam', beam.key, chat.substring(0,99))
    beam.on('remote-address', function ({ host, port }) {
        if (!host) console.log('Could not find the host')
        else console.log('Connected to DHT with' + host + ':' + port)
        if (port) console.log('Connection ready')
    })

    beam.on('connected', function () {
        console.log('Beam connected to peer')
        mainWindow.webContents.send('beam-connected', chat.substring(0,99))
    })
    
    //Incoming message
    beam.on('data', async (data) => {
        console.log('data', data )
        const str = new TextDecoder().decode(data);
        console.log('string', str)
        if (str === "Start") return
        let hash = str.substring(0,64)
        let msgKey = chat.substring(99,163)
        decryptMessage(message, msgKey)
    })

    beam.on('end', () => {
        beam.end()
        let filter = active_beams.filter(a => a.chat !== chat)
        active_beams = filter
        console.log('Active beams beam.on end', active_beams)
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

const decryptMessage = async (message, msgKey) => {
    let decrypted_message = await extraDataToMessage(str, msgKey, chat_keys)
    saveMessage(decrypted_message, hash, true)
}

const sendBeamMessage = async (message, to) => {
    let contact = active_beams.find(a => a.chat === to)
    console.log('Beam message to', contact)
    contact.beam.write(message)
}


const endBeam = async (contact) => {
    let active = active_beams.find(a => a.chat === contact)
    if (!active) return
    contact.beam.end()
    let filter = active_beams.filter(a => a.chat !== contact)
    active_beams = filter
    console.log('Active beams endBeam', active_beams)
}

module.exports = {endBeam, newBeam, sendBeamMessage}