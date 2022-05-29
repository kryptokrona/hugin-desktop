<script>
    import wrtc from '@koush/wrtc'
    import {fade} from "svelte/transition";
    import Peer from "simple-peer";
    import {onMount} from "svelte";

    let stream;
    let myVideo;
    let peerVideo;
    let peerStream;
    let call
    let calling
    onMount(() => {

        myVideo = document.getElementById('myVideo')
        peerVideo = document.getElementById('peerVideo')

        console.log('peervidya', peerVideo);
          console.log('MyVidya', myVideo);

        window.api.receive('start-call', (conatct, calltype) => {
            startCall(conatct, calltype)
        })

        function startCall (contact, isVideo, screenshare=false) {
            // spilt input to addr and pubkey
            let contact_address = contact.substring(0, 99);
            console.log('contact address', contact_address)
            let msg;

            console.log('Starting call..');
            if (!screenshare) {
                // get video/voice stream
                   navigator.mediaDevices.getUserMedia({
                    video: isVideo,
                    audio: true
                }).then(function (stream) {
                    gotMedia(stream, contact)
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
        let video

        async function gotMedia (stream, contact, screen_stream=false) {
          console.log('contact', contact);
            console.log('We want contact stream', stream)
            video = true;
            if ( video ) {

              calling = true;


                if (screen_stream) {
                    myVideo.srcObject = screen_stream;
                    screen_stream.addTrack(stream.getAudioTracks()[0]);

                    stream = screen_stream;
                } else {

                    myVideo.srcObject = stream;

                    console.log('stream again', stream);

                }
                myVideo.play();
                //$('video').fadeIn();
            } else {

            }

            let peer1 = new Peer({
                initiator: true,
                stream: stream,
                trickle: false,
                wrtc: wrtc,
                offerOptions: {offerToReceiveVideo: true, offerToReceiveAudio: true},
                sdpTransform: (sdp) => {
                    return sdp;
                    // console.log('lol, lmao', sdp);
                    //
                    // let sdp_object = {'sdp': sdp};
                    //
                    // let parsed_data = `${video ? "Δ" : "Λ"}` + parse_sdp(sdp_object);
                    // console.log(parsed_data);
                    // let recovered_data = sdp_parser.expand_sdp_offer(parsed_data);
                    // console.log(recovered_data);
                    // return recovered_data.sdp;
                }
            })


            let video_codecs = window.RTCRtpSender.getCapabilities('video');
            console.log('video codecs', video_codecs);

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


            // select the desired transceiver
            //transceiverList[1].setCodecPreferences(custom_codecs)

            console.log('codec set');


            let first = true;

            peer1.on('close', (e) => {
                console.log(e)
                console.log('Connection lost..')

                window.api.endCall(peer1, stream);

                // ENDCALL AUDIO
            })

            peer1.on('error', (e) => {
                console.log(e)
                console.log('Connection lost..')

                window.api.endCall(peer1, stream);
                // ENDCALL AUDIO

            })

            peer1.on('stream', peerStream => {
                // got remote video stream, now let's show it in a video tag

                 //let extra_class = "";
                 //if (video) {
                     extra_class = " video"
                 //}
                // // SELECT AND SHOW VIDEO ELEMENT
                // let video_element = ""
                //
                //
                console.log('Got Stream Peer1', peerStream);

                console.log('peerVideo', peerVideo);

                 if ('srcObject' in peerVideo) {

                   console.log('ppeeeer?');

                     peerVideo.srcObject = peerStream
                 } else {
                     peerVideo.src = window.URL.createObjectURL(peerStream) // for older browsers
                 }
                 call = true
                 let tracks = peerStream.getTracks()
                 console.log('tracks', tracks);
                 peerVideo.play()

            })

            peer1.on('connect', () => {
                // CONNECT SOUND
                // SEND WEBCONTENTS " CONNECTED "
                console.log('Connection established; with', contact)

            });


            peer1.on('signal', data => {
                try {
                    let dataToSend = {
                        data: data,
                        type: 'offer',
                        contact: contact,
                        video: video,
                    }
                    //  console.log('real data:', data);
                    console.log('SDP', data);
                    // console.log('parsed data:', parsed_data);
                    window.api.send('get-sdp', dataToSend)
                    // console.log('recovered data:', recovered_data);
                    // console.log('some other data:', {'type': 'offer', 'sdp': recovered_data});
                    // peer1._pc.setLocalDescription(recovered_data);
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
                console.log('callback', callerdata);
                console.log('from', callerdata.sender);
                let callback = JSON.parse(callerdata.data)
                console.log('callback parsed', callback);

                peer1.signal(callback);
                console.log('Connecting to ...',  callerdata.sender)

            })

        }


        window.api.receive('answer-call', (msg, contact) => {
            answerCall(msg, contact)
        })

        async function answerCall (msg, contact) {
            console.log('APPLE', msg, contact)

            let video = false
            if (msg.substring(0, 1) === 'Δ') {
                video = true
            }
            // $('#messages_contacts').addClass('in-call');
            // $('#settings').addClass('in-call');

            // get video/voice stream
            navigator.mediaDevices.getUserMedia({
               video: video,
               audio: true
             }).then(gotMedia).catch(() => {})
            console.log('Got media')


            function gotMedia(stream) {
                console.log('FN getMedia', stream, video)

                // select the desired transceiver

                if (video) {
                    myVideo = document.getElementById('myVideo')
                    myVideo.srcObject = stream;

                    myVideo.play();
                }

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

                let transceivers = peer2._pc.getTransceivers()
                if (video) {
                   console.log('trans', transceivers)
                   window.RTCRtpTransceiver.setCodecPreferences(custom_codecs)
                   //mainWindow.webContents.send('transceivers', data)
                   // console.log('transceivers in backend', data)
                }
                peer2.on('close', () => {
                    console.log('Connection closed..')
                    window.api.endCall(peer2, stream)
                })

                peer2.on('error', (e) => {
                    console.log('Connection lost..', e)
                    window.api.endCall(peer2, stream)
                })

                let first = true;

                peer2.on('signal', data => {


                  console.log('initial offer data:', data);
                    let dataToSend = {
                        data: data,
                        type: 'answer',
                        contact: contact,
                        video: video,
                    }
                    console.log('sending sdp');

                    window.api.send('get-sdp', dataToSend)
                    // peer2._pc.setLocalDescription(recovered_data);
                    if (!first) {
                        return
                    }

                    first = false;

                })

                window.api.send('expand-sdp', msg)

                console.log('sending offer!!!')

                window.api.receive('got-expanded', (message) => {

                    console.log('got expanded', message)
                    // let signal = expand_sdp_offer(message);
                    peer2.signal(message);

                })

                peer2.on('track', (track, stream) => {
                    console.log('Setting up link..', track, stream)
                })

                peer2.on('connect', () => {
                    // SOUND EFFECT
                    console.log('Connection established;')
                });

                peer2.on('stream', peerStream => {
                    // got remote video stream, now let's show it in a video tag
                    console.log('peer2 stream', peerStream)
                    if ('srcObject' in peerVideo) {
                      peerVideo.srcObject = peerStream
                    } else {
                      peerVideo.src = window.URL.createObjectURL(peerStream) // for older browsers
                    }

                    call = true;
                    let tracks = peerStream.getTracks()
                    console.log('tracks', tracks);

                    console.log('Setting up link..');

                })
            }
        }

    })
</script>

<main>
    <audio src={peerStream}></audio>
    <video muted class:show={calling} in:fade id="myVideo" playsinline autoplay bind:this={myVideo}></video>
    <video class:show={call} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video>

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
        height: 25%;
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

    #myVideo {

    }

    #peerVideo {


    }

</style>
