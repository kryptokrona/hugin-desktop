<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { webRTC, user, swarm } from '$lib/stores/user.js'
import {layoutState, videoGrid} from '$lib/stores/layout-state.js'
import VoiceUserIcon from '../icons/VoiceUserIcon.svelte'
import { get_avatar } from '$lib/utils/hugin-utils'
import { videoSettings, video } from '$lib/stores/mediasettings'
import { Moon } from 'svelte-loading-spinners'

let myVideo = document.getElementById('myVideo')
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

$: if ($video.play) {
    playVideo()
}


let many = false

$: if ($swarm.call.length > 4) {
  many = true
} else many = false



$: window_medium
</script>

<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div class="card" class:many={many} in:fly={{ x: -150}} class:hide={$videoGrid.hideMyVideo}>
    <video
        class:reverse={$videoSettings.screenshare && !$videoSettings.loading}
        on:click="{playVideo}"
        muted
        in:fade
        id="myVideo"
        playsinline
        autoplay
        bind:this="{myVideo}"></video>
        <div class:in_call="{true}"></div>
        <div class="name">{$user.username}</div>
        {#if $videoSettings.loading}
        <div class="loader">
            <Moon color="#f5f5f5" size="77" unit="px"/>
        </div>
        {/if}
        {#if !$videoSettings.screenshare && !$videoSettings.myVideo}
            <img in:fly src="data:image/png;base64,{get_avatar($user.myAddress, 'png', true)}" alt="" />
        {/if}
</div>

<style lang="scss">
.card {
    position: relative;
    display: flex;
    background-color: #171717;
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
    left: 9px;
    top: 92.4%;
    border-radius: 5px;
    height: 10px;
    width: 10px;
    padding: 5px;
    line-height: 15px;
    font-family: "Montserrat";
    width: fit-content;
    background: var(--success-color);
    position: relative;
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
    color: white;
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
    left: 10px;
    top: 90%;
    border-radius: 5px;
    height: 25px;
    padding: 5px;
    line-height: 15px;
    font-family: "Montserrat";
    width: fit-content;
    position: relative;
    opacity: 0.8;
    color: white;
    z-index: 5;
}

.hide {
    display: none;
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
