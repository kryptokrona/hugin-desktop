
const Corestore = require('corestore')
const Hyperdrive = require('hyperdrive')
const fs = require('fs');
const { app } = require('electron');
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
  { file: '.mov', type: 'video' },
  { file: '.wmv', type: 'video' },
  { file: '.mkv', type: 'video' },
  { file: '.mpeg', type: 'video' },
  { file: '.m4a', type: 'audio' },
  { file: '.mp3', type: 'audio' },
  { file: '.wav', type: 'audio' },
];
const userDataDir = app.getPath('userData')
const { Hugin } = require('./account.cjs');
const { saveGroupMsg, saveMsg } = require('./database.cjs');
const { sleep } = require('./utils.cjs');


class HyperStorage {
  constructor() {
    this.drives = []
    this.limit = 10000000000 //10 gb per session
    this.saved = 0
    this.downloading = new Set() // prevents concurrent downloads of same hash
  }

async load_drive(topic) {
  const [filesPath, chatPath] = make_directory(userDataDir, topic)
  if (this.loaded(topic)) return;
  const store = new Corestore(filesPath)
  const drive = new Hyperdrive(store)
  await drive.ready()
  console.log("Drive loaded for topic", topic)
  this.drives.push({ drive, topic, store, peerDrives: new Map(), notifiedFiles: new Set() })
}

loaded(topic) {
  return this.drives.some(a => a.topic === topic)
}

get_room(topic) {
  return this.drives.find(a => a.topic === topic)
}

get_drive(topic) {
  const found = this.get_room(topic)
  if (!found) return false
  return found.drive
}

get_drive_key(topic) {
  const room = this.get_room(topic)
  if (!room) return null
  return room.drive.key.toString('hex')
}

replicate(conn, topic) {
  const room = this.get_room(topic)
  if (!room) return
  try {
    room.store.replicate(conn)
    console.log("Corestore replication started for topic", topic)
  } catch(e) {
    console.log("Replicate error", e)
  }
}

async add_peer_drive(topic, peerDriveKeyHex, roomKey, dm = false) {
  const room = this.get_room(topic)
  if (!room) return
  if (room.peerDrives.has(peerDriveKeyHex)) return
  try {
    const peerDrive = new Hyperdrive(room.store, Buffer.from(peerDriveKeyHex, 'hex'))
    await peerDrive.ready()
    room.peerDrives.set(peerDriveKeyHex, peerDrive)
    console.log("Peer drive added:", peerDriveKeyHex.slice(0, 8))

    const self = this

    // Startup scan: process entries already replicated from previous sessions
    ;(async () => {
      try {
        for await (const entry of peerDrive.entries()) {
          const meta = entry.value.metadata
          await self.process_entry(meta, topic, peerDriveKeyHex, roomKey, dm, room)
        }
      } catch (e) {
        console.log('[storage.cjs] Startup scan error:', e)
      }
    })()

    // Live sync: watch for new entries as they replicate
    ;(async () => {
      try {
        for await (const [current, previous] of peerDrive.watch('/')) {
          for await (const entry of current.diff(previous.version, '/')) {
            if (!entry.left) continue
            const meta = entry.left.value.metadata
            await self.process_entry(meta, topic, peerDriveKeyHex, roomKey, dm, room)
          }
        }
      } catch {}
    })()
  } catch(e) {
    console.log("Error adding peer drive", e)
  }
}

async process_entry(meta, topic, peerDriveKeyHex, roomKey, dm, room) {
  if (!meta || !meta.hash) return
  if (Hugin.get_files().some(a => a.hash === meta.hash)) return
  if (this.downloading.has(meta.hash)) return

  const isMedia = MEDIA_TYPES.some(t => meta.fileName?.toLowerCase().endsWith(t.file))
  const autoSync = isMedia && (dm || Hugin.syncImages.some(a => a === topic))

  if (autoSync) {
    console.log('[storage.cjs] Auto-syncing:', meta.fileName)
    await this.save_from_peer(topic, meta, peerDriveKeyHex, roomKey, dm)
  } else if (!room.notifiedFiles.has(meta.hash)) {
    room.notifiedFiles.add(meta.hash)
    const remoteFile = {
      fileName: meta.fileName,
      address: meta.address,
      size: meta.size,
      topic,
      key: dm ? meta.address : topic,
      chat: meta.address,
      hash: meta.hash,
      name: meta.name,
      time: meta.time,
      driveKey: peerDriveKeyHex,
    }
    if (dm) {
      Hugin.send('remote-file-added', { chat: meta.address, remoteFiles: [remoteFile] })
    } else {
      Hugin.send('group-remote-file-added', { chat: roomKey, remoteFiles: [remoteFile] })
    }
  }
}

async save_from_peer(topic, file, peerDriveKeyHex, roomKey, dm = false) {
  if (Hugin.get_files().some(a => a.hash === file.hash)) return
  if (this.downloading.has(file.hash)) return
  this.downloading.add(file.hash)
  const room = this.get_room(topic)
  if (!room) { this.downloading.delete(file.hash); return }
  const peerDrive = room.peerDrives.get(peerDriveKeyHex)
  if (!peerDrive) { this.downloading.delete(file.hash); return }
  // Notify frontend so it can show progress bar
  Hugin.send('downloading', { fileName: file.fileName, chat: file.address, time: file.time, size: file.size, hash: file.hash })
  try {
    console.log("Fetching file from peer drive:", file.fileName)
    const buf = await peerDrive.get(file.hash, { timeout: 30000 })
    if (!buf) { this.downloading.delete(file.hash); return }
    if (this.saved + file.size > this.limit) { this.downloading.delete(file.hash); return }
    this.saved += file.size
    await room.drive.put(file.hash, buf, {
      metadata: {
        name: file.name,
        topic,
        time: file.time,
        size: file.size,
        hash: file.hash,
        fileName: file.fileName,
        address: file.address,
        signature: file.signature,
        info: 'file-shared',
        type: 'file'
      }
    })
    this.downloading.delete(file.hash)
    Hugin.file_info({ fileName: file.fileName, time: file.time, size: file.size, path: 'storage', hash: file.hash, topic })
    Hugin.send('download-file-progress', { fileName: file.fileName, chat: file.address, time: file.time, progress: 100 })
    Hugin.send('file-downloaded', JSON.stringify(file), false)
    this.done(file, topic, roomKey, dm)
    console.log("File saved from peer:", file.fileName)
  } catch(e) {
    this.downloading.delete(file.hash)
    console.log("Error saving file from peer:", e)
  }
}

async purge() {
  for(const a of this.drives) {
    await a.drive.purge()
  }
}

async load_files(topic) {
  const drive = this.get_drive(topic)
  if (!drive) return []
  for await (const entry of drive.entries()) {
  }
}

async load_meta(topic) {
  const data = []
  const drive = this.get_drive(topic)
  if (!drive) return []
  for await (const entry of drive.entries()) {
    data.push(entry.value.metadata)
  }
  return data
}

async load(hash, topic) {
  const drive = this.get_drive(topic)
  if (!drive) return
  const file = await drive.get(hash)
  if (file === null) return 'File not found'
  return file
}

async save(topic, address, name ,hash, size, time, fileName, path, signature, info, type, downloaded = false) {
  const drive = this.get_drive(topic)
  if (!drive) return
  console.log("****Save file to drive****")
  if (this.saved > this.limit) return
  if (downloaded) {
    const [media, type] = this.check(size, downloaded, fileName)
    if (!media) return
  }
  this.saved = this.saved + size
  console.log("Saved thus far:", this.saved)
  console.log("Saving bytes:", size)
  try {
    let buf
    if (!downloaded) {
     buf = await this.read(path)
    } else buf = downloaded
    if (!buf) return
    await drive.put(hash, buf, {metadata: {name ,topic, time, size, hash, fileName, address, signature, info, type}})
    Hugin.file_info({fileName, time, size, path, hash, topic})
  } catch(e) {
    return
  }
  console.log("Saved file")
}

async read(path) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = fs.createReadStream(path);
    stream.on('data', (a) => chunks.push(a));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', (err) => reject(err));
  });
}

