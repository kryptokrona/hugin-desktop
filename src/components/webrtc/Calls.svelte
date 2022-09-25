<script>
  import wrtc from "@koush/wrtc";
  import Peer from "simple-peer";
  import { webRTC } from "$lib/stores/user.js";


  window.api.receive("answer-call", (msg, contact, key) => {
    answerCall(msg, contact, key);
  });

  window.api.receive("start-call", (conatct, calltype) => {
    startCall(conatct, calltype);
  });


  window.api.receive("endCall", (s, p, this_call) => {
    endCall("peer", "stream", this_call);
  });

  window.api.receive("screen-share", (id) => {
    shareScreen(id);
  });

  window.api.receive("set-camera", () => {
    changeCamera(true, $webRTC.cameraId);
  });

  window.api.receive("check-src", () => {
    checkSources();
  });

  window.api.receive("change-source", (src) => {
    console.log("want to change in calls", src);
    changeCamera(true, src);
  });

  window.api.receive("got-expanded", async (callData) => {
    console.log("caller expanded", callData);
    let contact = $webRTC.call.filter(a => a.chat == callData[1]);
    console.log(contact);

    contact[0].peer.signal(callData[0]);

  });

  window.api.receive("rtc_message", msg => {
    let to = $webRTC.call.filter(a => a.chat == msg.chat);
    console.log("sending rtc");
    let sendMsg = JSON.stringify(msg);
    to[0].peer.send(sendMsg);
    console.log("sent");
  });


  //Awaits msg answer with sdp from contact
  window.api.receive("got-callback", (callerdata) => {
    let callback = JSON.parse(callerdata.data);
    console.log("callback parsed", callback);
    let contact = $webRTC.call.filter(a => a.chat === callerdata.chat);
    console.log("contact filter", contact);
    contact[0].peer.signal(callback);
    console.log("Connecting to ...", callerdata.chat);

  });

  navigator.mediaDevices.ondevicechange = () => {
    console.log("device plugged in");
    checkSources();
  };

  const startCall = (contact, isVideo, screenshare = false) => {
    // spilt input to addr and pubkey
    let contact_address = contact.substring(0, 99);

    console.log("contact address", contact_address);
    console.log("Hugin Address", contact);

    console.log("Starting call..");

    // get video/voice stream
    navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: true
    }).then(function(stream) {
      gotMedia(stream, contact, isVideo, screenshare);
    }).catch(() => {
      console.log("error", stream);

    });


  };


  async function shareScreen(id) {


    const screen_stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: id,
          minWidth: 1280,
          maxWidth: 1280,
          minHeight: 720,
          maxHeight: 720
        }
      }
    });

    changeVideoSource(screen_stream);

  }

/*  function setCamera(video) {

    let current = $webRTC.myStream;

    console.log(video.getVideoTracks()[0]);
    console.log("tracks", current.getVideoTracks()[0]);
    let peer = $webRTC.call[0].peer;
    current.removeTrack(current.getVideoTracks()[0])
    current.addTrack(video.getVideoTracks()[0])
    peer.replaceTrack(current.getVideoTracks()[0], video.getVideoTracks()[0], current);
    $webRTC.screen_stream = false;
    $webRTC.myStream = video;
    $webRTC.video = true;
  }*/

