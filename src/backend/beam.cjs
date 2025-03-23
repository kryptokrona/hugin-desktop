
const Huginbeam = require('huginbeam')
const { extraDataToMessage } = require('hugin-crypto')
const { saveMsg } = require('./database.cjs')
const sanitizeHtml = require('sanitize-html')
const progress = require("progress-stream");
const {createWriteStream, createReadStream} = require("fs");
const { sleep, randomKey } = require('./utils.cjs');
const { ipcMain } = require('electron')
const {Hugin} = require('./account.cjs');
const { keychain, get_new_peer_keys, decrpyt_beam_message } = require('./crypto.cjs');

let active_beams = []
let localFiles = []
let remoteFiles = []
let downloadDirectory

const new_beam = async (key, chat, upload = false) => {
    //The beam is already encrypted. We add Hugin encryption inside.
    return await start_beam(key, chat, false, upload)
}

const start_beam = async (key, chat, file = true, upload, group, filename, size, dm = false) => {
    //Create new or join existing beam and start beamEvent()
    const beamKey = key === "new" ? randomKey() : key
    const [base_keys, dht_keys, sig] = get_new_peer_keys(beamKey)
    const options = { upload, dht_keys, base_keys, sig };
    console.log("Download file in dm?", dm)
    let beam
    try {
        if (key === "new") {
            beam = new Huginbeam(beamKey, options)
            beam.write('Start')
            if (file) {
                file_beam(beam, chat, beam.key, false, group, filename, size, dm)
                return {chat, key: beam.key}
            }
        } else {
            if (key.length > 64) return false
            beam = new Huginbeam(beamKey, options)
            if (file) {
                file_beam(beam, chat, key, true, group, filename, size, dm)
                return true
            }
        }
    } catch (e) {
        console.log('Beam DHT error', e)
        errorMessage(`Failed to start beam`)
        Hugin.send('stop-beam', chat)
        return "Error"
    }
}

const file_beam = (beam, chat, key, download = false, group = false, filename, size, dm) => {
    let start = false
    active_beams.push({beam, chat, key, group})

    beam.on('data', (data) => {
        if (!start && download) {
            const str = new TextDecoder().decode(data);

            if (group && str === "Start") {
                download_file(filename, size, chat, key, true, dm)
                start = true
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


const send_file = async (fileName, size, chat, key, group, dm) => {
    const active = active_beams.find(a => a.chat === chat && a.key === key)
    const file = localFiles.find(a => a.fileName === fileName && a.chat === chat && a.key === key)
    console.log("Sending file in dm?")
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
    const upload = {fileName, time: file.time, size, path: file.path}
    const stream = createReadStream(filePath)
    const progressStream = progress({length: size, time: 100})

    progressStream.on('progress', async progress => {

        Hugin.send('upload-file-progress', {fileName, progress: progress.percentage, chat, time: file.time, group})

        if(progress.percentage === 100) {
            console.log('File uploaded')
            console.log('Done!')
            let message = `Uploaded ${fileName}`
            if (dm) saveMsg(message, chat, true, file.time)
            Hugin.file_info(upload)
            Hugin.send('remote-file-saved', JSON.stringify(file))
            return
        }
    })

    stream.pipe(progressStream).pipe(active.beam)

    } catch (err) {
        errorMessage(`Something went wrong uploading the file`)
    }
}

const download_file = async (fileName, size, chat, key, group = false, dm = false) => {
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
    const downloadPath = downloadDirectory + "/" + fileName
    const download = {fileName, chat, size, group, path: downloadPath, time: file.time, hash: file.hash}
    Hugin.send('downloading', download)
    const stream = createWriteStream(downloadPath);
    const progressStream = progress({length: size, time: 100});
    progressStream.on("progress", (progress) => {
        
        Hugin.send('download-file-progress', {fileName, progress: progress.percentage, chat, path: downloadPath})
        console.log("Downloading", progress.percentage)
        if (progress.percentage === 100) {
            let message = `Downloaded ${fileName}`
            if (dm) saveMsg(message, chat, false, file.time)
            Hugin.file_info(download)
            Hugin.send('remote-file-saved', JSON.stringify(file))
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
    console.log("Remote file added", file)
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

const start_download = async (downloadDir, file, chat, k, beam) => {
    downloadDirectory = downloadDir
    let download = remoteFiles.find(a => a.fileName === file && a.chat === chat)
    const key = k ? k : download?.key
    const group = k ? true : false
    if (!download) return
    let downloadBeam = await start_beam(key, chat, true, false, group, file, download.size, beam)
    if (downloadBeam === "Error") errorMessage('Error creating download beam')
}


const errorMessage = (message) => {
    Hugin.send('error-notify-message', message)
}

module.exports = {new_beam, add_local_file, start_download, remove_local_file, add_remote_file, update_remote_file, send_file, download_file, remote_remote_file}
