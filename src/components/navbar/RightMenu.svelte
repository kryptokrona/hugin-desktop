<script>
  import { fade } from "svelte/transition";
  import { page } from "$app/stores";
  import { user, boards, webRTC, transactions, groups, notify } from "$lib/stores/user.js";
 
  import { get_avatar } from "$lib/utils/hugin-utils.js";
  import { createEventDispatcher } from "svelte";
  import { get_board_icon } from "$lib/utils/hugin-utils.js";
  import SimpleAdd from "/src/components/buttons/SimpleAdd.svelte";
  import PayIcon from "/src/components/buttons/PayIcon.svelte";
  import MicIcon from "/src/components/buttons/MicIcon.svelte";
  import MuteIcon from "/src/components/buttons/MuteIcon.svelte";
  import HomeIcon from "/src/components/buttons/HomeIcon.svelte";
  import Lock from "../buttons/Lock.svelte";
  
  import CallIcon from "/src/components/buttons/CallIcon.svelte";
  import CallSlash from "/src/components/buttons/CallSlash.svelte";
  import VideoIcon from "/src/components/buttons/VideoIcon.svelte";
  import VideoSlash from "/src/components/buttons/VideoSlash.svelte";
  import { layoutState, videoGrid } from "$lib/stores/layout-state.js";
  import ListButton from "$components/buttons/ListButton.svelte";

  const dispatch = createEventDispatcher();
  let contact;
  let active_contact;
  let avatar;
  let calltype;
  let call_active = false;
  let startTone = new Audio("/audio/startcall.mp3");
  let endTone = new Audio("/audio/endcall.mp3");
  let thisCall = false;
  let video = false;

  $: {
    if ($user.activeChat) {
      active_contact = $user.activeChat;
      contact = $user.activeChat.chat + $user.activeChat.key;
      avatar = get_avatar(active_contact.chat);
    }
  }

  $: console.log('active chat', $user.activeChat)

  //Starts any call
  const startCall = async (contact, calltype) => {

    console.log(contact, calltype);
    if ($webRTC.call.length >= 1) {
      $webRTC.initiator = true
    }

    $webRTC.invited = false

    if (calltype) {
      video = true;
    }
    startTone.play();
    let call = {
      msg: "outgoing",
      out: true,
      chat: contact.substring(0, 99),
      video: calltype
    };


    $webRTC.call.unshift(call);
    window.api.startCall(contact, calltype);
    dispatch("startCall");

    console.log("call active", $webRTC.call);
  };
  //Print chosen board. SQL query to backend and then set result in Svelte store, then updates thisBoard.
  const printBoard = async (board) => {
    console.log("Printing Board", board);
    dispatch("printBoard", {
      board: board
    });
  };

  const openAdd = () => {

    boards.update(data => {
      return {
        ...data,
        addBoard: true
      };
    });
  };

  $: if ($webRTC.myVideo || $webRTC.peer) {
    call_active = true;
  } else {
    call_active = false;
  }

  const endCall = () => {
    //We delay the answerCall for routing purposes
    window.api.endCall("peer", "stream", active_contact.chat);
    //We pause the ringtone and destroy the popup
    endTone.play();

  };

  $: if ($webRTC.call.length) {
    thisCall = $webRTC.call.some(a => a.chat === active_contact.chat);
  } else {
    thisCall = false;
  }

  $: if (thisCall) {
    let active_video = $webRTC.call.find(a => a.chat === active_contact.chat);
    if (active_video.video) {
      video = true;
    } else {
      video = false;
    }
  }

  const sendMoney = () => {
    $transactions.tip = true;
    $transactions.send = { to: $user.activeChat.chat, name: $user.activeChat.name };
  };

  let muted = false;

  const toggleAudio = () => {
    muted = !muted;
    $webRTC.myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
    $webRTC.myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
  };

  function copyThis(copy) {

    let msg = "You copied a key"
    let name = "Copy"
    let key = copy
    console.log('copy?', copy)
    if (copy.length > 64) {
      //Notification 
      msg = "You copied a Hugin address"
      name =  $user.activeChat.name
      //Avatar in notification
      key = $user.activeChat.chat
    }

    $notify.success.push({
      message: msg,
      name: name,
      hash: Date.now(),
      key: key,
    })
    $notify.success = $notify.success
    navigator.clipboard.writeText(copy);
  }

</script>

