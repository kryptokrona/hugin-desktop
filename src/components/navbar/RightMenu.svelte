<script>
    import {fly} from 'svelte/transition'
    import {page} from "$app/stores";
    import {user, boards, misc, webRTC} from "$lib/stores/user.js";
    import callIcon from '/static/images/call.svg'
    import videoIcon from '/static/images/video.svg'
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {boardMessages} from '$lib/stores/boardmsgs.js';
    import openAddBoard from '/src/routes/boards/index.svelte';
    import {createEventDispatcher} from "svelte";
    import settingsIcon from '/static/images/settings.png'
    import { get_board_icon } from '$lib/utils/hugin-utils.js';

    const dispatch = createEventDispatcher()
    let contact
    let active_contact
    let avatar
    let calltype
    let call_active = false

    $: {
        if($user.activeChat) {
            active_contact = $user.activeChat
            contact =  $user.activeChat.chat +  $user.activeChat.k
            avatar = get_avatar(active_contact.chat)
        }
    }

    //Starts any call
    const startCall = async (contact, calltype) => {
        console.log(contact, calltype)
        window.api.startCall(contact, calltype)
        dispatch('startCall')
        user.update(data => {
          return {
            ...data,
            call: {sender: contact, type: calltype, out: true},
            callerMenu: true,
          }
        })
    }
    //Print chosen board. SQL query to backend and then set result in Svelte store, then updates thisBoard.
    const printBoard = async (board) => {
        console.log('Printing Board', board)
        dispatch('printBoard', {
            brd: board,
        })
    }

    const openAdd = () => {

      boards.update(data => {
        return {
          ...data,
          addBoard: true,
        }
      })
    }

    $: if ($webRTC.myVideo || $webRTC.peer) {
      call_active = true
    } else {
      call_active = false
    }

    const toggleCallMenu = () => {
      console.log('toggle callmenu dispatch');
      dispatch('toggleCallMenu')
    }

</script>

<div class="rightMenu" in:fly="{{x: 100}}" out:fly="{{x: 100}}">

    {#if $page.url.pathname === '/boards'}
        <div class="add" on:click={openAdd}></div>
        {#each $boards.boardsArray as board}
          {#await  get_board_icon(board)}
            {:then board_color}
        <div class="board" style="background-color: rgb({board_color.red}, {board_color.green},{board_color.blue})">
            <button class="boardicon" on:click={() => printBoard(board)}>{board.substring(0,1).toUpperCase()}</button>
        </div>
            {:catch error}
            <div>{error.message}</div>
         {/await}
        {/each}
    {/if}

    {#if $page.url.pathname === '/messages' && active_contact}
        <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
        <button class='button' on:click={() => startCall(contact, false)}><img class="icon" src={callIcon} alt="call"></button>
        <button class='button' on:click={() => startCall(contact, true)}><img class="icon" src={videoIcon} alt="video"></button>
    {/if}

    {#if call_active}
      <button class='caller_menu' on:click={toggleCallMenu}><img class="icon" src={settingsIcon} alt="callMenu"></button>
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
        height: 100vh;
        width: 85px;
        background-color: #202020;
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
      height: 50px;
      width: 50px;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, 0.22);
      transition: 250ms ease-in-out;
      padding-bottom: 10px;
      margin-bottom: 10px;

    }

    .add:hover {
        background-color: rgba(255, 255, 255, 0.4);
    }

    .boardicon {
      border: none;
      background: none;
      color: #f2f2f2;
      font-size: 22px;
      opacity: 0.9;
      word-break: break-word;
      font-family: 'Montserrat';
      cursor: pointer;
      border-radius: 15px;
      width: 44px;
      height: 44px;
      opacity: 0.89
    } 

    .board_icon:hover {
      opacity: 1;
      color: white;
    }

    .caller_menu {
      margin-top: 25%;
      background: rgba(255, 255, 255, 0.4);
      color: black;
    }

    .boardicon:hover {
      opacity: 1
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
    }

    .icon {
        opacity: 80%;
        transition: 250ms ease-in-out;
    }

    .button:hover, .button:hover > .icon {
        background-color: #313131;
        opacity: 100%;
    }

    .avatar {
      height: 70px;
    }

    .board {
      border-radius: 11px;
      opacity: 0.88;
      margin-bottom: 5px;
    }

    .board:hover {
      opacity: 1;
    }

</style>
