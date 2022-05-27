<script>
    import {fly} from 'svelte/transition'
    import {page} from "$app/stores";
    import {user} from "$lib/stores/user.js";
    import callIcon from '/static/images/call.svg'
    import videoIcon from '/static/images/video.svg'
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {boardMessages} from '$lib/stores/boardmsgs.js';
    let contact
    let active_contact
    let avatar
    let calltype

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
    }

    const printBoard = async (board) => {
        console.log('Printing Board', board)
        boardMessages.set(await window.api.printBoard(board))
        user.update(data => {
          return {
            ...data,
            thisBoard: board,
          }
        })
    }

</script>

<div class="rightMenu" in:fly="{{x: 100}}" out:fly="{{x: 100}}">

    {#if $page.url.pathname === '/boards'}
        <div class="add" on:click></div>
        {#each $user.boardsArray as board}
            <button class="boardicon" on:click={() => printBoard(board)}>{board}</button>
        {/each}
    {/if}

    {#if $page.url.pathname === '/messages' && active_contact}
        <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
        <button class='button' on:click={() => startCall(contact, false)}><img class="icon" src={callIcon} alt="call"></button>
        <button class='button' on:click={() => startCall(contact, true)}><img class="icon" src={videoIcon} alt="video"></button>
    {/if}

    {#if $page.url.pathname === '/webrtc'}
        <p>Mute</p>
        <p>Sound</p>
        <p>Mute</p>
        <p>Mute</p>

    {/if}
    <div class="draggable hitbox"></div>
</div>


<style>

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
    }

    .add:hover {

        background-color: rgba(255, 255, 255, 0.4);
    }

    .boardicon {

    font-family: 'Roboto Mono';
    border: none;
    background: none;
    color: white;
    font-size: 12px;
    opacity: 0.9
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

</style>
