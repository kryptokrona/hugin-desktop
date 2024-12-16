<script>
    import { get_avatar, getColorFromHash } from "$lib/utils/hugin-utils"
    import { fade } from "svelte/transition"
    import {swarm, user} from '$lib/stores/user.js'
    import {Moon} from "svelte-loading-spinners";
    //Inactive
    import { audioLevel } from '$lib/stores/user.js'
    import { videoSettings } from "$lib/stores/mediasettings"
    import MuteIcon from "../icons/MuteIcon.svelte"
    import Screenshare from "../icons/Screenshare.svelte"
    //
    export let voice_user
    export let voice_channel
    let isTalking = false
    let isConnecting = false
    let me = voice_user.address === $user.myAddress

    $: if ($audioLevel.call.some((a) => a.activeVoice == true && a.chat === voice_user.address)) {
        isTalking = true
    } else {
        isTalking = false
    }
  
    
    //Check if we are also online in this channel
    $: in_voice = voice_channel.some(a => a.address === $user.myAddress)
    //If so the user is connecting to our call if he is not yet connected in $swarm.call

</script>

<div class:talking={isTalking || (me && $audioLevel.meTalking)} in:fade class="card hugin-voice-user" on:click="{() => console.log("Click")}">
    <img
        class="voice-avatar"
        src="data:image/png;base64,{get_avatar(voice_user.address)}"
        alt=""
    />
        <p class="nickname" style="color: {getColorFromHash(voice_user.address)}">{voice_user.name}</p>
    <br />
    <div class="voicestatus">
    {#if voice_user.audioMute || (me && !$swarm.audio)}
        <MuteIcon size={"14px"}/>
    {/if}
    {#if voice_user.screenshare || (me && $videoSettings.screenshare)}
        <Screenshare voice={true} size={"14px"}/>
    {/if} 
    </div>
</div>

<style lang="scss">
 .card {
    display: flex;
    align-items: center;
    padding: 0 0 0 1.5rem;
    width: 100%;
    color: white;
    border-bottom: 1px solid var(--border-color);
    transition: 177ms ease-in-out;
    cursor: pointer;
    border: 1px solid transparent;

    &:hover {
        opacity: 0.8;
    }
}

    p {
        margin: 0;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        font-size: 12px;
        margin-top: 5px;
        text-overflow: ellipsis;
    }
    
    .avatar {
        height: 30px;
    }

    .nickname {
        margin: 0;
        word-break: break-word;
        display: contents;
        font-family: 'Montserrat' !important;
        font-size: 12px;
        line-height: 33px;
        margin-right: 3px;
    }

    .voice-avatar {
        width: 24px;
        height: 24px;
        opacity: 0.92;
        cursor: pointer;
        border-radius: 5px;
        border: 1px solid transparent;
        margin-right: 2px;
    }

    .talking .voice-avatar {
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

    .voicestatus {
        display: flex;
        gap: 3px;
        margin-left: 5px;
    }
    
    
</style>