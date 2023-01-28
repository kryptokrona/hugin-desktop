
const Hyperbeam = require('hyperbeam')
const { extraDataToMessage } = require('hugin-crypto')
const { saveMsg } = require('./database.cjs')
const sanitizeHtml = require('sanitize-html')
const progress = require("progress-stream");
const {createWriteStream, createReadStream} = require("fs");
const { sleep } = require('./utils.cjs');

let active_beams = []
let chat_keys
let localFiles = []
let remoteFiles = []
let downloadDirectory
let sender

const newBeam = async (key, chat, xkr_keys, ipc) => {
    //If we want to switch key set for decryption or add session key. 
    //The beam is already encrypted. We add Hugin encryption inside.
    setKeys(xkr_keys)
    sender = ipc
    return await startBeam(key, chat)
}

const setKeys = (xkr) => {
    chat_keys = xkr
}

const startBeam = async (key, chat) => {
    //Create new or join existing beam and start beamEvent()
    try {
        if (key === "new") {
            beam = new Hyperbeam()
            beam.write('Start')
            beamEvent(beam, chat, beam.key)
            return {msg:"BEAM://" + beam.key, chat: chat}
        } else {
            beam = new Hyperbeam(key)
            beamEvent(beam, chat, key)
            return false
        }
    } catch (e) {
        console.log('Beam DHT error', e)
        errorMessage(`Failed to start beam`)
        sender('stop-beam', chat.substring(0,99))
        return "Error"
    }
}

const beamEvent = (beam, chat, key) => {

    let addr = chat.substring(0,99)
    active_beams.push({key, chat: addr, beam})
    sender('new-beam', {key, chat: addr})
    beam.on('remote-address', function ({ host, port }) {
        if (!host) console.log('Could not find the host')
        else console.log('Connected to DHT with' + host + ':' + port)
        if (port) console.log('Connection ready')
    })

    beam.on('connected', function () {
        console.log('Beam connected to peer')
        checkIfOnline(addr)
        sender('beam-connected', [chat.substring(0,99), beam.key])
    })

    //Incoming message
    beam.on('data', async (data) => {
        const str = new TextDecoder().decode(data);
        if (str === "Start") return
        if (str === "Ping") return
        if (checkDataMessage(str, chat.substring(0,99))) return
        let hash = str.substring(0,64)
        let msgKey = chat.substring(99,163)
        decryptMessage(str, msgKey)
    })

    beam.on('end', () => {
        console.log('Beam ended on end event')
        endBeam(addr)
    })

    beam.on('error', function (e) {
        console.log('Beam error')
        endBeam(addr)
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

const decryptMessage = async (str, msgKey) => {
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


const endBeam = (contact) => {
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

const sendFile = (fileName, size, contact) => {
    let active = active_beams.find(a => a.chat === contact)
    let file = localFiles.find(a => a.fileName === fileName && a.chat === contact)
    if (!file) {
        errorMessage(`Can't find the file, try share it again`)
        return
    }
    if (!active) {
        errorMessage(`Can't send file, beam no longer active`)
        return
    }
    try {
    let filePath = file.path
    const stream = createReadStream(filePath)
    const progressStream = progress({length: size, time: 100})
    progressStream.on('progress', async progress => {

        sender('upload-file-progress', {progress: progress.percentage, chat: contact, fileName, time: file.time})

        if(progress.percentage === 100) {
            console.log('File uploaded')
            removeLocalFile(fileName, contact)
        }
    })

    stream.pipe(progressStream).pipe(active.beam)

    } catch (err) {
        errorMessage(`Something went wrong uploading the file`)
    }
}

const downloadFile = (fileName, size, chat) => {
    let active = active_beams.find(a => a.chat === chat)
    if (!active) {
        errorMessage(`Can't download file, beam no longer active`)
        return
    }
    let file = remoteFiles.find(a => a.fileName === fileName && a.chat === chat)
    if (!file) {
        errorMessage(`File is no longer shared`)
        return
    }
    try {
    sender('downloading', {fileName, chat, size})
    const downloadPath = downloadDirectory + "/" + fileName
    const stream = createWriteStream(downloadPath);
    const progressStream = progress({length: size, time: 100});
    progressStream.on("progress", (progress) => {
        
        sender('download-file-progress', {progress: progress.percentage, chat, path: downloadPath})
        if (progress.percentage === 100) {
            console.log('File downloaded')
        }
    });

    active.beam.pipe(progressStream).pipe(stream);

    } catch (err) {
        errorMessage(`Something went wrong downloading the file`)
    }
}

const addLocalFile = async (fileName, filePath, chat, fileSize, time) => {
    let active = active_beams.find(a => a.chat === chat.substring(0,99))
    if (!active) return
    let file = {fileName: fileName, chat: chat, size: fileSize, path: filePath, time: time}
    localFiles.unshift(file)
    sender('local-files',  {localFiles, chat})
    sender('uploading', {fileName, chat, size: fileSize, time })
    active.beam.write(JSON.stringify({type: 'remote-file-added', fileName}))
}

const removeLocalFile = (fileName, chat, time) => {
    let active = active_beams.find(a => a.chat === chat)
    localFiles = localFiles.filter(x => x.fileName !== fileName && x.time !== time)
    sender('local-files', {localFiles, chat})
    console.log('File rmeoved')
    if (!active) errorMessage(`Beam not active`)
    active.beam.write(JSON.stringify({type: 'remote-file-removed', file}))
}

const addRemoteFile = async (fileName, chat, size) => {
    let time = Date.now()
    file = {fileName, chat, size, time}
    remoteFiles.unshift(file)
    sender('remote-file-added', {remoteFiles, chat})
}

const removeRemoteFile = (fileName, chat) => {
    remoteFiles = remoteFiles.filter(x => x.fileName !== fileName)
    sender('remote-file-removed', {remoteFiles, chat})
}

const requestDownload = (downloadDir, file, from) => {
    downloadDirectory = downloadDir
    let active = active_beams.find(a => a.chat === from)
        active.beam.write(JSON.stringify({
            type: "request-download",
            fileName: file,
    }))
}

const uploadReady = (file, size, from) => {
    let active = active_beams.find(a => a.chat === from)
        active.beam.write(JSON.stringify({
            type: 'upload-ready',
            fileName: file,
            size: size
    }))
}


const checkDataMessage = (data, chat) => {

    try {
        data = JSON.parse(data)
    } catch {
        return true
    }

    let fileName
    let size

    if ('fileName' in data) {
        fileName = sanitizeHtml(data.fileName)
        size = parseInt(sanitizeHtml(data.size))
    }

    if (data.type === 'remote-file-added') {
        addRemoteFile(fileName, size, chat)
        return true
    }

    if (data.type === 'remote-file-removed') {
        removeRemoteFile(fileName, chat)
        return true
    }

    if (data.type === 'request-download') {
        sender('download-request', fileName)
        let file = localFiles.find(a => a.fileName === fileName && a.chat === chat)
        if (!file) errorMessage(`Beam not active`)
        if (!file) return true
        size = file.size
        sendFile(fileName, size, chat)
        uploadReady(fileName, size, chat)
        return true
    }

    if (data.type === 'upload-ready') {
        downloadFile(fileName, size, chat)
        return true
    }

    return false
}

const errorMessage = (message) => {
    sender('error-notify-message', message)
}

module.exports = {endBeam, newBeam, sendBeamMessage, addLocalFile, requestDownload, removeLocalFile}