check(size, buf, name) {
  if (buf.length > size) return false;
  if (size > this.limit) return false;
  for (const a of MEDIA_TYPES) {
    if (name.toLowerCase().endsWith(a.file)) {
      return [true, a.type];
    }
  }
  return [false];
}

done(file, topic, room, dm) {
  if (dm) {
    file.path = 'storage'
    file.saved = true
    saveMsg(`Downloaded ${file.fileName}`, file.address, false, file.time)
    Hugin.send('remote-file-added', { chat: file.address, remoteFiles: [file] })
    return
  }

  // Room auto-sync: file-downloaded (sent just before) already updated $files store.
  // Now send the message so isFile() attaches the $files entry → GroupMessage renders
  // DownloadFile with saved=true → loads and displays the image/audio/video.
  const mediaEntry = MEDIA_TYPES.find(t => file.fileName?.toLowerCase().endsWith(t.file))
  const fileType = mediaEntry ? mediaEntry.type : 'file'
  const message = {
    message: file.fileName,
    address: file.address,
    room,
    topic,
    timestamp: file.time,
    time: file.time,
    name: file.name,
    reply: '',
    hash: file.hash,
    sent: false,
    channel: 'channel',
    file: {
      fileName: file.fileName,
      path: 'storage',
      hash: file.hash,
      time: file.time,
      saved: true,
      topic,
      type: fileType,
    },
    tip: false,
    signature: '',
  }
  saveGroupMsg(message, false, false)
  Hugin.send('roomMsg', message)
}


}

function make_directory(directory, topic) {
  //If its the first time we create a core store
  const storage = `${directory}/corestorage`
  if (!fs.existsSync(storage)) {
    fs.mkdirSync(storage);
  }

  //If its the first time we join this topic
  const topicPath = `${storage}/${topic}`
  if (!fs.existsSync(topicPath)) {
    fs.mkdirSync(topicPath);
  }

  //Create filedirectory for this topic
  const filesPath = `${topicPath}/files`;
  if (!fs.existsSync(filesPath)) {
    fs.mkdirSync(filesPath);
  }

 //Create chat for this topic
  const chatPath = `${topicPath}/chat`
  if (!fs.existsSync(chatPath)) {
      fs.mkdirSync(chatPath);
  }

  return [filesPath, chatPath]
}


const Storage = new HyperStorage()

module.exports = {Storage}
