<script>
import wrtc from '@koush/wrtc'
import Peer from 'simple-peer'
import { audioLevel, user, webRTC } from '$lib/stores/user.js'
import { onMount } from 'svelte'
import { rtcgroupMessages } from '$lib/stores/rtcgroupmsgs.js'
import { videoGrid } from '$lib/stores/layout-state.js'
import { sleep } from '$lib/utils/utils'
import { mediaSettings, videoSettings, audioSettings, video } from '$lib/stores/mediasettings'

onMount(() => {
    checkSources()
})

window.api.receive('answer-call', (msg, contact, key, offchain) => {
    answerCall(msg, contact, key, offchain)
})

window.api.receive('start-call', (conatct, calltype, invite = false) => {
    startCall(conatct, calltype, invite)
})

window.api.receive('start-room', (video) => {
    createRoom(video)
})

window.api.receive('endCall', (s, p, this_call) => {
    endCall('peer', 'stream', this_call)
})

window.api.receive('screen-share', (id) => {
    shareScreen(id)
})

window.api.receive('set-camera', () => {
    changeCamera(true, $mediaSettings.cameraId)
})

window.api.receive('set-audio-input', (id) => {
    changeAudio(id)
})

window.api.receive('check-src', () => {
    checkSources()
})

window.api.receive('set-audio-input', (src, input) => {
        if (!input) return
        changeAudio(src)
    })

window.api.receive('change-source', (src, add) => {
    console.log('want to change in calls', src)
    changeCamera(true, src, add)
})
//Got expanded offer sdp. Signal in data channel
window.api.receive('got-expanded', async (callData) => {
    console.log('caller expanded', callData)
    let [data, address] = callData
    signalPeerChannel(address, data)
})

//Awaits answer sdp, Signal to data channel
window.api.receive('got-callback', (callerdata) => {
    let callback = callerdata.data
    let address = callerdata.chat
    signalPeerChannel(address, callback)
})


window.api.receive('rtc_message', (msg, to_group = false) => {
    sendRtcMessage(msg, to_group)
})

//Update device list on change
navigator.mediaDevices.ondevicechange = () => {
    checkSources()
}

const startCall = async (contact, isVideo, invite = false, screenshare = false) => {
    // spilt input to addr and pubkey

    let contact_address = contact.substring(0, 99)
    if (invite) {
        let call = { chat: contact_address, type: 'invite' }
        $webRTC.call.unshift(call)
    }

    //If we have an active room, use that stream instead of creating a new one.
    if ($webRTC.call.some(a => a.type == "room")) {
        let stream = $webRTC.myStream
        let filter = $webRTC.call.filter(a => a.type !== "room")
        $webRTC.call = filter
        gotMedia(stream, contact, isVideo, false)
        return
    }

    if ($webRTC.initiator) {
        sendInviteNotification(contact, contact_address)
    }

     if ($webRTC.call.length > 1) {
        gotMedia($webRTC.myStream, contact, isVideo, false)
        return
    }

    console.log('Starting call..')

    //Get video/voice stream
    navigator.mediaDevices
        .getUserMedia({
            video: isVideo,
            audio: {
                googNoiseSupression: true,
            },
        })
        .then(function (stream) {
            gotMedia(stream, contact, isVideo, screenshare)
        })
        .catch(() => {
            console.log('error', stream)
        })
}

function startDataChannel(video, this_call, contact) {
    let channel = new Peer({
        initiator: true,
        trickle: false,
        wrtc: wrtc,
        config: { iceServers: [{ urls: 'stun:stun.bahnhof.net:3478' }, { urls: 'stun:global.stun.twilio.com:3478' }] },
    })
    const address = this_call.chat
    this_call.channel = channel
        //Check status for offer

    let group = false
    let offchain = false

    if ($webRTC.groupCall && $webRTC.call.length > 1 && $webRTC.call[0].type == 'invite') {
        offchain = true
        group = true
    }
    
    sendOffer(channel, contact, video, group, offchain)
    return channel
}