/*  function setMedia(screen) {

    let oldStream = $webRTC.myStream;
    $webRTC.oldStream = oldStream;
    //Set microphone audio to screen_share track

    oldStream.removeTrack(oldStream.getVideoTracks()[0])
    screen.addTrack(screen.getVideoTracks()[0])
    screen.addTrack(oldStream.getAudioTracks()[0]);
    let peer = $webRTC.call[0].peer;
    //Replace track
    peer.replaceTrack(oldStream.getVideoTracks()[0], screen.getVideoTracks()[0], oldStream);
    $webRTC.myStream = screen;
    console.log("stream set", $webRTC.myStream);
    $webRTC.screen_stream = true;
    $webRTC.video = false;

  }*/

  $: {
    console.log("device", $webRTC.devices);
    console.log("Active Camera", $webRTC.cameraId)
  }

  async function checkSources() {
    let stream = $webRTC.myStream;
    let devices = await navigator.mediaDevices.enumerateDevices();
    console.log("devices", devices);
    $webRTC.devices = devices;

  }

  function changeVideoSource(device, oldSrc, chat) {
    let current = $webRTC.myStream;

    $webRTC.video = false;
    console.log("new src", device);
    let peer = $webRTC.call[0].peer;
    current.removeTrack(current.getVideoTracks()[0])
    current.addTrack(device.getVideoTracks()[0])
    console.log("new?", device.getVideoTracks()[0]);
    peer.replaceTrack(current.getVideoTracks()[0], device.getVideoTracks()[0], current);
    $webRTC.myStream = device;
    $webRTC.video = true;

  }

  async function changeCamera(video, id, chat) {
    if (video) {
      // get video/voice stream
      navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: id
        }
      }).then(function(device) {
        changeVideoSource(device);
      }).catch((e) => {
        console.log("error", e);
      });
    }
  }


  async function gotMedia(stream, contact, video, screen_stream = false) {

    $webRTC.myStream = stream;
    if (video) {

      $webRTC.myVideo = true;

      if (screen_stream) {
        let id = await window.api.shareScreen(true);
        shareScreen(id);
      }

    } else {

      console.log("Audio call");
    }

    let peer1 = await startPeer1(stream, video, contact);

    $webRTC.call[0].peer = peer1;
    $webRTC.call[0].screen_stream = screen_stream;
    $webRTC.call[0].myStream = stream;
    $webRTC.call[0].video = video;
    $webRTC.cameraId = stream.getVideoTracks()[0].deviceId
    console.log("This call", $webRTC.call[0]);
    checkSources();
    let video_codecs = window.RTCRtpSender.getCapabilities("video");
    let audio_codecs = window.RTCRtpSender.getCapabilities("audio");
    console.log("audio calling codecs", audio_codecs);
    console.log("audio calling codecs", video_codecs);
    let custom_codecs = [];

    let codec;
    for (codec in video_codecs.codecs) {
      let this_codec = video_codecs.codecs[codec];
      if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0, 5) == "level") {
        custom_codecs.push(this_codec);
      }
      console.log("custom codenccc", custom_codecs);

    }

    let transceiverList = peer1._pc.getTransceivers();
    console.log("audio tracks", transceiverList);
    if (video) {
      // select the desired transceiver
      transceiverList[1].setCodecPreferences(custom_codecs);

    }
    $webRTC.active = true;


    peer1.on("stream", peerStream => {

      console.log(" Got peerstream object in store");

      //Set peerStream to store
      $webRTC.call[0].peerStream = peerStream;
      if (video) {
        $webRTC.call[0].peerVideo = true;
      } else {
        $webRTC.call[0].peerAudio = true;
      }

    });


  }

  function startPeer1(stream, video, contact) {

    let peer1 = new Peer({
      initiator: true,
      stream: stream,
      trickle: false,
      wrtc: wrtc,
      offerOptions: { offerToReceiveVideo: true, offerToReceiveAudio: true },
      sdpTransform: (sdp) => {
        return sdp;
      }
    });

    peer1.on("close", (e) => {
      console.log(e);
      console.log("Connection lost..");
      endCall(peer1, stream);
      // ENDCALL AUDIO
    });

    peer1.on("error", (e) => {
      console.log(e);
      console.log("Connection lost..");

      endCall(peer1, stream);
      // ENDCALL AUDIO
    });


    peer1.on("connect", () => {
      // SOUND EFFECT
      console.log("Connection established");
      $webRTC.connected = true;
    });

    peer1.on("data", msg => {
      let incMsg = JSON.parse(msg);
      console.log("msg from peer2", incMsg);
    });

    peer1._channel.addEventListener("message", (event) => {
        console.log('message', event.data)
        let message = JSON.parse(event.data)
        window.api.decryptMessage(message)
    })
    console.log('peer1', peer1._channel)

    sendOffer(peer1, contact, video);

    return peer1;
  }


  const answerCall = (msg, contact, key) => {
    console.log("APPLE", msg, contact, key);

    let video = false;
    if (msg.substring(0, 1) === "Δ") {
      video = true;
    }

    // get video/voice stream
    navigator.mediaDevices.getUserMedia({
      video: video,
      audio: true
    }).then(gotMedia).catch(() => {
    });
    console.log("Got media");


    function gotMedia(stream) {
      console.log("FN getMedia", stream, video);

      let peer2 = startPeer2(stream, video);

      let custom_codecs = [];
      let video_codecs = window.RTCRtpSender.getCapabilities("video");
      let audio_codecs = window.RTCRtpSender.getCapabilities("audio");
      console.log("audio calling codecs", audio_codecs);
      console.log("audio calling codecs", video_codecs);
      let codec;
      for (codec in video_codecs.codecs) {
        let this_codec = video_codecs.codecs[codec];
        if (this_codec.mimeType === "video/H264" && this_codec.sdpFmtpLine.substring(0, 5) === "level") {
          custom_codecs.push(this_codec);
        }
        console.log(custom_codecs);
      }

      // select the desired transceiver
      let transceivers = peer2._pc.getTransceivers();
      if (video) {
        console.log("transceivers", transceivers);
        transceivers[1].setCodecPreferences(custom_codecs);
      }

      console.log("codec set");

      $webRTC.call[0].peer = peer2;
      $webRTC.myStream = stream;
      $webRTC.call[0].myStream = stream;
      $webRTC.active = true;
      $webRTC.call[0].video = video;

      if (video) {
        $webRTC.myVideo = true;
      }


      sendAnswer(msg, contact, peer2, key, video);

      console.log("answrcall done");

    }
  };

  function startPeer2(stream, video) {

    let peer2 = new Peer({ stream: stream, trickle: false, wrtc: wrtc });

    peer2.on("close", (e) => {
      console.log("Connection closed..", e);
      endCall(peer2, stream);
    });

    peer2.on("error", (e) => {
      console.log("Connection lost..", e);
      endCall(peer2, stream);
    });

    peer2.on("data", data => {
      console.log("data from peer", data);
      let incMsg = JSON.parse(data);
      console.log("msg from peer2", incMsg);

    });


    console.log("sending offer!!!");

    peer2.on("track", (track, stream) => {
      console.log("Setting up link..", track, stream);
    });

    peer2.on("connect", () => {
      // SOUND EFFECT
      console.log("Connection established;");
      $webRTC.connected = true;
      peer2._channel.addEventListener("message", (event) => {
        console.log('message', event.data)
        let message = JSON.parse(event.data)
        window.api.decryptMessage(message)
    })

    });

    peer2.on("stream", peerStream => {
      // got remote video stream, now let's show it in a video tag

      console.log("peer2 stream", peerStream);
      $webRTC.call[0].peerStream = peerStream;

      if (video) {
        $webRTC.call[0].peerVideo = true;
      } else {
        $webRTC.call[0].peerAudio = true;
      }


      console.log("Setting up link..");

    });

    return peer2;
  }

  function sendOffer(peer, contact, video) {

    peer.on("signal", data => {

      let dataToSend = {
        data: data,
        type: "offer",
        contact: contact,
        video: video
      };

      console.log("SDP", data);

      window.api.send("get-sdp", dataToSend);


    });


  }

  function sendAnswer(sdpOffer, address, peer, key, video) {

    console.log("offer?", sdpOffer);

    window.api.expandSdp(sdpOffer, address);

    peer.on("signal", data => {

      console.log("initial offer data:", data);
      let dataToSend = {
        data: data,
        type: "answer",
        contact: address + key,
        video: video
      };
      console.log("sending sdp");

      window.api.send("get-sdp", dataToSend);


    });
  }


  //End call
  function endCall(peer, stream, contact) {

    let caller = $webRTC.call.filter(a => a.chat === contact);
    let video = false;
    if (contact === undefined) {
      caller = $webRTC.call.filter(e => e.peer == peer);
    }

    try {
      caller[0].peer.destroy();
      caller[0].myStream.getTracks().forEach(function(track) {
        track.stop();
      });
    } catch (e) {
      console.log("error", e);
    }

    let filter;
    if (contact === undefined) {
      filter = $webRTC.call.filter(e => e.peer !== peer);
    } else {
      filter = $webRTC.call.filter(a => a.chat !== contact);
    }
    $webRTC.call = filter;

    if ($webRTC.call.some(a => a.video === true)) {
      $webRTC.myVideo = true;
      return;
    }

    $webRTC.myVideo = false;

    console.log("Call ended");

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
