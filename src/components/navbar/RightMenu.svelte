<script>
  import { fly } from "svelte/transition";
  import { page } from "$app/stores";
  import { user, boards, webRTC } from "$lib/stores/user.js";
  import callIcon from "/static/images/call.svg";
  import videoIcon from "/static/images/video.svg";
  import { get_avatar } from "$lib/utils/hugin-utils.js";
  import { createEventDispatcher } from "svelte";
  import { get_board_icon } from "$lib/utils/hugin-utils.js";
  import SimpleAdd from "/src/components/buttons/SimpleAdd.svelte";

  const dispatch = createEventDispatcher();
  let contact;
  let active_contact;
  let avatar;
  let calltype;
  let call_active = false;
  let startTone = new Audio("/static/audio/startcall.mp3");
  let endTone = new Audio("/static/audio/endcall.mp3");
  let thisCall = false;
  let video = false;
  $: {
    if ($user.activeChat) {
      active_contact = $user.activeChat;
      contact = $user.activeChat.chat + $user.activeChat.k;
      avatar = get_avatar(active_contact.chat);
    }
  }

  //Starts any call
  const startCall = async (contact, calltype) => {
    console.log(contact, calltype);
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
      brd: board
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

  const toggleCallMenu = () => {
    console.log("toggle callmenu dispatch");
    dispatch("toggleCallMenu");
  };

  const endCall = () => {
    //We delay the answerCall for routing purposes
    window.api.endCall("peer", "stream", active_contact.chat);
    //We pause the ringtone and destroy the popup
    endTone.play();

  };

  $: if ($webRTC.active) {
    thisCall = $webRTC.call.some(a => a.chat === active_contact.chat);
  } else {
    thisCall = false;
  }

  $: if (thisCall) {
    let active_vdeo = $webRTC.call.filter(a => a.chat === active_contact.chat);
    if (active_vdeo[0].video) {
      video = true;
    } else {
      video = false;
    }
  }


</script>

<div class="rightMenu" in:fly="{{x: 100}}" out:fly="{{x: 100}}">

  {#if $page.url.pathname === '/boards'}
    <div class="add" on:click={openAdd}>
      <SimpleAdd />
    </div>
    {#each $boards.boardsArray as board}
      {#await get_board_icon(board)}
      {:then board_color}
        <div class="board" style="background-color: rgb({board_color.red}, {board_color.green},{board_color.blue})">
          <button class="board-icon" on:click={() => printBoard(board)}>{board.substring(0, 1).toUpperCase()}</button>
        </div>
      {:catch error}
        <div>{error.message}</div>
      {/await}
    {/each}
  {/if}

  {#if $page.url.pathname === '/messages' && active_contact}
    <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
    {#if thisCall && !video}
      <button class="button" on:click={() => endCall()}><img class="icon" src="/static/images/call-slash.svg"
                                                             alt="endcall"></button>
    {:else}
      <button class="button" on:click={() => startCall(contact, false)}><img class="icon" src={callIcon} alt="call">
      </button>
    {/if}
    {#if thisCall && video}
      <button class="button" on:click={() => endCall()}><img class="icon" src="/static/images/video-slash.svg"
                                                             alt="video"></button>
    {:else}
      <button class="button" on:click={() => startCall(contact, true)}><img class="icon" src={videoIcon} alt="video">
      </button>
    {/if}
  {/if}

  {#if $page.url.pathname === '/webrtc'}
    <p>Mute</p>
    <p>Sound</p>
    <p>Mute</p>
    <p>Mute</p>

  {/if}
  <div class="draggable hitbox"></div>
</div>


<style lang="scss">

  .rightMenu {
    width: 85px;
    background-color: #181818;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    box-sizing: border-box;
    padding-bottom: 1.5em;
    padding-top: 1em;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    right: 0;
    z-index: 100;
    gap: 10px;
  }

  .hitbox {
    height: 100%;
    width: 85px;
  }

  .add {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 44px;
    width: 44px;
    border-radius: 100%;
    background-color: rgba(255, 255, 255, 0.22);
    transition: 250ms ease-in-out;
    cursor: pointer;

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
    height: 70px;
  }

  .board {
    border-radius: 11px;
    opacity: 0.88;
    margin-bottom: 5px;

    &:hover {
      opacity: 1;
    }
  }

</style>
