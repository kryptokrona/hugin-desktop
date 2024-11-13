
const Hyperbeam = require('hyperbeam')
const { extraDataToMessage } = require('hugin-crypto')
const { saveMsg } = require('./database.cjs')
const sanitizeHtml = require('sanitize-html')
const progress = require("progress-stream");
const {createWriteStream, createReadStream} = require("fs");
const { sleep, sanitize_pm_message, randomKey } = require('./utils.cjs');
const { ipcMain } = require('electron')
const {Hugin} = require('./account.cjs');
const { keychain } = require('./crypto.cjs');

let active_beams = []
let localFiles = []
let remoteFiles = []
let downloadDirectory
//STATUS

ipcMain.on("end-beam", async (e, chat) => {
    console.log("end beam");
    end_beam(chat);
})

//FILES

ipcMain.on('download', async (e, file, from) => {
    start_download(Hugin.downloadDir, file, from)
})

ipcMain.on('upload', async (e, filename, path, address, fileSize, time) => {
    add_local_file(filename, path, address, fileSize, time)
})

ipcMain.on('remove-local-file', async (e, filename, address, time) => {
    remove_local_file(filename, address, time)
})

const new_beam = async (key, chat, send = false) => {
    //The beam is already encrypted. We add Hugin encryption inside.
    return await start_beam(key, chat, false, send)
}

const start_beam = async (key, chat, file = false, send, group, filename, size) => {
    //Create new or join existing beam and start beamEvent()
    try {
        if (key === "new") {
            beam = new Hyperbeam()
            beam.write('Start')
            if (file) {
                file_beam(beam, chat, beam.key, false, group, filename, size)
                return {chat, key: beam.key}
            }
            beam_event(beam, chat, beam.key)
            if (send) return  {msg:"BEAMFILE://" + beam.key, chat: chat}
            return {msg:"BEAM://" + beam.key, chat: chat}
        } else {
            if (key.length !== 52) return false
            beam = new Hyperbeam(key)
            if (file) {
                file_beam(beam, chat, key, true, group, filename, size)
                return true
            }
            beam_event(beam, chat, key)
            return false
        }
    } catch (e) {
        console.log('Beam DHT error', e)
        errorMessage(`Failed to start beam`)
        Hugin.send('stop-beam', chat)
        return "Error"
    }
}

const file_beam = (beam, chat, key, download = false, group = false, filename, size) => {
    let start = false
    active_beams.push({beam, chat, key, group})

    beam.on('data', (data) => {
        if (!start && download) {
            const str = new TextDecoder().decode(data);

            if (group && str === "Start") {
                download_file(filename, size, chat, key, true)
                start = true
                return
            }

            if (!group && str === "Start") {
                start = true
                request_download(chat, key)
                return
            }
        }
    })

     beam.on('error', function (e) {
        console.log('Beam error', e)
        errorMessage('Beam error, shutting down..')
        end_file_beam(chat, key)
      })

      beam.on('end', () => {
        console.log('File sent, end event')
        end_file_beam(chat, key)
    })

}

