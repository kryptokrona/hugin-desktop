<script>
    import wrtc from '@koush/wrtc'
    import {fade} from "svelte/transition";
    import Peer from "simple-peer";
    import {onDestroy, onMount} from "svelte";
    import {user, webRTC, misc} from "$lib/stores/user.js";

    export let activeCall

    onMount(() => {
        console.log('mounting webrtc component')
    })

    onDestroy(() => {
        console.log('exit webrtc component')
    })


    window.api.receive('start-call', (conatct, calltype) => {
        
        startCall(conatct, calltype)
    })
       
        function startCall (contact, isVideo, screenshare=false) {
            // spilt input to addr and pubkey
            let contact_address = contact.substring(0, 99);
            
            console.log('contact address', contact_address)
            console.log('Hugin Address', contact)
            console.log('Thiscall Address', activeCall.chat)

            if (contact_address !== activeCall.chat) return

            console.log('Starting call..');
            if (!screenshare) {
                // get video/voice stream
                   navigator.mediaDevices.getUserMedia({
                    video: isVideo,
                    audio: true
                }).then(function (stream) {
                    gotMedia(stream, contact, isVideo,)
                }).catch(() => {
                  console.log('error', stream);

                })
            } else {
                window.desktopCapturer.getSources({types: ['window', 'screen']}).then(async sources => {

                    for (const source of sources) {
                        if (source.name === 'Entire Screen') {
                            try {

                                const screen_stream = await navigator.mediaDevices.getUserMedia({
                                    audio: false,
                                    video: {
                                        mandatory: {
                                            chromeMediaSource: 'desktop',
                                            chromeMediaSourceId: source.id,
                                            minWidth: 1280,
                                            maxWidth: 1280,
                                            minHeight: 720,
                                            maxHeight: 720
                                        }
                                    }
                                });
                                console.log('Got stream..');
                                navigator.mediaDevices.getUserMedia({
                                    video: isVideo,
                                    audio: true
                                }).then(function (stream) {
                                    gotMedia(stream, contact, screen_stream)
                                }).catch(() => {
                                })

                            } catch (e) {
                                console.log(e)
                            }
                            return
                        }
                    }
                })
            }
        }

      async function gotMedia (stream, contact, video, screen_stream=false) {
        console.log('contact', contact);
          console.log('video?', video);
          console.log('We want contact stream', stream)
          if ( video ) {
                
            $webRTC.myVideo = true

              if (screen_stream) {

                  screen_stream.addTrack(stream.getAudioTracks()[0]);

                  stream = screen_stream;
              }

            } else {

              console.log('Audio call');
            }
            
            let peer1 = new Peer({
                initiator: true,
                stream: stream,
                trickle: false,
                wrtc: wrtc,
                offerOptions: {offerToReceiveVideo: true, offerToReceiveAudio: true},
                sdpTransform: (sdp) => {
                    console.log('sdp raw', sdp)
                    return sdp;
                }
            })

                     
            activeCall.peer = peer1,
            activeCall.myStream = stream,
            activeCall.screen = screen_stream
            
            console.log('This call', activeCall)

            let video_codecs = window.RTCRtpSender.getCapabilities('video');
            let audio_codecs = window.RTCRtpSender.getCapabilities('audio');
            console.log('audio calling codecs', audio_codecs);
            let custom_codecs = [];

            let codec;
            for (codec in video_codecs.codecs) {
                let this_codec = video_codecs.codecs[codec];
                if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0,5) == "level") {
                    custom_codecs.push(this_codec);
                }
                console.log('custom codenccc', custom_codecs);

            }

            let transceiverList = peer1._pc.getTransceivers();
            console.log('audio tracks', transceiverList);
            if (video) {
                // select the desired transceiver
               transceiverList[1].setCodecPreferences(custom_codecs)

            }

            $webRTC.myVideo = video, 
            $webRTC.myStream = stream
            $webRTC.active = true

            let first = true;

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

            peer1.on('stream', peerStream => {

            
             console.log(' Got peerstream object in store', activeCall.peerStream)

             
                //Set peerStream to store
                activeCall.peerStream = peerStream
                if (video) {
                    $webRTC.peerVideo = true
                } else {
                    $webRTC.peerAudio = true
                }

               })


            peer1.on('connect', () => {
                // CONNECT SOUND
                // SEND WEBCONTENTS " CONNECTED "
                console.log('Connection established; with', contact)
                $webRTC.connected = true

            });


            peer1.on('signal', data => {

                try {
                    let dataToSend = {
                        data: data,
                        type: 'offer',
                        contact: contact,
                        video: video,
                    }

                    console.log('SDP', data);

                    window.api.send('get-sdp', dataToSend)
                } catch (err) {
                    console.log('error', err)
                }

                if (!first) {
                    return
                }

                //awaiting_callback = true;

                first = false;

            })
            //Awaits msg answer with sdp from contact
            window.api.receive('got-callback', async (callerdata) => {
                if (activeCall.chat !== callerdata.chat) return
                let callback = JSON.parse(callerdata.data)
                console.log('callback parsed', callback);

                peer1.signal(callback);
                console.log('Connecting to ...',  callerdata.chat)

            })

            window.api.receive('endCall', async (p, s, this_call) => {
            if (activeCall.chat !== this_call) return
              console.log('ending call');
              endCall(peer1, stream)
            })

            window.api.receive('rtc_message', msg => { 
                if (activeCall.chat !== msg.chat) return
                console.log('sending rtc')
                let sendMsg = JSON.stringify(msg)
                peer1.send(sendMsg)
                console.log('sent')
            })

            peer1.on('data', msg => {
                let incMsg = JSON.parse(msg)
                console.log('msg from peer2', incMsg)
            }) 

        }


        window.api.receive('answer-call', (msg, contact, key) => {
            if (contact !== activeCall.chat) return
            answerCall(msg, contact, key)
        })

        async function answerCall (msg, contact, key) {
            console.log('APPLE', msg, contact, key)

            let video = false
            if (msg.substring(0, 1) === 'Δ') {
                video = true
            }

            // get video/voice stream
            navigator.mediaDevices.getUserMedia({
               video: video,
               audio: true
             }).then(gotMedia).catch(() => {})
            console.log('Got media')


            function gotMedia(stream) {
                console.log('FN getMedia', stream, video)

                let peer2 = new Peer({stream: stream, trickle: false, wrtc: wrtc})

                let custom_codecs = [];
                let video_codecs = window.RTCRtpSender.getCapabilities('video');

                let codec;
                for (codec in video_codecs.codecs) {
                    let this_codec = video_codecs.codecs[codec];
                    if (this_codec.mimeType === "video/H264" && this_codec.sdpFmtpLine.substring(0, 5) === "level") {
                        custom_codecs.push(this_codec);
                    }
                    console.log(custom_codecs)
                }

                // select the desired transceiver
                let transceivers = peer2._pc.getTransceivers()
                if (video) {
                   console.log('transceivers', transceivers)
                     transceivers[1].setCodecPreferences(custom_codecs)
                }

                console.log('codec set');

                activeCall.peer = peer2
                console.log('store peerset 2',activeCall.peer)
                $webRTC.myStream = stream
                $webRTC.active = true

                if (video) {
                    activeCall.myVideo = true
                }

                console.log('webrtc store settings set', activeCall);

                peer2.on('close', () => {
                    console.log('Connection closed..')
                    endCall(peer2, stream)
                })

                peer2.on('error', (e) => {
                    console.log('Connection lost..', e)
                    endCall(peer2, stream)
                })
                window.api.send('expand-sdp', msg, contact)

                console.log('sending offer!!!')

                window.api.receive('got-expanded', (message, caller) => {
                    console.log('caller expanded', caller)
                    if (activeCall.chat !== caller) return
                    console.log('got expanded', message)
                    // let signal = expand_sdp_offer(message);
                    peer2.signal(message);

                })


                peer2.on('signal', data => {

                  console.log('initial offer data:', data);
                    let dataToSend = {
                        data: data,
                        type: 'answer',
                        contact: contact + key,
                        video: video,
                    }
                    console.log('sending sdp');

                    window.api.send('get-sdp', dataToSend)
                   

                })

            
                peer2.on('track', (track, stream) => {
                    console.log('Setting up link..', track, stream)
                })

                peer2.on('connect', () => {
                    // SOUND EFFECT
                    console.log('Connection established;')
                    $webRTC.connected = true

                });

                peer2.on('stream', peerStream => {
                    // got remote video stream, now let's show it in a video tag

                    console.log('peer2 stream', peerStream)
                    activeCall.peerStream = peerStream
                    console.log(' Got peerstream object in store', activeCall.peerStream)

                    if (video) {
                    $webRTC.peerVideo = true
                    } else {
                    $webRTC.peerAudio = true
                    }
                    call = true;

                    console.log('Setting up link..');

                })

                window.api.receive('endCall', (s, p, this_call) => {
                    if (activeCall.chat !== this_call) return
                endCall(peer2, stream)
                })

                    
                window.api.receive('rtc_message', rtc => { 
                    if (rtc.chat !== contact) return
                    console.log('sending rtc', rtc)
                    let sendMsg = JSON.stringify(rtc)
                    console.log('sending rtc', sendMsg)
                    peer2.send(sendMsg)
                    console.log('sent');
                })

                peer2.on('data', data => {
                    console.log('data from peer', data)
                    let incMsg = JSON.parse(data)
                    console.log('msg from peer2', incMsg)
                    
                }) 

            }
        }
   

  //End call
  function endCall (peer, stream, contact) {
    

        try {
            peer.destroy();
            stream.getTracks().forEach(function(track) {
                track.stop();
            });
        } catch (e) {
        }

        webRTC.update((data) => {
          return {
            ...data,
            active: false,
            peer: false,
            myVideo: false,
            peerVideo: false,
            peerStream: false,
            myStream: false,
            connected: false,
            call: []
          }
        })

        // $webRTC.call[0] = {
        //     peer: false,
        //     myVideo: false,
        //     peerVideo: false,
        //     peerStream: false,
        //     myStream: false,
        // }

        console.log('Call ended')

    }

</script>

<main>

</main>

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
