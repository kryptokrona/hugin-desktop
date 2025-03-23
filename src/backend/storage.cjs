
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
  { file: '.webp', type: 'video' },
  { file: '.mov', type: 'video' },
  { file: '.wmv', type: 'video' },
  { file: '.mkv', type: 'video' },
  { file: '.mpeg', type: 'video' },
  { file: '.m4a', type: 'audio' },
  { file: '.mp3', type: 'audio' },
  { file: '.wav', type: 'audio' },
];
const { get_new_peer_keys } = require('./crypto.cjs');
const userDataDir = app.getPath('userData')
const { Hugin } = require('./account.cjs');
const { saveGroupMsg, saveMsg } = require('./database.cjs');
const { sleep } = require('./utils.cjs');
const Hyperswarm = require('hyperswarm-hugin');


class HyperStorage {
  constructor() {
    this.drives = []
    this.limit = 100000000 //100 mb per session
    this.saved = 0
    this.beams = []
  }


async load_drive(topic) {
  const [filesPath, chatPath] = make_directory(userDataDir, topic)
  //Uss RAM instead for temp storage?
  if (this.loaded(topic)) return;
  const fileStore = new Corestore(filesPath)
  console.log("Loaded store path")
  console.log("Loading drive")
  const drive = new Hyperdrive(fileStore)
  this.add(drive, topic)
  await drive.ready()
}

add(drive, topic) {
  if (this.drives.some(a => a.topic === topic)) return
  console.log("Drive added")
  this.drives.push({drive, topic})
}

loaded(topic) {
  if (this.drives.length) {
    if (this.drives.some((a) => a.topic === topic)) return true;
  }
  return false;
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

get_drive(topic) {
  const found = this.drives.find(a => a.topic === topic)
  if (!found) return false
  return found.drive
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

async start_beam(upload, key, file, topic, room, dm) {
    const [base_keys, dht_keys, sig] = get_new_peer_keys(key)
    const topicHash = base_keys.publicKey.toString('hex')
    let beam
    try {
        beam = new Hyperswarm({ maxPeers: 1}, sig, dht_keys, base_keys)
        const announce = Buffer.alloc(32).fill(topicHash)
        const disc = beam.join(announce, {server: true, client: true})
        console.log("----::::::::::----")
        console.log(":::BEAM STARTED:::")
        console.log("----::::::::::----")
        beam.on('connection', async (conn, info) => {
          this.beams.push({key, beam, conn, topic})
          console.log("----:::::::::::::::::::----")
          console.log("------BEAM CONNECTED------")
          console.log("----:::::::::::::::::::----")
            if (upload) {
              this.upload(conn, file, topic)
            } else {
                await this.download(conn, file, topic, room, dm)
            }
        })
      

      
        beam.on('close', () => {
            console.log("** Beam closed **")
        })
        beam.on('error', (e) => {
            console.log("Beam error", e)
            this.close(key)
        })

        process.once('SIGINT', () => {
          this.close(key)
      })
  
        await disc.flushed()
    } catch(e) {
        console.log("Beam err", e) 
    }
}

async close (key) {
  await sleep(1000)
  const active = this.beams.find(a => a.key === key)
  if (!active) return

  try {
    active.conn.end()
    await active.beam.leave(Buffer.from(active.topic))
    await active.beam.destroy()
  } catch(e) {
    return
  }
  
  const filter = this.beams.filter(a => a.key !== key)
  this.beams = filter
  console.log("XXXXXXXXXXXXXXX")
  console.log("--BEAM CLOSED--")
  console.log("XXXXXXXXXXXXXXX")
}



async upload(conn, file, topic) {
    console.log("***********SEND DATA*****************")
    const send = await this.load(file.hash, topic)
    console.log("Send this file", send)
    const CHUNK_SIZE = 1000000
    const start = () => {
      if (send.length > CHUNK_SIZE) {
        const chunks = split(send)
        let i = 0
        for (const c of chunks) {
         write(c)
        }
       } else write(send)
        
    }

    function write(chunk) {
      try {
        conn.write(chunk)
      } catch(e) {
        console.log("Error writing data.")
      }
    }

  function split(buf, size = CHUNK_SIZE) {
      let chunks = [];
      for (let i = 0; i < buf.length; i += size) {
          chunks.push(buf.slice(i, i + size));
      }
      return chunks;
  }

  
  conn.on('data', (data) => {
    if (data.toString() === 'Done') {
      this.close(file.key);
    }
  });
  
  start()
}

async download(conn, file, topic, room, dm) {
  console.log("Download file", file)
  
  let downloaded = 0
  const buf = []

  conn.on('data', async (data) => {
    console.log("*********************")
    console.log("****BEAM DATA INC****")
    console.log("*********************")
  
    console.log("-_-__---___--__--")
    console.log("---DOWNLOADING----")
    console.log("_-_----_---__-_--")
    
    downloaded += data.length
    console.log("DONWLOADED", downloaded)
    if (downloaded > file.size) {
      console.log("********Limit! ******")
      return true
    }
    console.log("Pushin data")
    buf.push(data)
    if (downloaded === file.size) {
      const buffer = Buffer.concat(buf)
      await this.save(
        topic,
        file.address,
        file.name,
        file.hash,
        file.size,
        file.time,
        file.fileName,
        'storage',
        file.signature,
        'file',
        'file-shared',
        buffer
    )
    Hugin.send('file-downloaded', JSON.stringify(file), false)

    this.done(file, topic, room, dm, true)
    this.close(file.key)
    conn.write('Done')
    }
  })
}

done(file, topic, room, dm) {
  
  if (!dm) {
    const message = {
      message: file.fileName,
      address: file.address,
      group: room,
      topic,
      time: file.time.toString(),
      name:  file.name,
      reply: '',
      hash: file.hash,
      sent: false,
      channel: 'Room',
      file: true,
      tip: false,
    }
    Hugin.send('roomMsg', message)
    saveGroupMsg(message, false, false)

  } else {
    file.path = 'storage'
    file.saved = true
    let data = {chat: file.address, remoteFiles: [file]}
    Hugin.send('remote-file-added', data)
    const msg = saveMsg(`Downloaded ${file.fileName}`, file.address, false, file.time)
  }
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