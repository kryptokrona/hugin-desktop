<script>
  import MyVideo from "./MyVideo.svelte";
  import { webRTC, user } from "$lib/stores/user.js";
  import PeerVideo from "$components/webrtc/PeerVideo.svelte";
  import Dropzone from "svelte-file-dropzone";
  import ChatInput from "/src/components/chat/ChatInput.svelte";
  import { rtcgroupMessages } from "$lib/stores/rtcgroupmsgs.js";
  import GroupMessage from "/src/components/chat/GroupMessage.svelte";
  import ActiveBoard from "../chat/ActiveBoard.svelte";
  import { onMount, onDestroy } from "svelte";
  import { fade } from "svelte/transition";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";
  let drag = false
  let videoCalls = []

  const dragWindow = () => {
    console.log('dragwindow', drag)
    drag = true
  }

  const noDrag = () => {
    drag = false
  }
  const close = () => {
    $webRTC.showVideoGrid = false
  }

    let replyto = "";
    let reply_exit_icon = "x";
    let active;
    let replyColor;
    let nickname;
    let noMsgs = false;
    let filterRtcGroup = [];
    let filterEmojis = [];
    let fixedRtcGroups = [];
    let react = false;
    let unreadMsgs = [];
    let replyTrue = false;
    let chatWindow
    let groupKey = ""
    let join = false

    onMount(async () => {
      chatWindow = document.getElementById("chat_window");
      console.log("mounting video grid");
    });

    onDestroy(()=> {
    window.api.removeAllListeners("groupRtcMsg")
    })

    //Listens for new messages from backend
    window.api.receive("groupRtcMsg", data => {

        if (data.k === $user.huginAddress.substring(0, 99)) return
      //*TODO*//Keep logs to experiment with toast popups
      console.log("Group message", data.g);
      console.log("This group call", $webRTC.groupCall);
  
      if (data.g === $webRTC.groupCall) {
        //Push new message to store
        printGroupRtcMessage(data);
      } else {

        console.log('Another group', data)
      }
    });
  
    //Send message to store and DB
    function sendGroupRtCMsg(e) {
      console.log("wanna send this", e);
      let msg = e.detail.text;
      let myaddr = $user.huginAddress.substring(0, 99);
      let time = Date.now();
      let myName = $user.username;
      let group = $webRTC.groupCall;
      let offchain = true
      //Reaction switch
      if (e.detail.reply) {
        replyto = e.detail.reply;
      }

      //Construct a new json object (myBoardMessage) to be able to print our message instant.
      let myGroupRtCMessage = { message: msg, grp: group, reply: replyto, address: myaddr, time: time, name: myName, hash: time };
      let sendMsg = { m: msg, g: group, r: replyto, k: myaddr, t: time, n: myName, hash: time };
     
      console.log("wanna send this", sendMsg);
      printGroupRtcMessage(myGroupRtCMessage);
      if (!offchain) return
      window.api.sendGroupMessage(sendMsg, true);
      replyExit();
      scrollDown();
  };

  const scrollDown = () => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
  };
  
    //Prints any single board message. Takes boardmessage and updates to store.
    const printGroupRtcMessage = (groupMsg) => {
  
      if (groupMsg.reply.length === 64 && groupMsg.message.length < 9 && containsOnlyEmojis(groupMsg.message)) {
        updateReactions(groupMsg);
      } else if (groupMsg.message.length > 0 && !(groupMsg.reply.length === 64 && containsOnlyEmojis(groupMsg.message))) {
        console.log("pushin");
        fixedRtcGroups.push(groupMsg)
      }
      rtcgroupMessages.update(current => {
        return [...current, groupMsg];
      });
      fixedRtcGroups = fixedRtcGroups;
    };
  
    //Reactive, updates thisGroup.
  
    $ : console.log("this GroupCall chat", $webRTC.groupCall);
  
    //Exit reply mode
    const replyExit = () => {
      console.log("reply exit");
      replyto = false;
      rtc_groups.update(data => {
        return {
          ...data,
          replyTo: { reply: false }
        };
      });
    };
  
    //Enter reply mode
    async function replyToMessage(hash, nickname, emoji = false) {
      if (replyto != false) {
        await replyExit();
      }
      replyto = hash;
  
      groups.update(data => {
        return {
          ...data,
          replyTo: { to: hash, nick: nickname, reply: true, emoji: emoji }
        };
      });
  
    }
  
    //Default value should be false to hide the AddBoard form.
    let wantToAdd = false;
  
    //Svelte reactive. Sets noMsgs boolean for welcome message.
    $ : if ($rtcgroupMessages.length == 0) {
      noMsgs = true;
    } else {
      noMsgs = false;
    }
  
    //Checks messages for reactions in chosen board from printBoard() function
    async function checkReactions() {
      //All boardmessages all messages except reactions
      filterRtcGroup = await $rtcgroupMessages.filter(m => m.message.length > 0 && !(m.reply.length === 64 && containsOnlyEmojis(m.message)));
      //Only reactions
      filterEmojis = await $rtcgroupMessages.filter(e => e.reply.length === 64 && e.message.length < 9 && containsOnlyEmojis(e.message));
      console.log("filter emoji ", filterEmojis);
      if (filterEmojis.length) {
        //Adding emojis to the correct message.
        await addEmoji();
      } else {
        fixedGroups = filterRtcGroup;
      }
    }

    async function updateReactions(msg) {
  
      let reactionsFixed;
      reactionsFixed = fixedRtcGroups.map(function(r) {
        if (r.hash == msg.reply && !r.react) {
          r.react = [];
          r.react.push(msg);
        } else if (r.hash == msg.reply && r.react) {
          r.react.push(msg);
        }
        return r;
      });
      fixedRtcGroups = reactionsFixed;
    }
  
    async function addEmoji() {
      //Check for replies and message hash that match and then adds reactions to the messages.
      filterRtcGroup.forEach(async function(a) {
        await filterEmojis.forEach(function(b) {
          if (!a.react && b.reply == a.hash) {
            a.react = [];
            a.react.push(b);
            console.log();
          } else if (b.reply == a.hash) {
            a.react.push(b);
          }
        });
        fixedRtcGroups.push(a);
      });
      fixedRtcGroups = fixedRtcGroups;
    }
  
    //Checks for messages that only coinatins emojis.
    function containsOnlyEmojis(text) {
      const onlyEmojis = text.replace(new RegExp("[\u0000-\u1eeff]", "g"), "");
      const visibleChars = text.replace(new RegExp("[\n\r\s]+|( )+", "g"), "");
      console.log(onlyEmojis.length === visibleChars.length);
      return onlyEmojis.length === visibleChars.length;
    }

    const joinGroupChat = () => {
      console.log('joining')
      $webRTC.groupCall = groupKey
      groupKey = ""
      join = false
    }


    $: groupKey
  
    $: fixedRtcGroups;


    $: videoCalls = $webRTC.call.filter(a => a.peerVideo === true)

    $: console.log('video calls', videoCalls)

