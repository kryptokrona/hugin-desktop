<script>
    import wrtc from '@koush/wrtc'
    import Peer from 'simple-peer'
    import { audioLevel, user, swarm } from '$lib/stores/user.js'
    import { onMount } from 'svelte'
    import { sleep } from '$lib/utils/utils'

    onMount(() => {
        checkSources()
        checkAudioSources()
    })
    
    window.api.receive('answer-voice-channel', (data) => {
        console.log("Answer voice channel", data)
        answer_voice_channel(data)
    })
    
    window.api.receive('join-voice-channel', (data) => {
        console.log("Joining voice channel group_webrtc", data)
        join_voice_channel(data)
    })
    
    // window.api.receive('start-room', (video) => {
    //     createRoom(video)
    // })

    window.api.receive('close-voice-channel-with-peer', (address) => { 
        endCall('peer', 'stream', address)
    })
    
    window.api.receive('leave-voice-channel', () => {
        $swarm.call.forEach((active) => {
            endCall('peer', 'stream', active.chat)
        })
    })

    window.api.receive('activate-video', () => {
        set_camera()
    })

    window.api.receive('group-screen-share', (id) => {
        shareScreen(id)
    })

    //TODO ADD MEDIA TRAKCS; VIDEO; SCREENSHARE
    // NEW CALL? 
    
    // window.api.receive('screen-share', (id) => {
    //     shareScreen(id)
    // })
    
    // window.api.receive('set-camera', () => {
    //     changeCamera(true, $swarm.cameraId)
    // })
    
    // window.api.receive('set-audio-input', (id) => {
    //     changeAudio(id)
    // })
    
    // window.api.receive('check-src', () => {
    //     checkSources()
    // })

    async function checkSources() {
        console.log("checking soruces conference")
        let devices = await navigator.mediaDevices.enumerateDevices()
        $swarm.devices = devices
        if (!$swarm.cameraId) {
            //Set defauklt camera id in store
            let camera = $swarm.devices.filter((a) => a.kind === 'videoinput')
            if (camera.length === 0) {
                $swarm.cameraId = "none"
            } else $swarm.cameraId = camera[0].deviceId
            
            
            console.log(" $swarm.cameraId",   $swarm.cameraId)
            // select the desired transceiver
        }

        if (!$swarm.audioInputId) { 
            let audio = $swarm.devices.filter((a) => a.kind === 'audioinput')
            $swarm.audioInput = audio[0].deviceId
        }

        if (!$swarm.audioOutput) { 
            let audio = $swarm.devices.filter((a) => a.kind === 'audiooutput')
            $swarm.audioOutput = audio[0].deviceId
        }
        
        //Checking active stream active devices
        if ($swarm.myStream) {
            $swarm.myStream.getAudioTracks().forEach(track => {
                if (track.kind === 'audioinput') $swarm.audioInput = track.getSettings().deviceId
                if (track.kind === 'audiooutput') $swarm.audioOutput = track.getSettings().deviceId
            })
        }
}

