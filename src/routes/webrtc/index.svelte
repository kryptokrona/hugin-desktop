<script>
    import {RTCPeerConnection, RTCRtpTransceiver} from '@koush/wrtc'
    import wrtc from '@koush/wrtc'
    import {fade} from "svelte/transition";
    import Peer from "simple-peer";
    import {onMount} from "svelte";

    let stream;
    let myvideo

    onMount(() => {
        window.api.receive('start-call', (conatct, calltype) => {
            startCall(conatct, calltype)
        })

        async function startCall (contact, isVideo, screenshare=false) {
            // spilt input to addr and pubkey
            let contact_address = contact.substring(0, 99);
            console.log('contact address', contact_address)
            let msg;

            console.log('Starting call..');
            if (!screenshare) {
                // get video/voice stream
                stream = navigator.mediaDevices.getUserMedia({
                    video: isVideo,
                    audio: true
                }).then(gotMedia(stream, contact)).catch(() => {
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
        let video;
        async function gotMedia (stream, contact, screen_stream=false) {
            console.log('We want contact', contact)
            if ( video ) {
                myvideo = document.getElementById('myvideo')




                if (screen_stream) {
                    myvideo.srcObject = screen_stream;
                    screen_stream.addTrack(stream.getAudioTracks()[0]);

                    stream = screen_stream;
                } else {
                    myvideo.srcObject = stream;
                }
                myvideo.play();
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

            let custom_codecs = [];

            let codec;
            for (codec in video_codecs.codecs) {
                let this_codec = video_codecs.codecs[codec];
                if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0,5) == "level") {
                    custom_codecs.push(this_codec);
                }

            }



            let transceivers = peer1._pc.getTransceivers()

            // select the desired transceiver
            if (video) {
                transceivers[1].setCodecPreferences(custom_codecs)
            }

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

            peer1.on('stream', stream => {
                // got remote video stream, now let's show it in a video tag
                let extra_class = "";
                if (video) {
                    extra_class = " video"
                }
                // SELECT AND SHOW VIDEO ELEMENT
                let video_element = ""


                if ('srcObject' in video_element) {
                    video_element.srcObject = stream
                } else {
                    video_element.src = window.URL.createObjectURL(stream) // for older browsers
                }
                video_element.play()

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
            window.api.receive('got-callback', async (e, callback, sender) => {
                console.log('callback', callback);
                console.log('from', sender);
                peer1.signal(callback);
                console.log('Connecting to ...', sender)

            })

        }


        window.api.receive('answer-call', (msg, contact) => {
            answerCall(msg, contact)
        })

        async function answerCall (msg, contact) {
            console.log('APPLE', msg, contact)

            let video
            if (msg.substring(0, 1) === 'Δ') {
                video = true
            }
            // $('#messages_contacts').addClass('in-call');
            // $('#settings').addClass('in-call');

            // get video/voice stream
            try {
                let stream = await navigator.mediaDevices.getUserMedia({
                    video: video,
                    audio: true
                })
                gotMedia(stream)
                console.log('ssssstream', stream)
            }catch (e) {
                console.log(e)
            }

            console.log('Got media')


            function gotMedia(stream) {
                console.log('FN getMedia', stream, video)

                // select the desired transceiver

                if (video) {
                    //stream.play();
                    console.log('god video here plz stream it in frontend')
                }

                let peer2 = new Peer({stream: stream, trickle: false, wrtc: wrtc})
                let trans = new RTCPeerConnection();

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

                //let transceivers = trans.getTransceivers()
                //if (video) {
                //    console.log('trans', transceivers)
                //    let data = window.RTCRtpTransceiver.setCodecPreferences(custom_codecs)
                //    //mainWindow.webContents.send('transceivers', data)
                //    console.log('transceivers in backend', data)
                //}
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
                    console.log('initial data:', data);
                    window.api.send('get-sdp', data, 'answer', contact, video)
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

                peer2.on('stream', stream => {
                    // got remote video stream, now let's show it in a video tag
                    console.log('peer2 stream', stream)
                    //if ('srcObject' in video) {
                    //  video.srcObject = stream
                    //} else {
                    //  video.src = window.URL.createObjectURL(stream) // for older browsers
                    //}


                    console.log('Setting up link..');

                })
            }
        }

    })
</script>

<main>
    <audio src={stream}></audio>
    {#if myvideo}
    <video in:fade id="myvideo" playsinline autoplay bind:this={myvideo}></video>
    {/if}
</main>

<style lang="scss">

    main {
      position: absolute;
        margin: 0 85px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        width: 100%;
        z-index: 0;
    }

    video {
        width: 200px;
        height: 200px;
        border: 1px solid red;
    }

</style>