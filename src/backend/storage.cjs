
const Corestore = require('corestore')
const Hyperdrive = require('hyperdrive')
const fs = require('fs');
const { app } = require('electron');
const MEDIA_TYPES = ['.png','.jpg','.gif', '.jpeg', '.jfif', '.mp4', '.webm', '.avi', '.webp', '.mov','.wmv', '.mkv', '.mpeg']
const { hash } = require('hyperdht');
const { get_new_peer_keys } = require('./crypto.cjs');
const userDataDir = app.getPath('userData')
const Huginbeam = require("huginbeam");
const { Readable } = require('streamx');
const { Hugin } = require('./account.cjs');
const { saveGroupMsg } = require('./database.cjs');
const { sleep } = require('./utils.cjs');


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
  console.log("topic", topic)
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

async save(topic, address, hash, size, time, fileName, path, signature, info, type, downloaded = false) {
  const drive = this.get_drive(topic)
  if (!drive) return
  console.log("****Save file to drive****")
  if (this.saved > this.limit) return
  if (downloaded) {
    if (!this.check(size, downloaded, fileName)) return
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
    await drive.put(hash, buf, {metadata: {topic, time, size, hash, fileName, address, signature, info, type}})
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
  if (buf.length > size) return false
  if (size > this.limit) return false
  for (const a of MEDIA_TYPES) {
      if (name.toLowerCase().endsWith(a)) {
          return true
      }
  }
  return false
}

async start_beam(upload, key, file, topic, name, room) {
    console.log("----::::::::::----")
    console.log("::::START BEAM::::")
    console.log("----::::::::::----")
    console.log("")
    const [base_keys, dht_keys, sig] = get_new_peer_keys(key)
    const options = { upload, dht_keys, base_keys, sig };
    try {
        const beam = new Huginbeam(key, options)
        this.beam_started(beam, upload, key, topic, file, name, room)
        beam.write('Start')
        return true

    } catch(e) {
        console.log("Beam err", e)
        return false
    }
}

async beam_started(beam, upload, key, topic, file, name, room) {
  console.log("----::::::::::----")
  console.log(":::BEAM STARTED:::")
  console.log("----::::::::::----")
  beam.on('connected', async () => {
    console.log("----:::::::::::::::::::----")
    console.log("------BEAM CONNECTED------")
    console.log("----:::::::::::::::::::----")
    if (upload) {
      //upload
      this.upload(beam, file, topic)
    } else {
      this.download(beam, file, topic, name, room)
    }
  })

  const close = async () => {
      console.log("XXXXXXXXXXXXXXX")
      console.log("--BEAM CLOSED--")
      console.log("XXXXXXXXXXXXXXX")
      beam.end()
      await sleep(2000)
      beam.destroy()
  }

  beam.on('close', () => {
      console.log("** Beam closed **")
  })
  beam.on('error', (e) => {
      console.log("Beam error", e)
      close()
  })

}

async upload(beam, file, topic) {
    console.log("***********SEND DATA*****************")
    const send = await this.load(file.hash, topic)
    const stream = Readable.from(send)
    stream.on('data', data => {
        console.log("Sending data ------>", data)
        beam.write(data)
    })
}

async download(beam, file, topic, name, room) {
  console.log("Download file", file)
  beam.on('data', async (data) => {
    console.log("*********************")
    console.log("****BEAM DATA INC****")
    console.log("*********************")
    
    if (data.length < 20) {
      if (data.toString() === "Start") return
    }
    const buf = []
    let downloaded = 0
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
    Hugin.send('file-downloaded', file)
    const message = {
      message: file.fileName,
      address: file.address,
      group: room,
      topic,
      time: file.time.toString(),
      name:  name,
      reply: '',
      hash: file.hash,
      sent: false,
      channel: 'Room',
      file: true,
      tip: false,
  }
    Hugin.send('roomMsg', message)
    saveGroupMsg(message, false, false)
    }
  })
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