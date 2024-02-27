const HyperSwarm = require("hyperswarm");
const DHT = require('@hyperswarm/dht')
const progress = require("progress-stream");
const {createWriteStream, createReadStream} = require("fs");
const { sleep, trimExtra, sanitize_join_swarm_data, sanitize_voice_status_data, hash, randomKey, sanitize_file_message, toHex } = require('./utils.cjs');
const {saveGroupMsg, getChannels} = require("./database.cjs")
const {
    ipcMain
} = require('electron')
const {verifySignature, decryptSwarmMessage, signMessage, keychain} = require("./crypto.cjs")
const { 
    expand_sdp_answer, 
    expand_sdp_offer, 
    parse_sdp } = require("./sdp.cjs")
   
let LOCAL_VOICE_STATUS_OFFLINE = [JSON.stringify({voice: false, video: false, topic: "",})]

const Keychain = require('keypear');
const { add_local_file, start_download, add_remote_file, send_file } = require("./beam.cjs");
const { Hugin } = require("./account.cjs");

let localFiles = []
let remoteFiles = []
let active_swarms = []
let active_voice_channel = LOCAL_VOICE_STATUS_OFFLINE
let downloadDirectory
let sender
let chat_keys
let my_address
let my_name = ""

async function send_voice_channel_sdp(data) {
    const active = active_swarms.find(a => a.topic === data.topic)
    if (!active) return
    const con = active.connections.find(a => a.address === data.address)
    if (!con) return
    //We switch data address because in this case, it is from, we can change this
    data.address = my_address
    con.connection.write(JSON.stringify(data))
}

const send_voice_channel_status = async (joined, status) => {
    const active = active_swarms.find(a => a.key === status.key)
    if (!active) return
    const msg = active.topic
    const sig = await signMessage(msg, keychain.getXKRKeypair().privateSpendKey)
    const data = JSON.stringify({
        address: my_address,
        signature: sig,
        message: msg,
        voice: joined,
        topic: active.topic,
        name: my_name,
        video: status.video
    })
    
    update_local_voice_channel_status(data)

    //Send voice channel status to others in the group
    send_swarm_message(data, status.key)

    //If we joined the voice channel, make a call to those already announced their joined_voice_status
    if (joined) { 
   
        //If no others active in the voice channel, return
        if (!active.connections.some(a => a.voice === true)) return
        console.log("Updating active voice connections...")
        //Check whos active and call them individually
        let active_voice = active.connections.filter(a => a.voice === true && a.address)
        console.log("Active connections in voice channel...", active_voice)
        active_voice.forEach(async function(user) {
            console.log("Joining voice with:", user.address)
            await sleep(100)
            //Call to VoiceChannel.svelte
            join_voice_channel(status.key, active.topic, user.address)
        })


    }
    
    console.log("Sent joined voice message", data)
}

const join_voice_channel = (key, topic, address) => {
    //"Join the voice channel in with webRTC"
    sender("join-voice-channel", {key, topic, address})
}


const new_swarm = async (data, ipc) => {
    sender = ipc
    return await create_swarm(data)
}

const update_local_voice_channel_status = (data) => {
    const updated = data
    active_voice_channel = [updated]
    return true
}

const end_swarm = async (key) => {
    const active = active_swarms.find(a => a.key === key)
    if (!active) return
    const topic = active.topic
    sender('swarm-disconnected', topic)
    console.log("Ending active swarm", topic)
    update_local_voice_channel_status(LOCAL_VOICE_STATUS_OFFLINE)
    
    active.connections.forEach(chat => {
        console.log("Disconnecting from:", chat.address)
        chat.connection.write(JSON.stringify({type: "disconnected"}))
    })
  

    await active.swarm.leave(Buffer.from(topic))
    await active.discovery.destroy()
    await active.swarm.destroy()
    const still_active = active_swarms.filter(a => a.topic !== topic)
    active_swarms = still_active
    console.log("***** Ended swarm *****")
}

const create_swarm = async (data) => {
    const key = data.key
    const name = data.name

    my_address = data.address
    my_name = name

    let discovery
    let swarm

    const [base_keys, dht_keys, sig] = get_new_peer_keys(key)
    const hash = base_keys.publicKey.toString('hex')

    //We add sig, keys and keyPair is for custom firewall settings.
    try {
        swarm = new HyperSwarm({firewall (remotePublicKey, payload) {
            //We are already checking payloads in hyperswarm
            if (payload !== null) {
                //Moved checkKey to hyperswarm
            }
            //Allow connection
            return false
        }}, sig, dht_keys, base_keys)
    } catch (e) {
        console.log('Error starting swarm')
        return
    }
    
    const startTime = Date.now().toString()

    sender('swarm-connected', {topic: hash, key, channels: [], voice_channel: [], connections: [], time: startTime})
    
    //The topic is public so lets use the pubkey from the new base keypair

    active_swarms.push({key, topic: hash, connections: [], call: [], time: startTime})
    let active = active_swarms.find(a => a.key === key) 
    active.swarm = swarm
    
    sender('set-channels')

    swarm.on('connection', (connection, information) => {
        console.log("New connection ", information)
        new_connection(connection, hash, key, name)

    })

    process.once('SIGINT', function () {
        swarm.on('close', function () {
            process.exit();
        });
        swarm.destroy();
        setTimeout(() => process.exit(), 2000);
    });
    
    let topic = Buffer.alloc(32).fill(hash)
    discovery = swarm.join(topic, {server: true, client: true})
    active.discovery = discovery
    await discovery.flushed()
    check_if_online(hash)
}

