<script>
    import {fly} from 'svelte/transition'
    import {page} from "$app/stores";
    import {user} from "$lib/stores/user.js";
    import callIcon from '/static/images/call.svg'
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    let active_contact
    let avatar
    $: {
        if($user.activeChat) {
            active_contact = $user.activeChat
            avatar = get_avatar(active_contact.from)
        }
    }

    //Starts any call
    const startCall = async (calltype) => {
        console.log(calltype, active_contact)
        window.api.startCall(active_contact, calltype)
    }

</script>

<div class="rightMenu" in:fly="{{x: 100}}" out:fly="{{x: 100}}">

    {#if $page.url.pathname === '/boards'}
        <div class="add" on:click></div>
        {#each $user.boardsArray as board}
            <button>{board}</button>
        {/each}
    {/if}

    {#if $page.url.pathname === '/messages' && active_contact}
        <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
        <button class='button' on:click={() => startCall('audio')}><img class="icon" src={callIcon} alt="msgs"></button>
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