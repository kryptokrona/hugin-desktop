<script>
  import wrtc from "@koush/wrtc";
  import Peer from "simple-peer";
  import { webRTC, user, audioLevel } from "$lib/stores/user.js";
  import { onMount } from "svelte";
  import { rtcgroupMessages } from "$lib/stores/rtcgroupmsgs.js";
  import { videoGrid } from "$lib/stores/layout-state.js";

  onMount(()=> {
    checkSources()
  })

  window.api.receive("answer-call", (msg, contact, key, offchain) => {
    answerCall(msg, contact, key, offchain);
  });

  window.api.receive("start-call", (conatct, calltype, invite = false) => {
    startCall(conatct, calltype, invite);
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

  window.api.receive("set-audio-input", (id) => {
    changeAudio(id);
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
    let contact = $webRTC.call.find(a => a.chat == callData[1]);
    console.log(contact);

    contact.peer.signal(callData[0]);

  });

  window.api.receive("rtc_message", (msg, to_group = false) => {

    console.log('my active calls', $webRTC.call)

    if (to_group) {
      console.log('sending rtc group message')
      let connected = $webRTC.call.filter(a => a.connected == true)
      connected.forEach(a => {
        console.log(
          'sending to peer', a.peer
        )
        let sendMsg = JSON.stringify(msg[0])
        console.log("sending rtc", sendMsg)
        a.peer.send(sendMsg)
      })

      return
    }
    //Address and messageobject
    let [message, address] = msg
    //Find who we are going to send to
    let to = $webRTC.call.find(a => a.chat == address)
    console.log("sending rtc", message)
    console.log('Message to route?', msg)
    let sendMsg
    if (msg.length === 3 && !to.connected) {
      //Want to tunnel message through group inviter to the right address
      sendMsg = JSON.stringify(message + address)
      console.log('sendMsg tunnel', message, address)
      //Here we should try send it to the first connected peer, maybe more
      let tunnel = $webRTC.call[$webRTC.call.length - 1]
      tunnel.peer.send(sendMsg)
      return

    } else {
      console.log('sending', message)
      console.log('to', to)
      sendMsg = JSON.stringify(message)
      to.peer.send(sendMsg);
    }
    console.log("sent");
  });


  //Awaits msg answer with sdp from contact
  window.api.receive("got-callback", (callerdata) => {
    let callback = JSON.parse(callerdata.data);
    console.log("callback parsed", callback);
    console.log('callerdata', callerdata)
    let contact = $webRTC.call.find(a => a.chat === callerdata.chat);
    console.log("contact filter", contact);
    contact.peer.signal(callback);
    console.log("Connecting to ...", callerdata.chat);

  });

  navigator.mediaDevices.ondevicechange = () => {
    console.log("device plugged in");
    checkSources();
  };

  const startCall = async (contact, isVideo, invite = false, screenshare = false) => {
    // spilt input to addr and pubkey
   
    let contact_address = contact.substring(0, 99);

    if (invite) {
      let call = {chat: contact_address, type: "invite"}
      $webRTC.call.unshift(call)
    }
    
    if ($webRTC.initiator) {
      await sendInviteNotification(contact, contact_address)
    }

    console.log("XKR Address", contact_address);
    console.log("Hugin Address", contact);

    console.log("Starting call..");

    //Get video/voice stream
    navigator.mediaDevices.getUserMedia({
      video: isVideo,
      audio: {
        googNoiseSupression: true
        },
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

  $: {
    console.log("My Audio/Video devices", $webRTC.devices);
    console.log("Active Camera", $webRTC.cameraId)
  }

  async function sendInviteNotification(contact, contact_address) {
    
    let callList = $webRTC.call.filter(a => a.chat !== contact_address)
     //Notify other users in the call about the invite.
     let msg = {
        m: "ᛊNVITᛊ",
        r: contact,  
        g: $webRTC.groupCall,
        k: $user.huginAddress.substring(0,99)
      }
    callList.forEach(a => {
      window.api.sendGroupMessage(msg, true)
    })
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

  async function changeAudioSource(device, oldSrc, chat) {
    let current = $webRTC.myStream;
    console.log('want to change audio', device)
    //Add new track to current stream
    current.addTrack(device.getAudioTracks()[0])
    //Replace track
    $webRTC.call.forEach(a => {
      console.log('replacing track', a.peer)
      a.peer.replaceTrack(current.getAudioTracks()[0], device.getAudioTracks()[0], current)
    });
    //Remove old track
    current.removeTrack(current.getAudioTracks()[0])
    //Update stream
    $webRTC.myStream = current;

  }

  async function changeAudio(id, chat) {
      // get video/voice stream
      navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: id
        }
      }).then(function(device) {
        changeAudioSource(device);
      }).catch((e) => {
        console.log("error", e);
      });
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

  async function inviteToGroupCall(peer) {
    
    console.log('Group call connecting...')
    if ($webRTC.groupCall === false) {
      //If no groupcall is started, get a new key
      $webRTC.groupCall = await window.api.createGroup()
      console.log('New group key', $webRTC.groupCall)
    }
      
    //When you invite a new person to the call
    let thisCall = $webRTC.call.find(a => a.peer === peer)
    let contact = $user.contacts.find(a => a.chat === thisCall.chat)
    console.log('this call', thisCall)
    //Sort out all active calls except this
    let callList = $webRTC.call.filter(a => a.chat !== thisCall.chat)
    let activeCall = []
    let type = $webRTC.myVideo
    //If we have more active calls, invite them aswell.
    if (callList.length) {
    //Go through that list and add our contacts to a new array
    callList.forEach(a => {
      let tunnelTo = $user.contacts.find(c => c.chat === a.chat)
      let listItem = a.chat + tunnelTo.key
      activeCall.push(listItem)
      console.log('inviting', listItem)
    })
    } else {
      //First
      type = "invite"
    }
    //Make an invite message through the datachannel to our new participant
    let msg = {invite: activeCall, key: $webRTC.groupCall, type: type}
    let myMessage = { chat: thisCall.chat, msg: msg, sent: true, timestamp: Date.now() };
    console.log("Inviting contact", myMessage)
    let to = thisCall.chat + contact.key
    //Send offchain invite message
    window.api.sendMsg(myMessage, to, true, true)
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

    checkMyVolume(peer1)
     //Set webRTC store update for call
    $webRTC.call[0].peer = peer1;
    $webRTC.call[0].screen_stream = screen_stream;
    $webRTC.call[0].myStream = stream;
    $webRTC.call[0].video = video;
   
    console.log("This call", $webRTC.call[0]);
    checkSources();
    let video_codecs = window.RTCRtpSender.getCapabilities("video");
    let audio_codecs = window.RTCRtpSender.getCapabilities("audio");
    let custom_codecs = [];

    let codec;
    for (codec in video_codecs.codecs) {
      let this_codec = video_codecs.codecs[codec];
      if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0, 5) == "level") {
        custom_codecs.push(this_codec);
      }

    }

    let transceiverList = peer1._pc.getTransceivers();

    if (video) {
        //Set defauklt camera id in store
        let camera = $webRTC.devices.filter(a => a.kind === "videoinput")
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
      
      $videoGrid.showVideoGrid = true
    });

  }

  
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
      checkVolume(peer1)
      console.log("Connection established");
      if (!$webRTC.invited) {
          inviteToGroupCall(peer1)
      }
      if ($webRTC.call.length > 1) {
        $webRTC.group = true
      }
    })

    peer1.on("data", msg => {
      let incMsg = JSON.parse(msg);
      console.log("msg from peer2", incMsg);
    });

    //Data channel
    peer1._channel.addEventListener("message", (event) => {

      checkMessage(event)

    })
  
    //Check status for offer

    let group = false
    let offchain = false

    if ($webRTC.groupCall && $webRTC.call.length > 1 && $webRTC.call[0].type == "invite") {
      offchain = true
      group = true
    }

    sendOffer(peer1, contact, video, group, offchain)

    return peer1;
  }


  const answerCall = (msg, contact, key, offchain = false) => {
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
      $videoGrid.showVideoGrid = true

      let peer2 = await startPeer2(stream, video);
      //Check codecs
      let custom_codecs = [];
      let video_codecs = window.RTCRtpSender.getCapabilities("video");
      let audio_codecs = window.RTCRtpSender.getCapabilities("audio");
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
        $webRTC.cameraId = camera[0].deviceId
        transceivers[1].setCodecPreferences(custom_codecs);
      }

      console.log("codec set");
      //Set webRTC store update for call
      $webRTC.call[0].peer = peer2;
      $webRTC.myStream = stream;
      $webRTC.call[0].myStream = stream;
      $webRTC.active = true;
      $webRTC.call[0].video = video;

      $webRTC.myStream = stream;
      $webRTC.active = true;

      if (video) {
        $webRTC.myVideo = true;
      }

      let group = false

      if (offchain) {
        group = true
      }

      sendAnswer(msg, contact, peer2, key, video, offchain, group);

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
      checkVolume(peer2)
      if ($webRTC.call.length > 1) {
        $webRTC.group = true
      }
      
      //Data channel
      peer2._channel.addEventListener("message", (event) => {

        checkMessage(event)
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

  function checkMessage(event) {
    console.log('RTC Message event', event)
    let message = JSON.parse(event.data)
    let parsedMsg = message.substring(0, message.length - 99)
    let addr = message.substring(message.length - 99)

    console.log('Address?', addr)
    
    if (addr == $user.huginAddress.substring(0, 99)) {
      console.log('found tunneled message to me', message)
      window.api.decryptMessage(parsedMsg)
      return
    }

    if (message.substring(68,70) == "sb") {
      //Decrypt group message, groupCall is either key or false.
      let key =  $webRTC.groupCall
      console.log('Decrypting group with', key)
      window.api.decryptGroupMessage(message, key)
      return
    }

    if ($webRTC.groupCall && addr.substring(0,4)  == "SEKR") {
      console.log('Group tunnel message', event)
      let groupMessage = JSON.parse(event.data)
      let address = groupMessage.substring(groupMessage.length - 99)
      //If the address is one of our active calls, tunnel the message
      console.log('Found address', address)
      if ($webRTC.call.some(a => a.chat == address)) {
        let tunnel = true
        let sendTunnel = $webRTC.call.find(a => a.chat === address)
        console.log('Found message, sending to other peer')
        sendTunnel.peer.send(event.data)
        return
      }
    }

    if (addr.substring(0,4)  == "SEKR") {
      onsole.log('Address?', addr.substring(0,4))
      console.log('This message should be routed elsewere')
      return
    }
    //Decrypt message
    console.log('Private rtc message?', message)
    window.api.decryptMessage(message)
  }

  async function checkVolume(peer) {

    let interval
    let array = new Array(10)
    let contact = $webRTC.call.find(a => a.peer == peer)
    let audioCall = {
        chat: contact.chat, 
        activeVoice: false
    }
    $audioLevel.call.unshift(audioCall)

    let caller = $user.contacts.find(a => {return a.chat === contact.chat})
    $audioLevel.sensitivity = 0.001
    interval = setInterval(getAudioLevel, 300);
    function getAudioLevel() {
      if ($webRTC.call.some(a => a.chat == contact.chat)) {
        const rec = peer._pc.getReceivers().find(r => {return r.track.kind === "audio"})
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
              if (array.some(volume => volume > $audioLevel.sensitivity) && source.audioLevel > 0.001) {
                speaker.activeVoice = true
                speaker.volume = source.audioLevel
                console.log(`${caller.name} is Talking`)
              } else {
                speaker.activeVoice = false
              }
            } else {
              continue;
            }
          }
          $audioLevel.call = list
        }
        array.shift()
      } else {
        clearInterval(interval)
        let clearAudio = $audioLevel.call.filter(a => a.chat !== contact.chat)
        $audioLevel.call = clearAudio
        console.log('Audio field cleared', $audioLevel.call)
        return
      }
    } 
  }
  
  async function checkMyVolume(peer) {

  }

  //End call
  function endCall(peer, stream, contact) {

    let caller = $webRTC.call.find(a => a.chat === contact);
    console.log('Want to end call with', contact)

    if (contact === undefined) {
      console.log('contact', contact)
      caller = $webRTC.call.find(e => e.peer.channelName == peer.channelName);
    }

    if (contact && peer == undefined) {
      console.log('Call already ended')
      return
    }

    console.log('this peer?', peer)
    console.log(' ending this caller', caller)
    try {
      caller.peer.destroy();
      if ($webRTC.call.length === 1) {
        caller.myStream.getTracks().forEach(function(track) {
        track.stop();
      });
    }
    } catch (e) {
      console.log("error", e);
    }

    let filter;
    if (contact === undefined) {
      filter = $webRTC.call.filter(e => e.peer !== peer);
    } else {
      filter = $webRTC.call.filter(a => a.chat !== contact);
    }

    if (filter.length < 1) {
      $webRTC.groupCall = false
      $rtcgroupMessages = []
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

    $videoGrid.showVideoGrid = false
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