async function answerDataChannel(msg, address, key, video, offchain, peer2, this_call) {

    let channel = new Peer({trickle: false, wrtc: wrtc })
    this_call.channel = channel
    //Data channel
 
    channel.on('connect', async () => {
        this_call.channel_connected = true
        console.log("Data channel connected!")
        channel._channel.addEventListener('message', (event) => {
        checkMessage(event, address)
        })
    })
    
    peer2.on('signal', (data) => {
        let dataToSend = {
            data: data,
            type: 'answer',
            contact: address + key,
            video: video,
            offchain: offchain,
            group: group,
        }

        sendPeerMessage(dataToSend, address)
        return
    })
    
    let group = false

    if (offchain) {
        group = true
    }
    

    sendAnswer(msg, address, channel, key, video, offchain, group, true)
    return channel
}

async function gotMedia(stream, contact, isVideo, screen_stream = false) {

    $webRTC.myStream = stream
    let this_call = getActive(contact.substring(0, 99))
    if (isVideo) {
        $videoSettings.myVideo = true
        $video.play = true
        if (screen_stream) {
            let id = await window.api.shareScreen(true)
            shareScreen(id)
        }
    } else {
        console.log('Audio call')
    }


    const channel = startDataChannel(isVideo, this_call, contact)
    let peer1

    //Data channel connect event
    channel.on('connect', async () => {

        console.log("Data channel connected!")
        //Set datachannel connected 
        this_call.channel_connected = true
        //Start voice/video peer
        peer1 = await startPeer1(stream, isVideo, contact)
        this_call.peer = peer1
        //Got offer signal
            peer1.on('signal', (data) => {

                let dataToSend = {
                    data: data,
                    type: 'offer',
                }
                
                //Send offer via first data channel
                sendPeerMessage(dataToSend, contact.substring(0,99))
            })

            peer1.on('stream', (peerStream) => {
                console.log(' Got peerstream object in store')

                //Set peerStream to store
                this_call.peerStream = peerStream
                if (isVideo) {
                    $videoGrid.showVideoGrid = true

                } else {
                }
                //Set video true for UI
                this_call.peerVideo = true
        })
    })

    //Data channel
    channel._channel.addEventListener('message', (event) => {
        checkMessage(event, contact.substring(0,99))
    })

    checkMyVolume(stream)
    //Set webRTC store update for call

    this_call.screen_stream = screen_stream
    this_call.video = video
    this_call.myStream = stream

    console.log('This call', this_call)
    checkSources()
    $webRTC.active = true
}

async function startPeer1(stream, video, contact) {
    let peer1 = new Peer({
        stream: stream,
        offerOptions: { offerToReceiveAudio: true, offerToReceiveVideo: true },
        initiator: true,
        trickle: false,
        wrtc: wrtc,
        config: { iceServers: [{ urls: 'stun:stun.bahnhof.net:3478' }, { urls: 'stun:stun.ipfire.org:3478' }] },
    })

    peer1.on('close', (e) => {
        console.log(e)
        console.log('Connection lost..')
        endCall(peer1, stream)
        // ENDCALL AUDIO
    })

    peer1.on('error', (e) => {
        console.log(e)
        console.log('Connection lost..')

        endCall(peer1, stream)
        // ENDCALL AUDIO
    })

    peer1.on('connect', async () => {
        // SOUND EFFECT
        window.api.successMessage('Call established')
        $webRTC.call[0].connected = true    
        checkVolume(peer1)
        console.log('Connection established')
        if (!$webRTC.invited) {
            inviteToGroupCall(peer1)
        }
        if ($webRTC.call.length > 1) {
            $webRTC.group = true
        }
    })

    //Data channel
    peer1._channel.addEventListener('message', (event) => {
        checkMessage(event, contact.substring(0,99))
    })


    //sendOffer(peer1, contact, video, group, offchain)

    return peer1
}

const answerCall = (msg, contact, key, offchain = false) => {

    let isVideo = false
    if (msg.substring(0, 1) === 'Δ') {
        isVideo = true
    }
    $videoSettings.myVideo = isVideo

    // get video/voice stream
    navigator.mediaDevices
        .getUserMedia({
            video: isVideo,
            audio: {
                googNoiseSupression: true,
            },
        })
        .then(gotMedia)
        .catch(() => {})
    console.log('Got media')

    async function gotMedia(stream) {
        let this_call = getActive(contact)
        let peer2 = await startPeer2(stream, isVideo, this_call)
        answerDataChannel(msg, contact, key, isVideo, offchain, peer2, this_call)
        checkMyVolume(stream)
        checkSources()
        //Set webRTC store update for call
        this_call.peer = peer2
        this_call.myStream = stream
        this_call.video = isVideo
        
        $webRTC.myStream = stream
        $webRTC.active = true

        if (isVideo) {
            $video.play = true
            $videoSettings.myVideo = true
            $videoGrid.showVideoGrid = true
        }
    }
}