</script>




<div class:hide={!$webRTC.showVideoGrid} class="grid">

  <!-- {#if $webRTC.call.length > 1} -->
  <div class="right_side" in:fade="{{duration: 350}}" out:fade="{{duration: 100}}">
  <div class="outer" id="chat_window">
    <div class="fade"></div>
    <!-- <Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> test()} on:dragleave={()=> fest()}
          on:drop={dropFile}> -->
      <div class="inner">
      {#each fixedRtcGroups as message}
          <GroupMessage
          on:reactTo={(e) => sendGroupRtCMsg(e)}
          on:replyTo={(e)=> replyToMessage(message.hash, message.name)}
          message={message}
          reply={message.reply}
          msg={message.message}
          myMsg={message.sent}
          signature={message.signature}
          group={message.group}
          nickname={message.name}
          msgFrom={message.address}
          timestamp={message.time} hash={message.hash}/>
      {/each}
      </div>
      <!-- </Dropzone> -->
      </div>
    
      <ChatInput on:message={sendGroupRtCMsg} />
    </div>

  <div class="wrapper">
    <div class="videogrid">
    <p on:click={close}>Close</p>
    <p on:click={()=> join = !join}>Join chat</p>
    <div class="exit">

      <div class="join_group" class:hide={!join}><input placeholder="Input group key" type="text" bind:value={groupKey}>
        <GreenButton on:click={joinGroupChat} enabled={groupKey.length > 1} disabled={false} text="Join" />
      </div>
    </div>
    {#if  $webRTC.myVideo}
      <MyVideo 
          on:drag={dragWindow}
          on:nodrag={noDrag}/>
    {/if}

    {#if videoCalls.length}
      {#each videoCalls as peer (peer.chat)}
        <PeerVideo 
              on:drag={dragWindow}
              on:nodrag={noDrag}
              call={peer} />
        
      {/each}
    {/if}
    </div>
  </div>

</div>
<style lang="scss">
  .grid {
      box-sizing: border-box;
      position: absolute;
      display: flex;
      height: 100vh;
      width: 100%;
      z-index: 499;
      pointer-events: all;
      background: rgba(0,0,0,0.94);
  }

  .drag {
    pointer-events: visible;
  }

  p {
    font-family: "Montserrat";
    font-size: 17px;
    cursor: pointer;
    color: #c9c5c5;
    &:hover {
      color: white;
    }
  }

  .exit {
    align-content: center;
    display: flex;
    bottom: 10px;
    right: 25px;
  }

  .fade {
    position: absolute;
    top: 0;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, #121212, #12121200);
    z-index: 100;
  }

  .outer {
    display: flex;
    flex-direction: column-reverse;
    overflow: scroll;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .left_side {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .right_side {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    width: 50%;
  }

  .inner {
    display: flex;
    flex-direction: column;
    padding-top: 20px;
    width: 100%;
  }

  .wrapper {
    max-width: 100%;
    display: flex;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
  }

  .hide {
    display: none
  }

  .videogrid {
    width: 100%;
    display: flex;
  }


  input {
    box-sizing: border-box;
    background-color: transparent;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0 1rem;
    height: 35px;
    width: 100%;
    color: white;
    transition: 200ms ease-in-out;

    &:focus {
      outline: none;
      border: 1px solid rgba(255, 255, 255, 0.6);
    }
  }

  .join_group {
    position: absolute;
    display: flex;
  }


</style>
