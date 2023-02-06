
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

const startBeam = async (key, chat, file = false) => {
    //Create new or join existing beam and start beamEvent()
    try {
        if (key === "new") {
            beam = new Hyperbeam()
            beam.write('Start')
            if (file) {
                fileBeam(beam, chat, beam.key)
                return {chat, key: beam.key}
            }
            beamEvent(beam, chat, beam.key)
            return {msg:"BEAM://" + beam.key, chat: chat}
        } else {
            beam = new Hyperbeam(key)
            if (file) {
                fileBeam(beam, chat, key, true)
                return true
            }
            beamEvent(beam, chat, key)
            return false
        }
    } catch (e) {
        console.log('Beam DHT error', e)
        errorMessage(`Failed to start beam`)
        sender('stop-beam', addr)
        return "Error"
    }
}

const fileBeam = async (beam, chat, key, download = false) => {
    active_beams.push({beam, chat, key})
     beam.on('connected', function () {
        console.log('Filebeam connected to peer')
        if (!download) return
        download()
    })

    beam.on('data', (data) => {
        const str = new TextDecoder().decode(data);
        console.log('Got start test data!', str)
        if (str === "Start") return
    })

     beam.on('error', function (e) {
        console.log('Beam error', e)
        errorMessage('Beam error, shutting down..')
        endFileBeam(chat, key)
      })

      beam.on('end', () => {
        console.log('File sent, end event')
        endFileBeam(chat, key)
    })

    function download() {
        console.log('Rquest download')
        let downloadFile = remoteFiles.find(x => a.key === key && a.chat === chat)
        let active = active_beams.find(a => a.key !== key && a.chat === chat)
        console.log("Found first beam", active)
        console.log('Downlad fle', downloadFile)
        active.beam.write(JSON.stringify({
            type: "request-download",
            fileName: downloadFile.fileName,
            key: downloadFile.key
    }))

    }
}

const beamEvent = (beam, chat, key) => {
    const addr = chat.substring(0,99)
    const msgKey = chat.substring(99,163)
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
        sender('beam-connected', [addr, beam.key])
    })

    //Incoming message
    beam.on('data', (data) => {
        const str = new TextDecoder().decode(data);
        if (str === "Start") return
        if (str === "Ping") return
        if (checkDataMessage(str, addr)) return
        let hash = str.substring(0,64)
        decryptMessage(str, msgKey)
    })

    beam.on('end', () => {
        console.log('Chat beam ended on event')
    })

    beam.on('error', function (e) {
        console.log('error', e)
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
    let active = active_beams.find(a => a.chat === to)
    active.beam.write(message)
}

const endFileBeam = async (chat, key) => {
    let file = active_beams.find(a => a.chat === chat && a.key === key)
    if (!file) return
    file.beam.end()
    await sleep(2000)
    file.beam.destroy()
    let filter = active_beams.filter(a => a.key !== file.key)
    console.log('File beams cleared', filter)
    active_beams = filter
}


const endBeam = async (chat, file = false) => {
    let active = active_beams.find(a => a.chat === chat)
    if (!active) return
    sender('stop-beam', chat)
    active.beam.end()
    await sleep(2000)
    active.beam.destroy()
    let filter = active_beams.filter(a => a.chat !== chat)
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

const sendFile = async (fileName, size, chat, key) => {
    let active = active_beams.find(a => a.chat === chat && a.key === key)
    let file = localFiles.find(a => a.fileName === fileName && a.chat === chat && a.key === key)
    if (active.key !== key) return
    if (!file) {
        errorMessage(`Can't find the file, try share it again`)
        return
    }
    if (!active) {
        errorMessage(`Can't send file, beam no longer active`)
        return
    }
    try {
    const filePath = file.path
    const stream = createReadStream(filePath)
    const progressStream = progress({length: size, time: 100})

    progressStream.on('progress', async progress => {

        sender('upload-file-progress', {fileName, progress: progress.percentage, chat, time: file.time})

        if(progress.percentage === 100) {
            console.log('File uploaded')
            console.log('Done!')
            return
        }
    })

    stream.pipe(progressStream).pipe(active.beam)

    } catch (err) {
        errorMessage(`Something went wrong uploading the file`)
    }
}

const downloadFile = async (fileName, size, chat, key) => {
    console.log('Downloading file')
    let file = remoteFiles.find(a => a.fileName === fileName && a.chat === chat && a.key === key)
    let active = active_beams.find(a => a.fileName === fileName && file.key === a.key && key)
    console.log('Got download active beam', active.beam)
    if (!active) {
        errorMessage(`Can't download file, beam no longer active`)
        return
    }
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
        
        sender('download-file-progress', {fileName, progress: progress.percentage, chat, path: downloadPath})
        if (progress.percentage === 100) {
        }
    });
    active.beam.pipe(progressStream).pipe(stream);

    } catch (err) {
        errorMessage(`Something went wrong downloading the file`)
    }
}