function addVideoTrack(device, stream) {
    $webRTC.call.forEach(a => {
        a.peer.addTrack(device.getVideoTracks()[0], stream)
    })
}

async function startPeer2(stream, video, this_call) {
    console.log('Starting peer 2')
    let peer2 = new Peer({
            stream: stream,
            answerOptions: { offerToReceiveAudio: true, offerToReceiveVideo: true },
            trickle: false,
            wrtc: wrtc
         })

    peer2.on('close', (e) => {
        console.log('Connection closed..', e)
        endCall(peer2, stream)
    })

    peer2.on('error', (e) => {
        console.log('Connection lost..', e)
        endCall(peer2, stream)
    })

    
    //Voice/Video connection event
    peer2.on('connect', async () => {
    
        window.api.successMessage('Call established')
        console.log('Connection established;')
        this_call.connected = true
        updateStore()
        checkVolume(peer2)
        if ($webRTC.call.length > 1) {
            $webRTC.group = true
        }

        //Data channel
        peer2._channel.addEventListener('message', (event) => {
            checkMessage(event, this_call.chat)
        })       

    })

    peer2.on('stream', async (peerStream) => {
        // got remote video stream, now let's show it in a video tag

        this_call.peerStream = peerStream
        
        if (video) {
            $videoGrid.showVideoGrid = true
        }
        //Set video true for UI
        this_call.peerVideo = true
        updateStore()
        $videoSettings.myVideo = true
        console.log('Setting up link..')
    })

    return peer2
}

function updateStore() {
    $webRTC.call = $webRTC.call
}

function sendOffer(peer, contact, video, group = false, offchain = false) {

    peer.on('signal', (data) => {
        let dataToSend = {
            data: data,
            type: 'offer',
            contact: contact,
            video: video,
            group: group,
            offchain: offchain,
        }

        if ($webRTC.call.some(a => a.chat === contact.substring(0,99) && a.channel_connected)) {
            sendPeerMessage(dataToSend, address)
            return
        }

        window.api.send('get-sdp', dataToSend)
    })
}

function sendAnswer(sdpOffer, address, peer, key, video, offchain = false, group = false, channel = false) {
    
    if (channel) window.api.expandSdp(sdpOffer, address)

    if ($webRTC.groupCall && !$webRTC.invited) {
        group = $webRTC.groupCall
    }

    peer.on('signal', (data) => {
        let dataToSend = {
            data: data,
            type: 'answer',
            contact: address + key,
            video: video,
            offchain: offchain,
            group: group,
        }

        if ($webRTC.call.some(a => a.chat === address && a.channel.connected)) {
            sendPeerMessage(dataToSend, address)
            return
        }

        window.api.send('get-sdp', dataToSend)
    })
}

async function startLocalVideo() {
       //Get video/voice stream
       navigator.mediaDevices
        .getUserMedia({
            video: true,
            audio: {
                googNoiseSupression: true,
            },
        })
        .then(function (stream) {
            $webRTC.myStream = stream
        })
        .catch((e) => {
            console.log('error', e)
        })
}

async function shareScreen(id) {
    const screen_stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: id,
                minWidth: 1280,
                maxWidth: 1280,
                minHeight: 720,
                maxHeight: 720,
            },
        },
    })
    let add = false
    if (!$webRTC.myStream) add = true
    if ($webRTC.myStream) {
        if ($webRTC.myStream.getVideoTracks().length === 0) add = true
    }
    changeVideoSource(screen_stream, 'screen', add)
}