async function checkAudioSources() {
    console.log("checking audio conference sources")
    let devices = await navigator.mediaDevices.enumerateDevices()
    $swarm.devices = devices
        
}

    
    window.api.receive('group-change-source', (src, add) => {
        console.log('want to change in calls', src)
        changeCamera(true, src, add)
    })

    
    
    window.api.receive('set-audio-input-group', (src, input) => {
        if (!input) return
        changeAudio(src)
    })


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

            $swarm.audioInput = id
    }
    

    function changeAudioSource (device) {
        let current = $swarm.myStream
    
        //Check if we have an active peer
        let peer = $swarm.call.some(a => a.peer)
        
        //Replace track for all peers
        if (peer) {
            $swarm.call.forEach((a) => {
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
        if (!$swarm.audio) {
            current.getAudioTracks().forEach((track) => (track.enabled = false))
        }
        
        $swarm.myStream = current

    }
    
    // window.api.receive('rtc_message', (msg, to_group = false) => {
    //     sendRtcMessage(msg, to_group)
    // })
    
    //Update device list on change
    navigator.mediaDevices.ondevicechange = () => {
        checkSources()
    }

    async function changeCamera(video, id, add) {
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
    
    window.api.receive('got-expanded-voice-channel', async (callData) => {
        console.log("Got offer signal", callData)
        let [sdp, address] = callData
        let contact = $swarm.call.find((a) => a.chat == address)
        contact.peer.signal(sdp)
    })
    
    //Awaits msg answer with sdp from contact
    window.api.receive('got-answer-voice-channel', (signal) => {
        console.log("Got ansswer data:", signal)
        let contact = $swarm.call.find((a) => a.chat === signal.address)
        contact.peer.signal(signal.data)
        console.log('Connecting to ...', signal.address)
    })

    async function shareScreen(id) {
    const screen_stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: id,
                minWidth: 1920,
                maxWidth: 1920,
                minHeight: 1280,
                maxHeight: 1280,
            },
        },
    })

    let add = false
    if (!$swarm.myStream) add = true
    if ($swarm.myStream) {
        if ($swarm.myStream.getVideoTracks().length === 0) add = true
    }
    changeVideoSource(screen_stream, 'screen', add)
    }
    

    async function changeVideoSource(device, id, add = false) {
        let current = $swarm.myStream
    
        //We have no active local stream set and we are alone in the conference room
        if (!current) {
            $swarm.myStream = device
            $swarm.myVideo = true
        }

        //Check if we have an active peer
        let peer = $swarm.call.some(a => a.peer)
        //Add new track to current stream
        if (add && peer) {
            $swarm.call.forEach( async (a) => {
                a.peer.addTrack(device.getVideoTracks()[0], current)
            })
        } 
        
        //Replace track for all peers
        if (peer && !add) {
            $swarm.call.forEach((a) => {
                a.peer.replaceTrack(current.getVideoTracks()[0], device.getVideoTracks()[0], current)
            })
        }
        
        if (current) current.addTrack(device.getVideoTracks()[0])
       
        if (!add && current) {
            //Stop old track
            let old = current.getVideoTracks()[0]
            old.stop()
            //Remove old track
            current.removeTrack(current.getVideoTracks()[0])
            //Update stream
        }

        if (current) $swarm.myStream = current
        $swarm.myVideo = true
        //Set video boolean to play video
        $swarm.video = true
        if ($swarm.screenshare) return
        $swarm.cameraId = id
    }
    
    
    const join_voice_channel = async (data) => {
        console.log('Joining voice channel... in VoiceChannel.svelte')
        $swarm.call.push({chat: data.address, topic: data.topic, connected: false})
        $swarm.call = $swarm.call
        let video = $swarm.myVideo
        if ($swarm.cameraId === "none") video = false
        
        //If we already have an active stream, do not create a new one.
        if ($swarm.myStream) {
                gotMedia($swarm.myStream, data, video)
            return
        }
        
        //Get a new video/voice stream
        navigator.mediaDevices
            .getUserMedia({
                video: video,
                audio: {
                    googNoiseSupression: true,
                },
            })
            .then(function (stream) {
                gotMedia(stream, data, video)
            })
            .catch((err) => {
                console.log('error', err)
            })
    }
    
    
    async function gotMedia(stream, data, video) {
        let active = $swarm.active.find(a => a.key === data.key)
        let this_call = $swarm.call.find(a => a.chat === data.address)
        let peer1 = await startPeer1(stream, data.address, data.topic, this_call)
    
        checkMyVolume(stream)
        //Set swarm store update for call
        this_call.peer = peer1
        this_call.myStream = stream
        $swarm.voice_active = true
        
        peer1.on('stream', (peerStream) => {
            console.log("Got peer1 stream", peerStream)
            //Set peerStream to store
            this_call.peerStream = peerStream
            this_call.peerVideo = true
            $swarm.call = $swarm.call
        })
    }
    
    async function startPeer1(stream, contact, topic, this_call) {
        console.log("Starting peer1 in voice channel!")
        let peer1 = new Peer({
            initiator: true,
            stream: stream,
            trickle: false,
            wrtc: wrtc,
            config: { iceServers: [{ urls: 'stun:stun.bahnhof.net:3478' }, { urls: 'stun:stun.ipfire.org:3478' }] },
            offerOptions: {
                offerToReceiveVideo: true,
                offerToReceiveAudio: true,
            },
            sdpTransform: (sdp) => {
                return sdp
            },
        })
    
        peer1.on('close', (e) => {
            console.log(e)
            console.log('Connection closed..')
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
            window.api.successMessage('Connection established')
            if ($swarm.call.length < 2) {
                //Only play sound on first connect. Peer 2 will play all incoming connections when joined.
                let startTone = new Audio('/audio/startcall.mp3')
                startTone.play()
            }
            this_call.connected = true
            checkVolume(peer1)
            $swarm.call = $swarm.call
        })
    
        sendOffer(peer1, contact, topic)
    
        return peer1
    }
    
    const answer_voice_channel = (data) => {
        
        console.log("Answer voice channel", data)
        let contact = data.address
        let msg = data.data
        let video = $swarm.myVideo
        $swarm.call.push({chat: data.address, topic: data.topic, connected: false})
        $swarm.call = $swarm.call
        // get video/voice stream
        
        if ($swarm.myStream) {
            got_answer_media($swarm.myStream, msg, data)
            return
        }

        navigator.mediaDevices
            .getUserMedia({
                video: $swarm.myVideo,
                audio: true,
            })
            .then(function (stream) {
                got_answer_media(stream, msg, data)
            })
            .catch(() => {})
    }

    const got_answer_media = async (stream, msg, data) => {
            console.log("Got stream!", stream)
            let this_call = $swarm.call.find(a => a.chat === data.address)
            let video = $swarm.myVideo
            let peer2 = await startPeer2(stream, video, this_call)
    
            //Set swarm store update for call
            this_call.peer = peer2
            this_call.chat = data.address
            this_call.myStream = stream
            checkMyVolume(stream)

            peer2.on('stream', (peerStream) => {

                console.log('peer2 stream', peerStream)
                this_call.peerStream = peerStream
                this_call.peerVideo = true

                $swarm.call = $swarm.call
                console.log('Setting up link..')
        })
    
            sendAnswer(msg, data.address, peer2, data.topic)
        }
    
    async function startPeer2(stream, video, this_call) {
        let peer2 = new Peer({ stream: stream, trickle: false, wrtc: wrtc, answerOptions: {
                offerToReceiveVideo: true,
                offerToReceiveAudio: true,
            }, })
    
        peer2.on('close', (e) => {
            console.log('Connection closed..', e)
            endCall(peer2, stream)
        })
    
        peer2.on('error', (e) => {
            console.log('Connection lost..', e)
            endCall(peer2, stream)
        })
    
        peer2.on('data', (data) => {
            console.log('data from peer', data)
            let incMsg = JSON.parse(data)
            console.log('msg from peer2', incMsg)
        })
    
        console.log('Sending offer!')
    
        peer2.on('connect', () => {
            // SOUND EFFECT
            window.api.successMessage('Call established')
            console.log('Connection established;')
            let startTone = new Audio('/audio/startcall.mp3')
            startTone.play()
            this_call.connected = true
            checkVolume(peer2)
            $swarm.call = $swarm.call
            //Data channel
            peer2._channel.addEventListener('message', (event) => {
                checkMessage(event)
            })
        })
    
        return peer2
    }
    
    function sendOffer(peer, contact, topic) {
    
        peer.on('signal', (data) => {
            console.log("Signal peer 1", data)
            let dataToSend = {
                data: data,
                type: 'offer',
                address: contact,
                topic: topic,
                video: false,
                retry: false
            }

            if ($swarm.call.some(a => a.chat === contact && a.connected)) {
                console.log("Retry!", dataToSend)
                dataToSend.retry = true
            }

            console.log('Want to send sdp offer in voice chnnael', dataToSend)
    
            window.api.send('get-sdp-voice-channel', dataToSend)
        })
    }
    
    function sendAnswer(sdpOffer, address, peer, topic) {
        console.log('offer?', sdpOffer, address)
    
        window.api.send("expand-voice-channel-sdp", [sdpOffer, address])
    
        peer.on('signal', (data) => {
            console.log('answer data:', data)
            let dataToSend = {
                data: data,
                type: 'answer',
                address: address,
                topic: topic,
                video: false,
                retry: false
            }
    
            window.api.send('get-sdp-voice-channel', dataToSend)
        })
    }

    async function set_camera() {
    //Get video/voice stream
    navigator.mediaDevices
            .getUserMedia({
                video: true,
                audio: {
                    googNoiseSupression: true,
                },
            })
            .then(function (stream) {
                set_video(stream)
            })
            .catch((e) => {
                console.log('error', e)
            })
}

    function set_video(stream) {
        $swarm.oldStream = $swarm.myStream
        $swarm.myStream = stream
        $swarm.myVideo = true
        $swarm.video = true
        let camera = $swarm.devices.filter((a) => a.kind === 'videoinput')
        $swarm.cameraId = camera[0].deviceId
    }
    
    async function checkVolume(peer) {
        let interval
        let array = new Array(10)
        let contact = $swarm.call.find((a) => a.peer == peer)
        let audioCall = {
            chat: contact.chat,
            activeVoice: false,
        }
        $audioLevel.call.unshift(audioCall)
        $audioLevel.sensitivity = 0.001
        interval = setInterval(getAudioLevel, 300)
    
        function getAudioLevel() {
            if ($swarm.call.some((a) => a.chat == contact.chat)) {
                const rec = contact.peer._pc.getReceivers().find((r) => {
                    return r.track.kind === 'audio'
                })
                if (rec && rec.getSynchronizationSources()) {
                    const source = rec.getSynchronizationSources()[0]
                    if (source) {
                        array.push(source.audioLevel)
                    } else {
                        console.log('No audio')
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
                console.log('Audio field cleared', $audioLevel.call)
            }
        }
    }
    
    async function checkMyVolume(stream) {
        //Check if active stream already exists
        if (!$swarm.audio) {
            stream.getAudioTracks().forEach((track) => (track.enabled = false))
        }
        $swarm.myStream = stream
        return

        //TODO ** Here we should add function like checkVolume() but for our input to display in UI.
        
        $swarm.myStream = stream
        
    }

    $: console.log("$swarm calls", $swarm.call)
    
    //End call
    function endCall(peer, stream, contact) {

        console.log("Call ending with", peer, contact)
        let caller = $swarm.call.find((a) => a.chat === contact)
    
        if (contact === undefined && peer !== undefined) {
            caller = $swarm.call.find((e) => e.peer.channelName == peer.channelName)
        }
    
        if (contact && peer == undefined) return
    
        if ($swarm.call.length === 0) return
        
        if (caller.peer !== undefined) {
    
            try {
                caller.peer.destroy()
            } catch (e) {
                console.log('error', e)
            }
    
        }

        const endTone = new Audio('/audio/endcall.mp3')
            endTone.play()
    
        let filter

        if (contact === undefined) {
            filter = $swarm.call.filter((e) => e.peer !== peer)
        } else {
            filter = $swarm.call.filter((a) => a.chat !== contact)
        }
    
        console.log('cleared this call from', filter)
        $swarm.call = filter

        const in_voice = $swarm.voice_channel.some(a => a.address === $user.huginAddress.substring(0,99))

        if (in_voice) {
            //Still in channel, dont stop video/voice tracks.
            return
        }
        
        if ($swarm.call.length === 0 && !in_voice) {
            //Not active anymore, stop all tracks here.
                $swarm.myStream.getTracks().forEach(function (track) {
                    console.log('track stopped')
                    track.stop()
                })
        }
        //
        $swarm.initiator = false
        $swarm.screenshare = false
        $swarm.video = false
        $swarm.screen_stream = false
        $swarm.myVideo = false
        $swarm.myStream = false
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
    
