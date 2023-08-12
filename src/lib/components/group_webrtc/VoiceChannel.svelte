<script>
    import wrtc from '@koush/wrtc'
    import Peer from 'simple-peer'
    import { audioLevel, user, swarm } from '$lib/stores/user.js'
    
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
    
    // window.api.receive('change-source', (src) => {
    //     console.log('want to change in calls', src)
    //     changeCamera(true, src)
    // })
    
    // window.api.receive('rtc_message', (msg, to_group = false) => {
    //     sendRtcMessage(msg, to_group)
    // })
    
    // //Update device list on change
    // navigator.mediaDevices.ondevicechange = () => {
    //     checkSources()
    // }
    
    window.api.receive('got-expanded-voice-channel', async (callData) => {
        console.log("calldata", callData)
        let [sdp, address] = callData
        console.log("Find call", $swarm.call)
        let contact = $swarm.call.find((a) => a.chat == address)
        console.log(address)
        contact.peer.signal(sdp)
    })
    
    //Awaits msg answer with sdp from contact
    window.api.receive('got-answer-voice-channel', (signal) => {
        console.log("Got caller data:", signal)
        let contact = $swarm.call.find((a) => a.chat === signal.address)
        console.log('contact filter', contact)
        contact.peer.signal(signal.data)
        console.log('Connecting to ...', signal.address)
    })
    
    
    
    const join_voice_channel = async (data) => {
        console.log('Joining voice channel... in VoiceChannel.svelte', data)
        $swarm.call.push({chat: data.address, topic: data.topic, connected: false})
        $swarm.call = $swarm.call
        //Get video/voice stream
        navigator.mediaDevices
            .getUserMedia({
                video: false,
                audio: {
                    googNoiseSupression: true,
                },
            })
            .then(function (stream) {
                gotMedia(stream, data)
            })
            .catch((err) => {
                console.log('error', err)
            })
    }
    
    
    async function gotMedia(stream, data) {
        console.log("** GOT MEDIA VOICE DATA! join_voice_channel **", data)
        console.log("** GOT MEDIA VOICE CHANNEL STREAM! join_voice_channel **", stream)
        let active = $swarm.active.find(a => a.key === data.key)
        let this_call = $swarm.call.find(a => a.chat === data.address)
        console.log("This voice channel call!", this_call)
        let peer1 = await startPeer1(stream, data.address, data.topic, this_call)
    
        checkMyVolume(peer1)
        //Set swarm store update for call
        this_call.peer = peer1
        $swarm.myStream = stream
        $swarm.voice_active = true
        
        peer1.on('stream', (peerStream) => {
            console.log("Got peer1 stream", peerStream)
            //Set peerStream to store
            this_call.peerStream = peerStream
            this_call.peerAudio = true
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
            window.api.successMessage('Connection established')
            let startTone = new Audio('/audio/startcall.mp3')
            startTone.play()
            this_call.connected = true
            checkVolume(peer1)
            $swarm.call = $swarm.call
        })
    
        sendOffer(peer1, contact, topic)
    
        return peer1
    }
    
    const answer_voice_channel = (data) => {
        
        console.log("Answer voice channel", data)
        let video = false
        let contact = data.address
        let msg = data.data
    
        $swarm.call.push({chat: data.address, topic: data.topic, connected: false})
        $swarm.call = $swarm.call
        let this_call = $swarm.call.find(a => a.chat === data.address)
        // get video/voice stream
        navigator.mediaDevices
            .getUserMedia({
                video: video,
                audio: true,
            })
            .then(gotMedia)
            .catch(() => {})
        console.log('Got media')
    
        async function gotMedia(stream) {
    
            let peer2 = await startPeer2(stream, video, this_call)
    
            //Set swarm store update for call
            this_call.peer = peer2
            this_call.chat = data.address
            $swarm.myStream = stream
    
            sendAnswer(msg, data.address, peer2, data.topic)
            
            console.log('answrcall done got peer 2', peer2)
        }
    }
    
    async function startPeer2(stream, video, this_call) {
        let peer2 = new Peer({ stream: stream, trickle: false, wrtc: wrtc })
    
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
    
        console.log('sending offer!!!')
    
        peer2.on('track', (track, stream) => {
            console.log('Setting up link..', track, stream)
        })
    
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
    
        peer2.on('stream', (peerStream) => {
            // got remote video stream, now let's show it in a video tag
    
            console.log('peer2 stream', peerStream)
            this_call.peerStream = peerStream
            if (video) {
                this_call.peerVideo = true
            } else {
                this_call.peerAudio = true
            }

            $swarm.call = $swarm.call
            console.log('Setting up link..')
        })
    
        return peer2
    }
    
    function sendOffer(peer, contact, topic) {
    
        peer.on('signal', (data) => {
            let dataToSend = {
                data: data,
                type: 'offer',
                address: contact,
                topic: topic,
                video: false
            }
    
            console.log('Want to send sdp offer in voice chnnael', dataToSend)
    
            window.api.send('get-sdp-voice-channel', dataToSend)
        })
    }
    
    function sendAnswer(sdpOffer, address, peer, topic) {
        console.log('offer?', sdpOffer, address)
    
        window.api.send("expand-voice-channel-sdp", [sdpOffer, address])
    
        peer.on('signal', (data) => {
            console.log('initial offer data:', data)
            let dataToSend = {
                data: data,
                type: 'answer',
                address: address,
                topic: topic,
                video: false
            }
            console.log('sending sdp swarm', dataToSend)
    
            window.api.send('get-sdp-voice-channel', dataToSend)
        })
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
                const rec = peer._pc.getReceivers().find((r) => {
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
    
    async function checkMyVolume(peer) {}
    
    //End call
    function endCall(peer, stream, contact) {
        let caller = $swarm.call.find((a) => a.chat === contact)
    
        if (contact === undefined) {
            console.log('contact', contact)
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

        let endTone = new Audio('/audio/endcall.mp3')
            endTone.play()
    
        let filter
        if (contact === undefined) {
            filter = $swarm.call.filter((e) => e.peer !== peer)
        } else {
            filter = $swarm.call.filter((a) => a.chat !== contact)
        }
    
        if (filter.length < 1) {
            $swarm.groupCall = false
        }
    
        console.log('cleared this call from', filter)
        $swarm.call = filter
    
        if ($swarm.call.some((a) => a.peerVideo)) {
            $swarm.myVideo = true
            $swarm.video = true
            console.log('Already got a video call open, return')
            return
        }
    
        if ($swarm.call.some((a) => a.peerAudio)) {
            console.log('Already got a audio call open, return')
            $swarm.myVideo = false
            return
        }
    
        if ($swarm.call.length === 0) {
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
    