function sendRtcMessage(msg, to_group) {

    if (to_group) {
        console.log('Sending webrtc data channel message')
        let connected = $webRTC.call.filter((a) => a.connected == true)
        connected.forEach((a) => {
            let sendMsg = JSON.stringify(msg[0])
            a.peer.send(sendMsg)
        })

        return
    }
    //Address and messageobject
    let [message, address] = msg
    //Find who we are going to send to
    let to = $webRTC.call.find((a) => a.chat == address)
    let sendMsg
    if (msg.length === 3 && !to.connected) {
        //Want to tunnel message through group inviter to the right address
        sendMsg = JSON.stringify(message + address)
        //Here we should try send it to the first connected peer, maybe more
        let tunnel = $webRTC.call[$webRTC.call.length - 1]
        tunnel.peer.send(sendMsg)
        return
    } else {
        sendMsg = JSON.stringify(message)
        to.peer.send(sendMsg)
    }
    console.log('sent')
}

function sendInviteNotification(contact, contact_address) {
    let callList = $webRTC.call.filter((a) => a.chat !== contact_address)
    //Notify other users in the call about the invite.
    let msg = {
        m: 'ᛊNVITᛊ',
        r: contact,
        g: $webRTC.groupCall,
        k: $user.huginAddress.substring(0, 99),
    }
    callList.forEach((a) => {
        window.api.sendGroupMessage(msg, true)
    })
}

async function checkSources() {
    $mediaSettings.devices = await navigator.mediaDevices.enumerateDevices()
    if (!$mediaSettings.cameraId) {
        //Set defauklt camera id in store
        let camera = $mediaSettings.devices.filter((a) => a.kind === 'videoinput')
        if (camera.length === 0) {
            $mediaSettings.cameraId = "none"
            return
        } else $mediaSettings.cameraId = camera[0].deviceId

        if (!$audioSettings.audioInput) { 
            let audio = $mediaSettings.devices.filter((a) => a.kind === 'audioinput')
            $audioSettings.audioInput = audio[0].deviceId
        }

        if (!$audioSettings.audioOutput) { 
            let audio = $mediaSettings.devices.filter((a) => a.kind === 'audiooutput')
            $audioSettings.audioOutput = audio[0].deviceId
        }
        
        //Checking active stream active devices
        if ($webRTC.myStream) {
            $webRTC.myStream.getAudioTracks().forEach(track => {
                if (track.kind === 'audioinput') $audioSettings.audioInput = track.getSettings().deviceId
                if (track.kind === 'audiooutput') $audioSettings.audioOutput = track.getSettings().deviceId
            })
        }
        // select the desired transceiver
    }
}

async function changeVideoSource(device, id, add = false) {
    let current = $webRTC.myStream

    //We have no active local stream set and we are alone in the conference room
    if (!current) {
        $webRTC.myStream = device
        $videoSettings.myVideo = true
    }

    //Check if we have an active peer
    let peer = $webRTC.call.some(a => a.peer)
    //Add new track to current stream
    if (add && peer) {
        addVideoTrack(device, current)
    } 
    
    //Replace track for all peers
    if (peer && !add) {
        replaceVideoTrack(device, current)
    }
    
    if (current) current.addTrack(device.getVideoTracks()[0])
    //Play video
    $video.play = true
    if (current) $webRTC.myStream = current

    if (!add && current) {
        //Stop old track
        let old = current.getVideoTracks()[0]
        old.stop()
        //Remove old track
        current.removeTrack(current.getVideoTracks()[0])
        //Update stream
    }
    $videoSettings.myVideo = true
    await sleep(200)
    $videoSettings.loading = false
    if ($videoSettings.screenshare) return
    $mediaSettings.cameraId = id
}

function getActive(contact) {
    return $webRTC.call.find(a => a.chat === contact)
}

function replaceVideoTrack(device, current) {
    $webRTC.call.forEach((a) => {
        a.peer.replaceTrack(current.getVideoTracks()[0], device.getVideoTracks()[0], current)
    })
}

async function changeCamera(video, id, add = false) {
    if (video) {
        // get video/voice stream
        navigator.mediaDevices
            .getUserMedia({
                video: {
                    deviceId: id,
                },
            })
            .then(function (device) {
                changeVideoSource(device, id, add)
            })
            .catch((e) => {
                console.log('error', e)
            })
    }
}


function sendPeerMessage(data, address) {
    let to = getActive(address)
    if (!to) return
    to.channel.send(JSON.stringify(data))
}

function signalPeer(address, data) {
    let contact = $webRTC.call.find((a) => a.chat == address)
    if (!contact) return
    contact.peer.signal(data)
}

