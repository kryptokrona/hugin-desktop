<script>
    import { get_avatar } from "$lib/utils/hugin-utils"
    import { fade } from "svelte/transition"
    import {swarm, user} from '$lib/stores/user.js'
    import {Moon} from "svelte-loading-spinners";
    //Inactive
    import { audioLevel } from '$lib/stores/user.js'
    //
    export let voice_user
    export let voice_channel

    let isTalking = false
    let isConnecting = false
    const myAddress = $user.huginAddress.substring(0,99)

    // $: if ($audioLevel.call.some((a) => a.activeVoice == true && a.chat === voice_user.address)) {
    //     isTalking = true
    // } else {
    //     isTalking = false
    // }

    
    //Check if we are also online in this channel
    $: in_voice = voice_channel.some(a => a.address === myAddress)
    //If so the user is connecting to our call if he is not yet connected in $swarm.call
    $: if ($swarm.call.some(a => a.chat === voice_user.address && !a.connected) && in_voice) {
        isConnecting = true
    } else {
        isConnecting = false
    }

    
</script>

<div class:talking={isTalking} in:fade class="card voice-user-card" on:click="{() => console.log("Click")}">
    <img
        class="voice-avatar"
        src="data:image/png;base64,{get_avatar(voice_user.address)}"
        alt=""
    />
    {#if isConnecting}
       <p class="connecting">Connecting</p> <div class="moon"><Moon color="#f2f2f2" size="15" unit="px"/></div>
    {:else}
        <p class="voice-nickname">{voice_user.name}</p>
    {/if}
    <br />
</div>

<style lang="scss">
    .card {
        display: flex;
        height: 80px;
        padding: 1rem;
        width: 100%;
        color: var(--title-color);
        border-bottom: 1px solid var(--border-color);
        background-color: var(--backgound-color);
        transition: 200ms ease-in-out;
        cursor: pointer;
        opacity: 0.9;

        &:hover {
            color: white;
            opacity: 1;
            background-color: var(--card-border);
            border-bottom: 1px solid transparent;
        }
    }

    p {
        margin: 5px 0 0 0;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        font-size: 14px;
        text-overflow: ellipsis;
        font-family: 'Montserrat', sans-serif;
    }
    
    .avatar {
        opacity: 0.92;
        cursor: pointer;
    }

    .voice-user-card {
        height: 55px;
        padding: 0.5rem;
    }

    .voice-nickname {
        margin: 10px;
    }

    .voice-avatar {
        width: 33px;
        height: 33px;
        margin-bottom: 5px;
        opacity: 0.92;
        cursor: pointer;
    }

    .talking {
        border: 1px solid var(--success-color);
    }

    .connecting {
        color: var(--success-color);
        font-size: 14px;
        padding: 3px;
        margin-right: 5px;
    }

    .moon {
        margin-top: 10px;
    }
    
    
</style>