<div class="rightMenu" class:hide={$videoGrid.showVideoGrid && $webRTC.call.length}>

  {#if $page.url.pathname === '/boards'}
    <div class="nav" style="display:block !important;">
      <div class="add" on:click={openAdd}>
        <SimpleAdd />
      </div>
      <div class="boards">
        {#each $boards.boardsArray as board}
          {#await get_board_icon(board)}
          {:then board_color}
            <div style="display: flex; align-items: center; position: relative;">
              <div class="board" style="background-color: rgb({board_color.red}, {board_color.green},{board_color.blue})">
                {#if board === "Home"}
                  <button class="board-icon"
                          on:click={() => printBoard(board)}><HomeIcon/></button>
                {:else}
                  <button class="board-icon"
                          on:click={() => printBoard(board)}>{board.substring(0, 1).toUpperCase()}</button>
                {/if}
              </div>
              {#if board === $boards.thisBoard}
                <div class="dot" in:fade></div>
              {/if}
            </div>
          {:catch error}
            <div>{error.message}</div>
          {/await}
        {/each}
      </div>
    </div>
  {/if}

  {#if $page.url.pathname === '/messages'}
    <div class="nav">
      <img class="avatar" src="data:image/png;base64,{avatar}" alt="" on:click={() => copyThis($user.activeChat.chat + $user.activeChat.key)}>
      
      <button class="button">
      {#if thisCall && !video}
          <CallSlash on:click={() => endCall()}/>
      {:else}
          <CallIcon on:click={() => startCall(contact, false)}/>
      
      {/if}
      </button>
      <button class="button">
      {#if thisCall && video}
        <VideoSlash  on:click={() => endCall()}/>
      {:else}
        <VideoIcon menu={true} on:click={() => startCall(contact, true)}/>
      {/if}
      </button>
      {#if thisCall}
        <div class="button" on:click={toggleAudio}>
          {#if !muted}
            <MicIcon  />
          {:else}
            <MuteIcon />
          {/if}
        </div>
      {/if}
    </div>
  {/if}

  {#if $page.url.pathname === '/groups'}
  <div class="nav">
    <img class="avatar" src="data:image/png;base64,{get_avatar($groups.thisGroup.key)}" alt="">
    <button class="button">
      <Lock on:copy={() => copyThis($groups.thisGroup.key)}/>
    </button>
    <button class="button">
      <ListButton on:click={() => $layoutState.showActiveList = !$layoutState.showActiveList}/>
    </button>
  </div>
  {/if}
  <div class="draggable hitbox"></div>
  {#if $page.url.pathname === '/messages'}
    <div on:click={()=> sendMoney(contact)} class="button">
      <PayIcon />
    </div>
  {/if}
</div>


<style lang="scss">

  .rightMenu {
    width: 85px;
    height: 100%;
    border-left: 1px solid var(--border-color);
    padding-bottom: 1.5em;
    padding-top: 1em;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    right: 0;
    z-index: 100;
    overflow: hidden;
  }

  .rightMenu::-webkit-scrollbar {
    display: none;
  }

  .hitbox {
    height: 100%;
    width: 85px;
  }

  .nav {
    height: 100%;
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 0.5rem;
  }

  .boards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: calc(100% - 35px);
    overflow-y: scroll;
    padding-bottom: 1rem;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .add {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 38px;
    width: 38px;
    border-radius: 100%;
    background-color: rgba(255, 255, 255, 0.22);
    transition: 250ms ease-in-out;
    cursor: pointer;
    margin-bottom: 15px;
    margin-top: 5px;
    margin-left: 3px;

    &:hover {
      background-color: rgba(255, 255, 255, 0.4);
    }
  }

  .board-icon {
    border: none;
    background: none;
    color: #f2f2f2;
    font-size: 22px;
    font-family: 'Montserrat', sans-serif;
    cursor: pointer;
    border-radius: 15px;
    width: 44px;
    height: 44px;

    &:hover {
      opacity: 1;
      color: white;
    }
  }

  .caller_menu {
    margin-top: 25%;
    background: rgba(255, 255, 255, 0.4);
    color: black;
  }

  .button {
    width: 40px;
    height: 40px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px;
    border-radius: 5px;
    transition: 250ms ease-in-out;
    background-color: transparent;
    cursor: pointer;
    border: none;

    &:hover, :hover > .icon {
      background-color: rgba(255, 255, 255, 0.4);
      background-color: #313131;
      opacity: 100%;
    }
  }

  .icon {
    opacity: 80%;
    transition: 250ms ease-in-out;
  }

  .avatar {
    margin-top: 0px;
    height: 55px;
    margin-bottom: 5px;
    cursor: pointer;
  }

  .board {
    position: relative;
    border-radius: 11px;
    opacity: 0.88;

    &:hover {
      opacity: 1;
    }
  }

  .dot {
    position: absolute;
    background-color: white;
    border-radius: 2px;
    height: 16px;
    width: 10px;
    right: -7px;
    box-shadow: 0 0 10px white
  }

  .hide {
    display: none !important;
  }


</style>