function signalPeerChannel(address, data) {
    let contact = $webRTC.call.find((a) => a.chat == address)
    if (!contact) return
    contact.channel.signal(data)
}

function checkMessage(event, address) {
    let message
    try {
        message = JSON.parse(event.data)
    } catch (e) {
        return
    }

    console.log("Checking incoming message", message)
    
    if (typeof message === 'object') {
        if (message.type === 'offer' || 'answer' || 'renegotiate') {
            signalPeer(address, message.data)
            return
        }
    }

    let parsedMsg = message.substring(0, message.length - 99)
    let addr = message.substring(message.length - 99)
    
    if (addr == $user.huginAddress.substring(0, 99)) {
        window.api.decryptMessage(parsedMsg)
        return
    }

    if (message.substring(68, 70) == 'sb') {
        //Decrypt group message, groupCall is either key or false.
        let key = $webRTC.groupCall
        window.api.decryptGroupMessage(message, key)
        return
    }

    if ($webRTC.groupCall && addr.substring(0, 4) == 'SEKR') {
        let groupMessage = JSON.parse(event.data)
        let address = groupMessage.substring(groupMessage.length - 99)
        //If the address is one of our active calls, tunnel the message
        if ($webRTC.call.some((a) => a.chat == address)) {
            let tunnel = true
            let sendTunnel = $webRTC.call.find((a) => a.chat === address)
            console.log('Found message, sending to other peer')
            sendTunnel.peer.send(event.data)
            return
        }
    }

    if (addr.substring(0, 4) == 'SEKR') {
        console.log('This message should be routed elsewere')
        return
    }
    //Decrypt message
    window.api.decryptMessage(message)
}

async function inviteToGroupCall(peer) {
    console.log('Group call connecting...')
    if ($webRTC.groupCall === false) {
        //If no groupcall is started, get a new key
        $webRTC.groupCall = await window.api.createGroup()
    }

    //When you invite a new person to the call
    let thisCall = $webRTC.call.find((a) => a.peer === peer)
    let contact = $user.contacts.find((a) => a.chat === thisCall.chat)
    //Sort out all active calls except this
    let callList = $webRTC.call.filter((a) => a.chat !== thisCall.chat)
    let activeCall = []
    let type = $videoSettings.myVideo
    //If we have more active calls, invite them aswell.
    if (callList.length) {
        //Go through that list and add our contacts to a new array
        callList.forEach((a) => {
            let tunnelTo = $user.contacts.find((c) => c.chat === a.chat)
            let listItem = a.chat + tunnelTo.key
            activeCall.push(listItem)
            console.log('Inviting')
        })
    } else {
        //First
        type = 'invite'
    }
    //Make an invite message through the datachannel to our new participant
    let msg = { invite: activeCall, key: $webRTC.groupCall, type: type }
    let myMessage = {
        chat: thisCall.chat,
        msg: msg,
        sent: true,
        timestamp: Date.now(),
    }

    let to = thisCall.chat + contact.key
    //Send offchain invite message
    window.api.sendMsg(myMessage, to, true, true)
}

async function checkVolume(peer) {
    let interval
    let array = new Array(10)
    let contact = $webRTC.call.find((a) => a.peer == peer)
    let audioCall = {
        chat: contact.chat,
        activeVoice: false,
    }
    $audioLevel.call.unshift(audioCall)
    $audioLevel.sensitivity = 0.001
    interval = setInterval(getAudioLevel, 300)

    function getAudioLevel() {
        if ($webRTC.call.some((a) => a.chat == contact.chat)) {
            const rec = peer._pc.getReceivers().find((r) => {
                return r.track.kind === 'audio'
            })
            if (rec && rec.getSynchronizationSources()) {
                const source = rec.getSynchronizationSources()[0]
                if (source) {
                    array.push(source.audioLevel)
                } else {
                    console.log('No audio')
                    return
                }
                let list = $audioLevel.call
                for (const speaker of list) {
                    if (speaker.chat == contact.chat) {
                        if (
                            array.some((volume) => volume > $audioLevel.sensitivity) &&
                            source.audioLevel > 0.001
                        ) {
                            speaker.activeVoice = true
                            speaker.volume = source.audioLevel
                        } else {
                            speaker.activeVoice = false
                        }
                    } else {
                    }
                }
                $audioLevel.call = list
            }
            array.shift()
        } else {
            clearInterval(interval)
            let clearAudio = $audioLevel.call.filter((a) => a.chat !== contact.chat)
            $audioLevel.call = clearAudio
        }
    }
}

