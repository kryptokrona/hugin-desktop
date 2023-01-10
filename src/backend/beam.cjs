
const Hyperbeam = require('hyperbeam')
const { extraDataToMessage } = require('hugin-crypto')
const { saveMsg } = require('./database.cjs')
const sanitizeHtml = require('sanitize-html')
const crypto = require("hypercore-crypto");
const progress = require("progress-stream");
const {existsSync, mkdirSync, createWriteStream, createReadStream} = require("fs");

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
        console.log('data', data )
        const str = new TextDecoder().decode(data);
        if (str === "Start") return
        if (str === "Ping") return
        let file = checkDataMessage(str, chat.substring(0,99))
        if (file) return
        let hash = str.substring(0,64)
        let msgKey = chat.substring(99,163)
        decryptMessage(str, msgKey)
    })

    beam.on('end', () => {
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
    let file = localFiles.find(a => a.fileName === fileName)
    console.log('Want to send, found file', file)
    let filePath = file.path
    console.log('Want to send, got file path', file.path)
    const stream = createReadStream(filePath)
    const progressStream = progress({length: size, time: 100})
    progressStream.on('progress', async progress => {

        sender('upload-file-progress', {progress: progress.percentage, contact})

        if(progress.percentage === 100) {
            console.log('File uploaded')
        }
    })

    stream.pipe(progressStream).pipe(active.beam)
}

const downloadFile = (fileName, size, from) => {
    let active = active_beams.find(a => a.chat === from)
    console.log('THIS split file name?', fileName.split("\\")[fileName.split("\\").length - 1])
    console.log('dir', downloadDirectory)
    const downloadPath = downloadDirectory + "/" + fileName
    console.log('Download path',downloadPath)
    const stream = createWriteStream(downloadPath);
    const progressStream = progress({length: size, time: 100});
    progressStream.on("progress", (progress) => {

        sender('download-file-progress', {progress: progress.percentage, from})
        if (progress.percentage === 100) {
            console.log('File downloaded')
        }
    });

    active.beam.pipe(progressStream).pipe(stream);
}

const addLocalFile = (fileName, filePath, chat, fileSize) => {
    console.log('file?', fileName)
    let file = {fileName: fileName, chat: chat, size: fileSize}
    localFiles.push(file)
    console.log(
        'Got file in beam cjs', file
    )

    console.log(
        'Got filepath in beam cjs', filePath
    )

    let active = active_beams.find(a => a.chat === chat.substring(0,99))
    active.beam.write(JSON.stringify({type: 'remote-file-added', fileName}))
    sender('local-files', file)
}

const removeLocalFile = (fileName, chat) => {

    let active = active_beams.find(a => a.chat === chat)
    localFiles = localFiles.filter(x => x.fileName !== fileName)
    active.beam.write(JSON.stringify({type: 'remote-file-removed', file}))

    sender('local-files', localFiles)
}

const addRemoteFile = (file, chat) => {
    file = {file, chat}
    remoteFiles.push(file)
    console.log(
        'adding rmote file form', chat
    )
    sender('remote-files', remoteFiles)
}

const removeRemoteFile = (fileName, chat) => {
    remoteFiles = remoteFiles.filter(x => x.fileName !== fileName)
    sender('remote-files', remoteFiles, chat)
}

const requestDownload = (downloadDir, file, from) => {
    console.log('want to download from', from)
    downloadDirectory = downloadDir
    let active = active_beams.find(a => a.chat === from)
        active.beam.write(JSON.stringify({
            type: "request-download",
            fileName: file,
    }))
}

function uploadReady(file, size, from) {
    let active = active_beams.find(a => a.chat === from)
    console.log('upload ready this file', file)
        active.beam.write(JSON.stringify({
            type: 'upload-ready',
            file: file,
            size: size,
            requester: 'beam key'
    }))
}


const checkDataMessage = (data, chat) => {
    console.log('Data message incoming', data)
    console.log('From ', chat)
    data = JSON.parse(data)
    
    sender('incoming-data', data)

    if (data.type === 'remote-file-added') {
        addRemoteFile(data.fileName, chat)
        return true
    }

    if (data.type === 'remote-file-removed') {
        removeRemoteFile(data.fileName, chat)
        return true
    }

    if (data.type === 'request-download') {
        console.log('Request download message')
        sender('download-request', data)
        let file = localFiles.find(a => a.fileName === data.fileName)
        let size = file.size
        sendFile(fileName, size, chat)
        uploadReady(fileName, size, chat)
        return true
    }

    if (data.type === 'upload-ready') {
        console.log('upload ready, starting download', data)
        sender('downloading', data)
        downloadFile(data.fileName, data.size, chat)
        return true
    }

    return false
}

module.exports = {endBeam, newBeam, sendBeamMessage, downloadFile, sendFile, addLocalFile, requestDownload}