const beam_event = (beam, chat, key) => {
    const addr = chat.substring(0,99)
    const msgKey = chat.substring(99,163)
    active_beams.push({key, chat: addr, beam})
    Hugin.send('new-beam', {key, chat: addr})
    beam.on('remote-address', function ({ host, port }) {
        if (!host) console.log('Could not find the host')
        else console.log('Connected to DHT with' + host + ':' + port)
        if (port) console.log('Connection ready')
    })

    beam.on('connected', function () {
        console.log('Beam connected to peer')
        check_if_online(addr)
        Hugin.send('beam-connected', [addr, beam.key])
    })

    //Incoming message
    beam.on('data', (data) => {
        const str = new TextDecoder().decode(data);
        if (str === "Start") return
        if (str === "Ping") return
        if (check_data_message(str, addr)) return
        let hash = str.substring(0,64)
        decrpyt_beam_message(str, msgKey)
    })

    beam.on('end', () => {
        console.log('Chat beam ended on event')
    })

    beam.on('error', function (e) {
        console.log('error', e)
        console.log('Beam error')
        end_beam(addr)
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

const decrpyt_beam_message = async (str, msgKey) => {

    let decrypted_message = await extraDataToMessage(str, [msgKey], keychain.getXKRKeypair())
    decrypted_message.k = msgKey
    decrypted_message.sent = false
    const [message, address, key, timestamp] = sanitize_pm_message(decrypted_message)

    if (!message) return

    const newMsg = {
        msg: message,
        chat: address,
        sent: false,
        timestamp: timestamp,
        offchain: true,
        beam: true,
    }

    Hugin.send('newMsg', newMsg)
    Hugin.send('privateMsg', newMsg)
    saveMsg(message, address, false, timestamp)
}

const send_beam_message = (message, to) => {
    const active = active_beams.find(a => a.chat === to)
    active.beam.write(message)
}

const end_file_beam = async (chat, key) => {
    const file = active_beams.find(a => a.chat === chat && a.key === key)
    if (!file) return
    file.beam.end()
    await sleep(2000)
    file.beam.destroy()
    const filter = active_beams.filter(a => a.key !== file.key)
    console.log('File beams cleared', filter)
    active_beams = filter
}


const end_beam = async (chat, file = false) => {
    const active = active_beams.find(a => a.chat === chat)
    if (!active) return
    Hugin.send('stop-beam', chat)
    active.beam.end()
    await sleep(2000)
    active.beam.destroy()
    const filter = active_beams.filter(a => a.chat !== chat)
    active_beams = filter
}

const check_if_online = (addr) => {
    const interval = setInterval(ping, 10 * 1000)
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

const send_file = async (fileName, size, chat, key, group) => {
    const active = active_beams.find(a => a.chat === chat && a.key === key)
    const file = localFiles.find(a => a.fileName === fileName && a.chat === chat && a.key === key)
    if (!file) {
        errorMessage(`Can't find the file, try share it again`)
        return
    }
    if (!active) {
        errorMessage(`Can't send file, beam no longer active`)
        return
    }
    if (active.key !== key) return
    try {
    const filePath = file.path
    const stream = createReadStream(filePath)
    const progressStream = progress({length: size, time: 100})

    progressStream.on('progress', async progress => {

        Hugin.send('upload-file-progress', {fileName, progress: progress.percentage, chat, time: file.time, group})

        if(progress.percentage === 100) {
            console.log('File uploaded')
            console.log('Done!')
            let message = `Uploaded ${fileName}`
            if (!group) saveMsg(message, chat, true, file.time)
            return
        }
    })

    stream.pipe(progressStream).pipe(active.beam)

    } catch (err) {
        errorMessage(`Something went wrong uploading the file`)
    }
}

const download_file = async (fileName, size, chat, key, group = false) => {
    const file = remoteFiles.find(a => a.fileName === fileName && a.chat === chat && a.key === key)
    const active = active_beams.find(a => a.key === key)
    if (!active) {
        errorMessage(`Can't download file, beam no longer active`)
        return
    }
    if (!file) {
        errorMessage(`File is no longer shared`)
        return
    }
    try {
    Hugin.send('downloading', {fileName, chat, size, group})
    const downloadPath = downloadDirectory + "/" + fileName
    const stream = createWriteStream(downloadPath);
    const progressStream = progress({length: size, time: 100});
    progressStream.on("progress", (progress) => {
        
        Hugin.send('download-file-progress', {fileName, progress: progress.percentage, chat, path: downloadPath})
        console.log("Downloading", progress.percentage)
        if (progress.percentage === 100) {
            let message = `Downloaded ${fileName}`
            if (!group) saveMsg(message, chat, false, file.time)
        }
    });

    let downloaded = 0
    active.beam.on('data', (data) => {
        downloaded += data.length;
        console.log('Size:', file.size);
        console.log('Downloaded:', downloaded);
        if (downloaded > file.size) {
        stream.destroy();
        end_file_beam(chat, key);
        errorMessage('Download exceeded file size... Closing connection');
        return;
    }})
    
    active.beam.pipe(progressStream).pipe(stream);

    } catch (err) {
        errorMessage(`Something went wrong downloading the file`)
    }
}

const add_local_file = async (fileName, path, chat, size, time, group = false) => {
    const active = active_beams.find(a => a.chat === chat)
    const fileBeam = await start_beam('new', chat, true, true, group, fileName, size)
    const file = {fileName, chat, size, path, time, info: 'file', type: 'upload-ready', key: fileBeam.key}
    localFiles.unshift(file)
    console.log("local files", localFiles)
    Hugin.send('local-files',  {localFiles, chat})
    Hugin.send('uploading', {fileName, chat, size, time, group })
    await sleep(1000)
    if (group) return fileBeam.key
    if (!active) return
    active.beam.write(JSON.stringify({type: 'remote-file-added', fileName, size, key: fileBeam.key}))
}

const remove_local_file = (fileName, chat, time) => {
    const active = active_beams.find(a => a.chat === chat)
    localFiles = localFiles.filter(x => x.fileName !== fileName && x.time !== time)
    Hugin.send('local-files', {localFiles, chat})
    if (!active) errorMessage(`Beam not active`)
    active.beam.write(JSON.stringify({type: 'remote-file-removed', fileName, chat}))
}

const update_remote_file = (fileName, chat, size, key, time ) => {
    const update = remoteFiles.find(a => a.fileName === fileName && a.chat === chat && a.time === time)
    if (update) {
        update.key = key
    }
}

const add_remote_file = async (fileName, chat, size, key, group = false, hash, room, name, time) => {
    file = {fileName, chat, size, time, key, group, room, hash}
    remoteFiles.unshift(file)
    if (group) return await add_group_file(fileName, remoteFiles, chat, group, time, hash, room, name)
    else Hugin.send('remote-file-added', {remoteFiles, chat})
}

const add_group_file = async (fileName, remoteFiles, chat, group, time, hash, room, name) => {
    Hugin.send('group-remote-file-added', {remoteFiles, chat, group})
    const message = {
            message: fileName,
            address: chat,
            group: room,
            time: time,
            name:  name,
            reply: false,
            hash: hash,
            sent: false,
            channel: 'Room',
            file: true
    }
    Hugin.send('roomMsg', message)
    return time
}

const remote_remote_file = (fileName, chat) => {
    remoteFiles = remoteFiles.filter(x => x.fileName !== fileName && x.chat === chat)
    Hugin.send('remote-files', {remoteFiles, chat})
}

const start_download = async (downloadDir, file, chat, k) => {
    downloadDirectory = downloadDir
    let download = remoteFiles.find(a => a.fileName === file && a.chat === chat)
    const key = k ? k : download?.key
    const group = k ? true : false
    if (!download) return
    let downloadBeam = await start_beam(key, chat, true, false, group, file, download.size)
    if (downloadBeam === "Error") errorMessage('Error creating download beam')
}

const request_download = (chat, key) => {
        let downloadFile = remoteFiles.find(a => a.key === key && a.chat === chat)
        let active = active_beams.find(a => a.key !== key && a.chat === chat)
        active.beam.write(JSON.stringify({
            type: "request-download",
            fileName: downloadFile.fileName,
            key: downloadFile.key
        }))
    }

const upload_ready = (file, size, chat, key) => {
    let active = active_beams.find(a => a.chat === chat && a.key !== key )
        active.beam.write(JSON.stringify({
            type: 'upload-ready',
            fileName: file,
            size: size,
            key: key
    }))
}


const check_data_message = (data, chat) => {
    try {
        data = JSON.parse(data)
    } catch {
        return false
    }
    
    let fileName
    let size
    let key

    if ('type' in data) {
        fileName = sanitizeHtml(data.fileName)
        size = parseInt(sanitizeHtml(data.size))
        key = sanitizeHtml(data.key)
    } else {
        return false
    }

    if (data.type === 'remote-file-added') {
        add_remote_file(fileName, chat, size, key)
        return true
    }

    if (data.type === 'remote-file-removed') {
        remote_remote_file(fileName, chat)
        return true
    }

    if (data.type === 'request-download') {
        let file = localFiles.find(a => a.fileName === fileName && a.chat === chat && a.key === key)
        if (!file) errorMessage(`Can't upload the file`)
        if (!file) return true
        Hugin.send('download-request', fileName)
        console.log('Download request')
        size = file.size
        upload_ready(fileName, size, chat, key)
        send_file(fileName, size, chat, key)
        return true
    }

    if (data.type === 'upload-ready') {
        console.log('upload ready!')
        download_file(fileName, size, chat, key)
        return true
    }

    return false
}

const errorMessage = (message) => {
    Hugin.send('error-notify-message', message)
}

module.exports = {end_beam, new_beam, send_beam_message, add_local_file, start_download, remove_local_file, add_remote_file, update_remote_file, send_file, download_file, remote_remote_file}