const new_connection = (connection, hash, key, name) => {
    console.log("New connection incoming")
    let active = get_active_topic(hash)
    
    if (!active) {
        console.log("no longer active in topic")
        connection_closed(connection, hash)
        return
    }

    console.log("*********Got new Connection! ************")
    active.connections.push({connection, topic: hash, voice: false, name: "", address: "", video: false})
    send_joined_message(key, hash, my_address)
    //checkIfOnline(hash)
    connection.on('data', async data => {

        incoming_message(data, hash, connection, key)

    })

    connection.on('close', () => {
        console.log("Got close signal")
        connection_closed(connection, hash)
    })

    connection.on('error', () => {
        console.log("Got error connection signal")
        connection_closed(connection, hash)
    })

}

const connection_closed = (conn, topic) => {
    console.log("Closing connection...")
    let active = get_active_topic(topic)
    if (!active) return
    try {
        conn.end()
        conn.destroy()
    } catch (e) {
        console.log("failed close connection")
    }
    const user = active.connections.find(a => a.connection === conn)
    if (!user) return
    sender("close-voice-channel-with-peer", user.address)
    sender("peer-disconnected", {address: user.address, topic})
    let still_active = active.connections.filter(a => a.connection !== conn)
    console.log("Connection closed")
    console.log("Still active:", still_active)
    active.connections = still_active
}

const get_active_topic = (topic) => {
    const active = active_swarms.find(a => a.topic === topic)
    if (!active) return false
    return active
}

const check_data_message = async (data, connection, topic) => {

    try {
        data = JSON.parse(data)
    } catch (e) {
        return false
    }

    //Check if active in this topic
    let active = get_active_topic(topic)
    if (!active) return "Error"

    //Check if this connection is still in our list
    let con = active.connections.find(a => a.connection === connection)
    if (!con) return "Error"
    
    //If the connections send us disconnect message, return. **todo double check closed connection
    if ('type' in data) {
        if (data.type === "disconnected") {
            console.log("Got disconnected message!", data)
            connection_closed(connection, active.topic)
            return true
        }
    }

    if ('info' in data) {
        const fileData = sanitize_file_message(data)
        console.log("error?", fileData)
        if (!fileData) return "Error"
        console.log("******* Connection address ********", con.address)
        check_file_message(fileData, topic, con.address)
        return
    }

    //Double check if connection is joined voice?
    if ('offer' in data) {
        console.log("GOt offer or answer!!")
        //Check if this connection has voice status activated.
        if (active.connections.some(a => a.connection === connection && a.voice === true)) {
            const [voice, video] = get_local_voice_status(topic)
            if ((!voice && !video) || !voice) {
                console.log("Not active! ***************")
                //We are not connected to a voice channel
                //Return true bc we do not need to check it again
                return true
            }

            //There are too many in the voice call
            let users = active.connections.filter(a => a.voice === true)
            if (users.length > 9) return true

                //Joining == offer
            if (data.offer === true) {
                console.log("Answer call")
                if ('retry' in data) {    
                    if (data.retry === true) {
                        console.log("Retry connection!")
                        sender('got-expanded-voice-channel', [data.data, data.address])
                        return
                    }
                }
                answer_call(data)
            } else {
                console.log("Got answer!")
                //Already in voice == answer
                got_answer(data)
            }
        }
        return true
    }

    if (typeof data === "object") {

        if ('joined' in data) {

            let joined = sanitize_join_swarm_data(data)
            if (!joined) return "Error"

            if (con.joined) {
                //Connection is already joined
                return
            }

            //Check signature
            const verified = await verifySignature(joined.message, joined.address, joined.signature)
            if(!verified) return "Error"
            con.joined = true
            console.log("joined address", joined.address)
            con.address = joined.address
            con.name = joined.name
            con.voice = joined.voice

            let time = parseInt(joined.time)
            //If our new connection is also in voice, check who was connected first to decide who creates the offer
            let [in_voice, video] = get_local_voice_status(topic)
            if (con.voice && in_voice && (parseInt(active.time) > time)  ) {
                join_voice_channel(active.key, topic, joined.address)
            }

            con.video = joined.video
            console.log("Connection updated: Joined:", con.joined)
            sender("peer-connected", joined)
        }

        if ('voice' in data) {
            let voice_status = check_peer_voice_status(data, con)
            if (!voice_status) return "Error"
   
        }

    }

    return false
}

