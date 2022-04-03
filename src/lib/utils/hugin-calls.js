import { expand_sdp_offer, expand_sdp_answer } from "./sdp.js";
import Peer from 'simple-peer'


let emitCall;
let awaiting_callback;
let active_calls = []
let callback;

function parse_sdp (sdp) {

    let ice_ufrag = '';
    let ice_pwd = '';
    let fingerprint = '';
    let ips = [];
    let ports = [];
    let ssrcs = [];
    let msid = "";
    let ip;
    let port;

    let lines = sdp.sdp.split('\n')
        .map(l => l.trim()); // split and remove trailing CR
    lines.forEach(function(line) {

        if (line.includes('a=fingerprint:') && fingerprint == '') {

            let parts = line.substr(14).split(' ');
            let hex = line.substr(22).split(':').map(function (h) {
                return parseInt(h, 16);
            });

            fingerprint = btoa(String.fromCharCode.apply(String, hex));


        } else if (line.includes('a=ice-ufrag:') && ice_ufrag == '') {

            ice_ufrag = line.substr(12);


        } else if (line.includes('a=ice-pwd:') && ice_pwd == '') {

            ice_pwd = line.substr(10);

        } else if (line.includes('a=candidate:')) {

            let candidate = line.substr(12).split(" ");

            ip = candidate[4]
            port = candidate[5]
            type = candidate[7]



            let hexa = ip.split('.').map(function (h) {
                return h.toString(16);
            });

            let ip_hex = btoa(String.fromCharCode.apply(String, hexa));


            if (type == "srflx") {
                ip_hex = "!" + ip_hex
            } else {
                ip_hex = "?" + ip_hex
            }

            if (!ips.includes(ip_hex)) {
                ips = ips.concat(ip_hex)

            }

            let indexedport = port+ips.indexOf(ip_hex).toString();

            ports = ports.concat(en.encode(parseInt(indexedport)));


        } else if (line.includes('a=ssrc:')) {

            let ssrc = en.encode(line.substr(7).split(" ")[0]);

            if (!ssrcs.includes(ssrc)) {

                ssrcs = ssrcs.concat(ssrc)

            }


        } else if (line.includes('a=msid-semantic:')) {

            msid = line.substr(16).split(" ")[2];


        }



    })

    return ice_ufrag + "," + ice_pwd + "," + fingerprint + "," + ips.join('&') + "," + ports.join('&') + "," + ssrcs.join('&') + "," + msid;

}


export function startCall (contact, audio, video, screenshare=false) {
    // spilt input to addr and pubkey
    let contact_address = contact.substring(0,99);
    console.log('contact address', contact_address)

    console.log('Starting call..');

    // $('#video-button').unbind('click');
    //
    // $('#call-button').unbind('click');
    //
    // $('#screen-button').unbind('click');

    if (!screenshare) {
        // get video/voice stream
        navigator.mediaDevices.getUserMedia({
            video: video,
            audio: audio
        }).then(gotMedia).catch(() => {
        })
    }

}

export function parseCall (msg, sender=false, emitCall=true) {

    switch (msg.substring(0,1)) {
        case "Δ":
        // Fall through
        case "Λ":
            // Call offer
            if (emitCall) {

                // Start ringing sequence

                mainWindow.webContents.send('call-incoming', msg, sender)
                // Handle answer/decline here

                console.log('call incoming')
            }
            return `${msg.substring(0,1) == "Δ" ? "Video" : "Audio"} call started`;
            break;
        case "δ":
        // Fall through
        case "λ":
            // Answer
            if (emitCall) {
                callback = JSON.stringify(expand_sdp_answer(msg));
                mainWindow.webContents.send('got-callback', callback, sender)
                console.log('got sdp', msg)
                console.log('got answer expanded', callback)
            }
            return "";

            break;
        default:
            return msg;

    }

}