const addLocalFile = async (fileName, path, chat, size, time) => {
    let active = active_beams.find(a => a.chat === chat)
    if (!active) return
    let fileBeam = await startBeam('new', chat, true)
    let file = {fileName, chat, size, path, time, key: fileBeam.key}
    localFiles.unshift(file)
    sender('local-files',  {localFiles, chat})
    sender('uploading', {fileName, chat, size, time })
    await sleep(1000)
    active.beam.write(JSON.stringify({type: 'remote-file-added', fileName, size, key: fileBeam.key}))
}

const removeLocalFile = (fileName, chat, time) => {
    let active = active_beams.find(a => a.chat === chat)
    localFiles = localFiles.filter(x => x.fileName !== fileName && x.time !== time)
    sender('local-files', {localFiles, chat})
    if (!active) errorMessage(`Beam not active`)
    active.beam.write(JSON.stringify({type: 'remote-file-removed', fileName, chat}))
}

const addRemoteFile = (fileName, chat, size, key) => {
    let time = Date.now()
    file = {fileName, chat, size, time, key}
    remoteFiles.unshift(file)
    sender('remote-file-added', {remoteFiles, chat})
}

const removeRemoteFile = (fileName, chat) => {
    remoteFiles = remoteFiles.filter(x => x.fileName !== fileName && x.chat === chat)
    sender('remote-files', {remoteFiles, chat})
}

const requestDownload = async (downloadDir, file, chat) => {
    downloadDirectory = downloadDir
    let download = remoteFiles.find(a => a.fileName === file && a.chat === chat)
    console.log('Found download file', download)
    if (!download) return
    let downloadBeam = await startBeam(download.key, chat, true)
    if (downloadBeam === "Error") errorMessage('Error creating download beam')
}

const uploadReady = (file, size, chat, key) => {
    let active = active_beams.find(a => a.chat === chat && a.key !== key )
        active.beam.write(JSON.stringify({
            type: 'upload-ready',
            fileName: file,
            size: size,
            key: key
    }))
}


const checkDataMessage = (data, chat) => {
    try {
        data = JSON.parse(data)
    } catch {
        return false
    }
    
    let fileName
    let size
    let key

    if ('fileName' in data) {
        fileName = sanitizeHtml(data.fileName)
        size = parseInt(sanitizeHtml(data.size))
        key = sanitizeHtml(data.key)
    }

    if (data.type === 'remote-file-added') {
        addRemoteFile(fileName, chat, size, key)
        return true
    }

    if (data.type === 'remote-file-removed') {
        removeRemoteFile(fileName, chat)
        return true
    }

    if (data.type === 'request-download') {
        let file = localFiles.find(a => a.fileName === fileName && a.chat === chat && a.key === key)
        if (!file) errorMessage(`Can't upload the file`)
        if (!file) return true
        sender('download-request', fileName)
        console.log('Download request')
        size = file.size
        uploadReady(fileName, size, chat, key)
        sendFile(fileName, size, chat, key)
        return true
    }

    if (data.type === 'upload-ready') {
        console.log('upload ready!')
        downloadFile(fileName, size, chat, key)
        return true
    }

    return false
}

const errorMessage = (message) => {
    sender('error-notify-message', message)
}

module.exports = {endBeam, newBeam, sendBeamMessage, addLocalFile, requestDownload, removeLocalFile}