const check_peer_voice_status = (data, con) => {
    let voice_data = sanitize_voice_status_data(data) 
    console.log("Not voice data", voice_data)
    if (!voice_data) return false
    let updated = update_voice_channel_status(voice_data, con)
    if (!updated) return false
    return true
}


const update_voice_channel_status = (data, con) => {

    ////Already know this status
    if (data.voice === con.voice) return true
    //Just doublechecking the address
    if (data.address !== con.address) return false
    //Set voice status
    con.voice = data.voice
    con.video = data.video
    console.log("Updating voice channel status for this connection:", con.voice)
    //Send status to front-end
    sender("voice-channel-status", data)
    return true
}

const answer_call = (offer) => {
    sender('answer-voice-channel', offer)
}

const got_answer = (answer) => {
    sender('got-answer-voice-channel', answer)
}

const get_local_voice_status = (topic) => {
    let voice = false
    let video = false
    let channel
    //We do this bc stringified data is set locally from the status messages.
    //This can change 
    try {
        channel = JSON.parse(active_voice_channel[0])
        if (channel.topic !== topic) return [false, false]
    } catch (e) {
        return [false]
    }

    console.log("channel video", channel)

    voice = channel.voice
    video = channel.video

    return [voice, video, topic]
}

const get_my_channels = async (key) => {
    const c = await getChannels()
    let uniq = {}
    const channels_messages = c.filter(a => a.room === key)
    const channels = channels_messages.filter((obj) => !uniq[obj.channel] && (uniq[obj.channel] = true))
    return channels.map(a => { if (a.channel === "Chat room") return a.channel })
}

const send_joined_message = async (key, topic, my_address) => {
    //Use topic as signed message?
    const msg = topic
    const active = get_active_topic(topic)
    if (!active) return
    const sig = await signMessage(msg, keychain.getXKRKeypair().privateSpendKey)
    let [voice, video] = get_local_voice_status(topic)
    if (video) voice = true
    //const channels = await get_my_channels(key)
    console.log("Got local voice", voice)
    console.log("Got local video", video)

    console.log("Voice", voice)
    const data = JSON.stringify({
        address: my_address,
        signature: sig,
        message: msg,
        joined: true,
        topic: topic,
        name: my_name,
        voice: voice,
        channels: [],
        video: video,
        time: active.time
    })
    console.log("Sent joined mesg", data)
    send_swarm_message(data, key)
}

const incoming_message = async (data, topic, connection, key) => {
    const str = new TextDecoder().decode(data);
    if (str === "Ping") return
    const check = await check_data_message(data, connection, topic)
    if (check === "Error") {
        connection_closed(connection, topic)
    }
    if (check) return
    const hash = str.substring(0,64)
    let [message, time, hsh] = await decryptSwarmMessage(str, hash, key)
    if (!message) return
    const msg = await saveGroupMsg(message, hsh, time, false, true)
    if (!msg) return
        //Send new board message to frontend.
        sender('groupRtcMsg', msg)
        sender('newGroupMessage', msg)

}


const send_swarm_message = (message, key) => {
    console.log("Sending swarm msg", message)
    let active = active_swarms.find(a => a.key === key)
    if (!active) return
    active.connections.forEach(chat => {
        try {
            console.log("Writing to channel")
            chat.connection.write(message)
        } catch(e) {
            errorMessage('Connection offline')
        }
    })

    console.log("Swarm msg sent!")
}

const check_if_online = (topic) => {
    let interval = setInterval(ping, 10 * 1000)
    function ping() {
        let active = active_swarms.find(a => a.topic === topic)
        if (!active) {
            clearInterval(interval)
            return
        } else {
            active.connections.forEach((a) => a.connection.write('Ping'))
        }
    }
}

const upload_ready = async (file, topic, address) => {
    const beam_key = await add_local_file(file.fileName, file.path, address, file.size, file.time, true)
    const info = {
        fileName: file.fileName,
        address,
        topic,
        info: "file",
        type: "upload-ready",
        size: file.size, 
        time: file.time,
        key: beam_key
    }
    send_file_info(address, topic, info)
    return beam_key
    
}

ipcMain.on('group-download', (e, download) => {
    request_download(download)
})

ipcMain.on('group-upload', async (e, fileName, path, topic, size, time, hash) => {
    const upload = {
        fileName, path, topic, size, time, hash
    }
    console.log("Upload this file to group", upload)
    share_file(upload)
})

const get_active = (key) => {
    return active_swarms.find(a => a.key === key)
}