async function gotMedia (stream, screen_stream=false, contact) {
    if (video) {
        // var myvideo = document.getElementById('myvideo')


        if (screen_stream) {
            myvideo.srcObject = screen_stream;
            screen_stream.addTrack(stream.getAudioTracks()[0]);

            stream = screen_stream;
        } else {
            myvideo.srcObject = stream;
        }
        myvideo.play();
        //VIDEO SCREEN FADE IN
    } else {

    }

    let peer1 = new Peer({
        initiator: true,
        stream: stream,
        trickle: false,
        offerOptions: {offerToReceiveVideo: true, offerToReceiveAudio: true},
        sdpTransform: (sdp) => {
            return sdp;
        }
    })

    let video_codecs = window.RTCRtpSender.getCapabilities('video');

    let custom_codecs = [];

    for (codec in video_codecs.codecs) {
        let this_codec = video_codecs.codecs[codec];
        if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0, 5) == "level") {
            custom_codecs.push(this_codec);
        }

    }


    let transceivers = peer1._pc.getTransceivers()

    // select the desired transceiver
    if (video) {
        transceivers[1].setCodecPreferences(custom_codecs)
    }

    let first = true;

    peer1.on('close', () => {

        console.log('Connection lost..')

        endCall(peer1, stream);

        // ENDCALL AUDIO
    })

    peer1.on('error', () => {

        console.log('Connection lost..')

        endCall(peer1, stream);
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
        console.log('real data:', data);
        let parsed_data = `${video ? "Δ" : "Λ"}` + parse_sdp(data);
        console.log('parsed data:', parsed_data);
        let recovered_data = expand_sdp_offer(parsed_data);
        console.log('recovered data:', recovered_data);
        console.log('some other data:', {'type': 'offer', 'sdp': recovered_data});
        // peer1._pc.setLocalDescription(recovered_data);
        let msg = recovered_data;

        if (!first) {
            return
        }

        window.api.sendMsg(msg, contact)

        awaiting_callback = true;

        first = false;

    })
        //Awaits msg answer with sdp from contact
    window.api.on('got-callback', async (data, sender) => {

        peer1.signal(data);
        console.log('Connecting to ...', sender)

    })

}

export function answerCall (msg, contact_address) {

    let video = msg.substring(0,1) == 'Δ';
    // $('#messages_contacts').addClass('in-call');
    // $('#settings').addClass('in-call');

    // get video/voice stream
    navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true
    }).then(gotMedia).catch(() => {})

    function gotMedia (stream) {
        let extra_class = '';
        if (video) {
            extra_class = ' video'
            // var myvideo = document.getElementById('myvideo')
            myvideo.srcObject = stream;

            myvideo.play();
            console.log('god video here plz stream it in frontend')
        }


        let video_codecs = window.RTCRtpSender.getCapabilities('video');

        let custom_codecs = [];

        for (codec in video_codecs.codecs) {
            let this_codec = video_codecs.codecs[codec];
            if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0,5) == "level") {
                custom_codecs.push(this_codec);
            }

        }
        let peer2 = new Peer({stream: stream, trickle: false})

        let transceivers = peer2._pc.getTransceivers();

        // select the desired transceiver
        if (video) {
            transceivers[1].setCodecPreferences(custom_codecs);
        }

        peer2.on('close', () => {

            console.log('Connection closed..')
            endCall(peer2, stream);

        })

        peer2.on('error', () => {

            console.log('Connection lost..')

            endCall(peer2, stream);

        })

        let first = true;



        peer2.on('signal', data => {
            console.log('initial data:', data);
            let parsed_data = `${video ? 'δ' : 'λ'}` + parse_sdp(data);
            console.log('parsed data really cool sheet:', parsed_data);
            let recovered_data = expand_sdp_answer(parsed_data);
            data = recovered_data;
            console.log('recovered data:', recovered_data);
            // peer2._pc.setLocalDescription(recovered_data);
            if (!first) {
                return
            }
            console.log('Sending answer ', parsed_data);
            sendMessage(parsed_data, contact);
            first = false;

        })
        let signal = expand_sdp_offer(msg);
        peer2.signal(signal);

        peer2.on('track', (track, stream) => {
            console.log('Setting up link..')
        })

        peer2.on('connect', () => {

            // SOUND EFFECT
            console.log('Connection established;')

        });

        peer2.on('stream', stream => {
            // got remote video stream, now let's show it in a video tag

            if ('srcObject' in video) {
                video.srcObject = stream
            } else {
                video.src = window.URL.createObjectURL(stream) // for older browsers
            }

            video.play();

            console.log('Setting up link..');

        })
    }

}

export function endCall (peer, stream) {
    peer.destroy();
    stream.getTracks().forEach(function(track) {
        track.stop();
    });

    //var myvideo = document.getElementById('myvideo');

    myvideo.srcObject = stream;
    myvideo.pause();
    myvideo.srcObject = null;

    awaiting_callback = false;

}
