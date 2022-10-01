<script>
  import wrtc from "@koush/wrtc";
  import Peer from "simple-peer";
  import { webRTC, user } from "$lib/stores/user.js";
  import { onMount } from "svelte";


  window.api.receive("answer-call", (msg, contact, key, offchain) => {
    answerCall(msg, contact, key, offchain);
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

  window.api.receive("rtc_message", (msg, to_group = false) => {


    if (to_group) {

      $webRTC.call.forEach(a => {
        let sendMsg = JSON.stringify(msg[0])
        console.log("sending rtc", sendMsg)
        a.peer.send(sendMsg)
      })

      return
    }
    //Address and messageobject
    let [message, address] = msg
    //Find who we are going to send to
    let to = $webRTC.call.filter(a => a.chat == address)
    console.log("sending rtc", message)
    console.log('Message to route?', msg)
    let sendMsg
    if (msg.length === 3) {
      //Want to tunnel message through group inviter to the right address
      sendMsg = JSON.stringify(message + address)
      console.log('sendMsg tunnel', message, address)
      //Here we should try send it to the first connected peer, maybe more
      let tunnel = $webRTC.call[$webRTC.call.length - 1]
      $webRTC.call.forEach(a => {
        a.peer.send(sendMsg)
      })
      return

    } else {
      sendMsg = JSON.stringify(message)
      to[0].peer.send(sendMsg);
    }
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

  const startCall = async (contact, isVideo, screenshare = false) => {
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

  async function changeVideoSource(device, oldSrc, chat) {
    let current = $webRTC.myStream;
    //Set video boolean to stop video
    $webRTC.video = false;
    //Set peer
    let peer = $webRTC.call[0].peer;
    //Add new track to current stream
    current.addTrack(device.getVideoTracks()[0])
    //Replace track
    peer.replaceTrack(current.getVideoTracks()[0], device.getVideoTracks()[0], current);
    //Remove old track
    current.removeTrack(current.getVideoTracks()[0])
    //Update stream
    $webRTC.myStream = current;
    //Set video boolean to play video
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
        //Set defauklt camera id in store
        let camera = $webRTC.devices.filter(a => a.kind === "videoinput")
        console.log('camera', camera)
        $webRTC.cameraId = camera[0].deviceId
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
  $webRTC.showVideoGrid = true
  async function startPeer1(stream, video, contact) {

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


    peer1.on("connect", async () => {
      // SOUND EFFECT
      $webRTC.call[0].connected = true
      console.log("Connection established");
      if (!$webRTC.invited) {
        console.log('Group call connecting...')
        if ($webRTC.call.length >= 2 && $webRTC.initiator) {
          console.log('Initiator true')
          if ($webRTC.groupCall === false) {
            //If no groupcall is started, get a new key
            $webRTC.groupCall = await window.api.createGroup()
            console.log('New group key')
          }

        

        //When you invite a new person to the call
        let thisChat = $webRTC.call[0].chat
        //Sort out all active calls except this
        let callList = $webRTC.call.filter(a => a.chat !== thisChat)

        let activeCall = []
        //Go through that list and add our contacts to a new array
        callList.forEach(a => {
          let tunnelTo = $user.contacts.filter(c => c.chat === a.chat)
          let listItem = a.chat + tunnelTo[0].key
          activeCall.push(listItem)
        })
        //Make an invite message through the datachannel to our new participant
        let msg = JSON.stringify({invite: activeCall, key: $webRTC.groupCall, type:'true'});
        let myMessage = { chat: thisChat, msg: msg, sent: true, timestamp: Date.now() };
        let contact = $user.contacts.filter(a => a.chat === thisChat)
        console.log("Inviting contact", contact)
        let to = thisChat + contact[0].key
        //Send offchain invite message
        window.api.sendMsg(myMessage, to, true, true)
        
      }
    }
      
        //Reset initiator on connect
        $webRTC.initiator = false
        //Reset invited status for connected peer
        $webRTC.invited = false
    });

    peer1.on("data", msg => {
      let incMsg = JSON.parse(msg);
      console.log("msg from peer2", incMsg);
    });

    //Data channel
    peer1._channel.addEventListener("message", (event) => {
      
      let message = JSON.parse(event.data)
      let parsedMsg = message.substring(0, message.length - 99)
      let addr = message.substring(message.length - 99)

      if (addr == $user.huginAddress.substring(0, 99)) {
        console.log('found tunneled message to me', message)
        window.api.decryptMessage(parsedMsg)
        return
      }

      if ($webRTC.call.length > 1 && $webRTC.initiator) {
        console.log('Group message', event)
        let groupMessage = JSON.parse(event.data)
        let address = groupMessage.substring(groupMessage.length - 99)
        //If the address is one of our active calls, tunnel the message
        if ($webRTC.call.some(a => a.chat == address)) {
          let tunnel = true
          let sendTunnel = $webRTC.filter(a => a.chat === address)
          sendTunnel[0].peer.send(event.data)
          return
        }
        //Decrypt group message, groupCall is either key or false.
        console.log('Group message', groupMessage)
        window.api.decryptGroupMessage(groupMessage, $webRTC.groupCall)
        return
      }
      console.log('addr?', addr.substring(0,4))
        if (addr.substring(0,4)  == "SEKR") {
          console.log('this message should be routed elsewere')
          return
        }
        //Decrypt message
        console.log('message', message)
        window.api.decryptMessage(message)
    })
    console.log('peer1', peer1._channel)

    let group = false
    let offchain = false

    if ($webRTC.groupCall && $webRTC.call.length == 1) {
      group = $webRTC.groupCall
    } else if ($webRTC.groupCall) {
      offchain = true
    }


    sendOffer(peer1, contact, video, group, offchain)

    return peer1;
  }


  const answerCall = (msg, contact, key, offchain) => {
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


    async function gotMedia(stream) {
      $webRTC.showVideoGrid = true
      console.log("FN getMedia", stream, video);

      let peer2 = await startPeer2(stream, video);
      //Check codecs
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
        //Set defauklt camera id in store
        let camera = $webRTC.devices.filter(a => a.kind === "videoinput")
        console.log('camera', camera)
        $webRTC.cameraId = camera[0].deviceId
        console.log("transceivers", transceivers);
        transceivers[1].setCodecPreferences(custom_codecs);
      }

      console.log("codec set");
      //Set webRTC store update for call
      $webRTC.call[0].peer = peer2;
      $webRTC.myStream = stream;
      $webRTC.call[0].myStream = stream;
      $webRTC.active = true;
      $webRTC.call[0].video = video;

      if (video) {
        $webRTC.myVideo = true;
      }


      sendAnswer(msg, contact, peer2, key, video, offchain);

      console.log("answrcall done");

    }
  };

  async function startPeer2(stream, video) {

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
      $webRTC.call[0].connected = true;
      //Reset invited status for connected peer
      $webRTC.invited = false
      console.log('groupcall key?', $webRTC.groupCall)
      if ($webRTC.groupCall && $webRTC.call.length === 1) {
        //This is the first peer invited to a call
        $webRTC.invited = true
      }
      peer2._channel.addEventListener("message", (event) => {

        let message = JSON.parse(event.data)
        let addr = message.substring(message.length - 99)
        let parsedMsg = message.substring(0, message.length - 99)

        if (addr == $user.huginAddress.substring(0, 99)) {
          console.log('found tunneled message to me', message)
          window.api.decryptMessage(parsedMsg)
          return
        }
        if ($webRTC.call.length > 1 && $webRTC.groupCall) {
        console.log('Group message', event)
        let groupMessage = JSON.parse(event.data)
        let address = groupMessage.substring(groupMessage.length - 99)
        //If the address is one of our active calls, tunnel the message
        if ($webRTC.call.some(a => a.chat == address)) {
          let tunnel = true
          let sendTunnel = $webRTC.filter(a => a.chat === address)
          sendTunnel[0].peer.send(event.data)
          return
        }
        console.log('addr?', addr.substring(0,4))
        if (addr.substring(0,4)  == "SEKR") {
          console.log('this message should be routed elsewere')
          return
        }
        //Decrypt group message, groupCall is either key or false.
        console.log('Group parsed message', message)
        window.api.decryptGroupMessage(message, $webRTC.groupCall)
        return
      }
      //Normal message
        console.log('message', event.data)
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

  function sendOffer(peer, contact, video, group = false, offchain = false) {

    peer.on("signal", data => {

      let dataToSend = {
        data: data,
        type: "offer",
        contact: contact,
        video: video,
        group: group,
        offchain: offchain
      };

      console.log("SDP", data);

      window.api.send("get-sdp", dataToSend);


    });


  }

  function sendAnswer(sdpOffer, address, peer, key, video, offchain = false, group = false) {

    console.log("offer?", sdpOffer);

    window.api.expandSdp(sdpOffer, address);
    
    if ($webRTC.groupCall && !$webRTC.invited) {
      group = $webRTC.groupCall
    }
    
    peer.on("signal", data => {

      console.log("initial offer data:", data);
      let dataToSend = {
        data: data,
        type: "answer",
        contact: address + key,
        video: video,
        offchain: offchain,
        group: group
      };
      console.log("sending sdp", dataToSend);

      window.api.send("get-sdp", dataToSend);


    });
  }


  //End call
  function endCall(peer, stream, contact) {

    let caller = $webRTC.call.filter(a => a.chat === contact);
    
    console.log('Want to end call with', contact)

    if (contact === undefined) {
      console.log('contact', contact)
      caller = $webRTC.call.filter(e => e.peer.channelName == peer.channelName);
    }

    if (contact && peer == undefined) {
      console.log('Call already ended')
      return
    }

    console.log('this peer?', peer)
    console.log(' ending this caller', caller[0])

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

    console.log('cleared this call from', filter)
    $webRTC.call = filter;

    if ($webRTC.call.some(a => a.peerVideo)) {
      $webRTC.myVideo = true;
      console.log('Already got a video call open, return')
      return;
    }

    if ($webRTC.call.some(a => a.peerAudio)) {
      console.log('Already got a audio call open, return')
      $webRTC.myVideo = false;
      return;
    }
    $webRTC.showVideoGrid = false
    console.log('Last call ending')
    $webRTC.myVideo = false;
    $webRTC.myStream.getTracks().forEach(function(track) {
        track.stop();
      });
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