const request_download = (download) => {
    const active = get_active_topic(download.key)
    const address = download.chat
    const topic = active.topic
    const info = {
        fileName: download.fileName,
        address: my_address,
        topic: topic,
        info: "file",
        type: "download-request",
        size: download.size,
        time: download.time,
        key: download.key
    }
    send_file_info(address, topic, info)

}

const send_file_info = (address, topic, file) => {
    console.log("send file info", file)
    const active = active_swarms.find(a => a.topic === topic)
    if (!active) errorMessage('Swarm is not active')
    const con = active.connections.find(a => a.address === address)
    if (!con) errorMessage('Connection is closed')
    con.connection.write(JSON.stringify(file))
}


const share_file = (file) => {
    const active = get_active_topic(file.topic)
    const fileInfo = {
        fileName: file.fileName,
        address: my_address,
        topic: file.topic,
        info: 'file-shared',
        type: 'file',
        size: file.size,
        time: file.time,
        hash: file.hash
    }
    const info = JSON.stringify(fileInfo)
    localFiles.push(file)
    //File shared, send info to peers
    send_swarm_message(info, active.key)
}


const start_upload = async (file, topic) => {
    const sendFile = localFiles.find(a => a.fileName === file.fileName && file.topic === topic)
    if (!sendFile) {
        errorMessage('File not found')
        return
    }
    return await upload_ready(sendFile, topic, file.address)
}

const check_file_message = async (data, topic, address) => {

    const type = data.type
    const info = data.info

    if (type === 'file') console.log("data file inf incoming", data)

    if (info === 'file-shared') {
        console.log("Peer added new file", data)
        add_remote_file(data.fileName, address, data.size, topic, true, data.hash)
    }

    if (info === 'file-removed') console.log("'file removed", data)

    if (type === 'upload-ready') {
        console.log("address! upload ready", address)
        await add_remote_file(data.fileName, address, data.size, data.key, true)
        start_download(Hugin.downloadDir, data.fileName, address, data.key)
    }

    if (type === 'download-request') {
        const key = await start_upload(data, topic)
        send_file(data.fileName, data.size, address, key, true)
    }

}


const errorMessage = (message) => {
    sender('error-notify-message', message)
}

ipcMain.on('join-voice', async (e, data) => {
    console.log("Join voice", data.key)
    send_voice_channel_status(true, data)
})

ipcMain.on('exit-voice', async (e, key) => {
    console.log("exit voice", key)
    
    //Double check if we are active in voice or if the swarm is still active
    const active = active_swarms.find(a => a.key === key)
    if (!active) return
    const [in_voice] = get_local_voice_status(active.topic)
    if (!in_voice) return
    
    //We should only be active in one channel. Close all connections
    sender('leave-active-voice-channel')
    sender("leave-voice-channel")
    send_voice_channel_status(false, {key: key, video: false})
})

ipcMain.on('get-sdp-voice-channel', async (e, data) => {
   get_sdp(data)
})

ipcMain.on('new-channel', async (e, data) => {
   console.log("New channel!", data)
   sender('channel-created', data)
 })

ipcMain.on('expand-voice-channel-sdp', async (e, expand) => {
    //This roundtrip is not needed when we do not expand sdps anymore
    let [data, address] = expand
    let expanded_data = [data, address]
    sender('got-expanded-voice-channel', expanded_data)
 })
 

function get_sdp(data) {

    console.log("Get sdp!", data.retry)

    let sendMessage
    let offer = true
    let reconnect = false

    if ('retry' in data) {
        if (data.retry === true) reconnect = true
    }
    
    if (data.type == 'answer') {
        offer = false
    }

    if ('renegotiate' in data.data) {
        offer = false
    } 

    sendMessage = {
        data: data.data,
        offer: offer,
        address: data.address,
        topic: data.topic,
        retry: reconnect,
    }

    console.log("Send voice channel sdp reconnect?:", sendMessage.retry)
    send_voice_channel_sdp(sendMessage)
}

function get_sub_key(keys, tweak) {
    const random_buf = Buffer.alloc(32).fill(tweak)
    const sub = keys.sub(random_buf).get()
    return sub
}

function create_peer_base_keys(buf) { 
    const keypair = DHT.keyPair(buf)
    const keys = Keychain.from(keypair) 
    return keys
}

function get_new_peer_keys(key) {
    const secret = Buffer.alloc(32).fill(key)
    const base_keys = create_peer_base_keys(secret)
    const random_key = Buffer.alloc(32).fill(randomKey())
    const dht_keys = create_peer_base_keys(random_key)
    //Sign the dht public key with our base_keys
    const signature = base_keys.get().sign(dht_keys.get().publicKey)
    return [base_keys, dht_keys, signature]
}


module.exports = {new_swarm, send_swarm_message, end_swarm}