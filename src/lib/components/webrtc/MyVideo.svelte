<script>
  import { run } from 'svelte/legacy';

//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { onDestroy, onMount } from 'svelte'
import { webRTC, user, swarm, rooms } from '$lib/stores/user.js'
import {layoutState, videoGrid} from '$lib/stores/layout-state.js'
import VoiceUserIcon from '../icons/VoiceUserIcon.svelte'
import { get_avatar } from '$lib/utils/hugin-utils'
import { videoSettings, video } from '$lib/stores/mediasettings'
import { Moon } from 'svelte-loading-spinners'
import { audioLevel } from '$lib/stores/user.js'

let myVideo = $state(document.getElementById('myVideo'))
let window_medium = false

// When incoming call and this get mounted we play the ringtone
onMount(async () => {
    playVideo()
})

onDestroy(() => {})

const playVideo = () => {
    myVideo = document.getElementById('myVideo')
    if (myVideo === null) return
    if ($webRTC.call.length === 0) {
        //Avoid UI bugs
        if (!$swarm.myStream) return
        //Set video
        if ($videoSettings.myVideo) myVideo.srcObject = $swarm.myStream

    } else if ($webRTC.call.length) {
        //Avoid UI bugs
        if (!$webRTC.myStream) return
        if ($webRTC.myStream) myVideo.srcObject = $webRTC.myStream
    }

    console.log("Video played!")
   
    myVideo.play()
}

//As a precaution we pause the ringtone again when destroyed
onDestroy(() => {})

run(() => {
    if ($video.play) {
      playVideo()
  }
  });


let many = $state(false)

run(() => {
    if ($swarm.call.length > 4) {
    many = true
  } else many = false
  });

const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
}

run(() => {
    window_medium
  });
</script>

<!-- <video class:show={calling} in:fade|global id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div class="card" class:many={many} in:fly|global={{ x: -150}} class:hide={$videoGrid.hideMyVideo} class:talking="{$audioLevel.meTalking}">
    <video
        class:reverse={$videoSettings.screenshare && !$videoSettings.loading}
        onclick={playVideo}
        muted
        in:fade|global
        id="myVideo"
        playsinline
        autoplay
        bind:this="{myVideo}"></video>
        <div class="status">
            <div class:in_call="{true}"></div>
            <div class="name">{$user.username}</div>
        </div>
        {#if $videoSettings.loading}
        <div class="loader">
            <Moon color="#f5f5f5" size="77" unit="px"/>
        </div>
        {/if}
        {#if !$videoSettings.screenshare && !$videoSettings.myVideo}
        {#await check_avatar($user.myAddress)}
        {:then avatar}
        {#if avatar}
            <img
            
                class="custom-avatar"
                style=" object-fit: cover;"
                src="{avatar}"
                alt=""
            />
        {:else}
            
        <img in:fly|global src="data:image/png;base64,{get_avatar($user.myAddress, 'png', true)}" alt="" />
        {/if}
        {/await}
        {/if}
</div>

<style lang="scss">
.card {
    position: relative;
    display: flex;
    background-color:  var(--backgound-color);
    border-radius: 10px;
    box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--card-border);
    z-index: 500;
    width: 47.652%;
    height: 47.652%;
    pointer-events: all;
    transition: 0.35s;
    aspect-ratio: 16/9;
    pointer-events: none;
    -webkit-app-region: no-drag;

    video {
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
        z-index: 5;
        transform: scaleX(-1);
        transition: 100ms ease-in-out;
        
    }
}

.status {
    display: flex;
    top: 90%;
    margin-left: 10px;
    border-radius: 5px;
    height: 20px;
    width: 10px;
    padding: 5px;
    gap: 5px;
    line-height: 9px;
    font-family: "Montserrat";
    width: fit-content;
    position: relative;
    opacity: 0.9;
    border-radius: 50%;
    z-index: 5;
}

.talking {
    border: 1px solid var(--success-color);
}

.reverse {
    transform: scaleX(1) !important;
    transition: 100ms ease-in-out;
}

.many {
    height: 30.52% !important;
    width: 30.52% !important;
}

.caller {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
}

.in_call {
    padding: 5px;
    height: 10px;
    width: 10px;
    font-family: "Montserrat";
    width: fit-content;
    background: var(--success-color);
    opacity: 0.9;
    border-radius: 50%;
    z-index: 5;
}

img {
    width: 200px;
    height: 200px;
    position: absolute;
    left: calc(50% - 100px);
    top: calc(50% - 100px);
    z-index: 4;
}

.options {
    display: flex;
}

.answer {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 15px;
    transition: 250ms ease-in-out;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.decline {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 15px;
    transition: 250ms ease-in-out;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.hover:hover {
    background-color: rgba(255, 255, 255, 0.1);
    cursor: pointer;
}

h3,
p {
    margin: 0;
    color: rgba(255, 255, 255, 0.8);
    font-weight: normal;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.toggleVideo {
    width: 60px !important;
    transition: 0.3s;
}

.toggle_window {
    color: var(--text-color);
    width: 60px;
    height: 50px;
    font-size: 12px;
    font-family: 'Montserrat';
    background: royalblue;
    position: absolute;
    display: block;
    z-index: 3;
    bottom: -15px;
    border-radius: 10px;
}

.toggle {
    left: 5%;
    top: 250px;
    width: 50px;
    height: 50px;
}

.name {
    font-family: "Montserrat";
    position: relative;
    opacity: 0.8;
    color: var(--text-color);
    z-index: 5;
}

.hide {
    display: none;
    transition: 300ms ease-in-out;
}

.loader {
    z-index: 6;
    width: 100%;
    height: 100%;
    position: absolute;
    align-items: center;
    display: flex;
    justify-content: center;
    background-color: rgba(0,0,0,0.9);
    backdrop-filter: blur(8px);
    border-radius: 10px;
    transition: 50ms ease-in-out;
}
</style>