function changeAudio(id, add) {
         // get video/voice stream
         navigator.mediaDevices
            .getUserMedia({
                audio: {
                    deviceId: id,
                },
            })
            .then(function (device) {
                changeAudioSource(device)
            })
            .catch((e) => {
                console.log('error', e)
            })

            $audioSettings.audioInput = id
    }
    

    function changeAudioSource (device) {
        let current = $webRTC.myStream
    
        //Check if we have an active peer
        let peer = $webRTC.call.some(a => a.peer)
        
        //Replace track for all peers
        if (peer) {
            $webRTC.call.forEach((a) => {
                a.peer.replaceTrack(current.getAudioTracks()[0], device.getAudioTracks()[0], current)
            })
        }
        
        //Add track to local stream
        current.addTrack(device.getAudioTracks()[0])
        //Stop old track
        let old = current.getAudioTracks()[0]
        old.stop()
        //Remove old track
        current.removeTrack(current.getAudioTracks()[0])
        //Update stream
        if (!$webRTC.audio) {
            current.getAudioTracks().forEach((track) => (track.enabled = false))
        }
        
        $webRTC.myStream = current

    }

async function createRoom(video) {
    //Get video/voice stream
    navigator.mediaDevices
        .getUserMedia({
            video: video,
            audio: {
                googNoiseSupression: true,
            },
        })
        .then(function (stream) {
            awaitInvite(stream)
        })
        .catch((e) => {
            console.log('error', e)
        })
}

async function awaitInvite(stream) {
    console.log('Want to create room!')
    $webRTC.myStream = stream
    $videoSettings.myVideo = true
    let call = {
        chat: $user.huginAddress.substring(0, 99),
        type: 'room',
        myStream: stream,
    }
    $webRTC.call.unshift(call)
    updateStore()
    $videoGrid.showVideoGrid = true
}


async function checkMyVolume(stream) {
        //Check if active stream already exists
        if (!$webRTC.audio) {
            stream.getAudioTracks().forEach((track) => (track.enabled = false))
        }
        $webRTC.myStream = stream
        return

        //TODO ** Here we should add function like checkVolume() but for our input to display in UI.
        
    }

//End call
function endCall(peer, stream, contact) {
    let caller = getActive(contact)
    
    if (contact === undefined) {
        caller = $webRTC.call.find((e) => e.peer.channelName == peer.channelName)
    }

    if (contact && peer == undefined) return

    if ($webRTC.call.length === 0) return
    
    if (caller.peer !== undefined) {

        try {
            caller.channel.destroy()
            caller.peer.destroy()
        } catch (e) {
            console.log('error', e)
        }

    }

    let filter
    if (contact === undefined) {
        filter = $webRTC.call.filter((e) => e.peer !== peer)
    } else {
        filter = $webRTC.call.filter((a) => a.chat !== contact)
    }

    if (filter.length < 1) {
        $webRTC.groupCall = false
        $rtcgroupMessages = []
    }

    console.log('cleared this call from', filter)
    
    $webRTC.call = filter

    if ($webRTC.call.some((a) => a.peerVideo)) {
        console.log('Already got a video call open, return')
        return
    }

    if ($webRTC.call.some((a) => a.peerAudio)) {
        console.log('Already got a audio call open, return')
        return
    }

    if ($webRTC.call.length === 0 && $webRTC.myStream) {
        $webRTC.myStream.getTracks().forEach(function (track) {
                console.log('track stopped')
                track.stop()
            })
    }

    //
    $webRTC.initiator = false
    $videoSettings.myVideo = false
    $videoSettings.screenshare = false
    $videoSettings.myVideo = false
    $webRTC.myStream = false
    $videoSettings.loading = false
    $video.play = false
    console.log('Call ended')
}
</script>

<style lang="scss">
main {
    position: absolute;
    margin: 0 85px;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 25%;
    height: 10%;
    right: 15%;
    z-index: 2;
    background: transparent;
}

video {
    width: 200px;
    height: 200px;
    border: 1px solid red;
    z-index: 99999;
    display: none;
}

.show {
    display: block;
}
</style>
