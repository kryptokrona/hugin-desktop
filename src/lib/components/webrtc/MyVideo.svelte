<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { webRTC, user, swarm } from '$lib/stores/user.js'
import {layoutState, videoGrid} from '$lib/stores/layout-state.js'
import VoiceUserIcon from '../icons/VoiceUserIcon.svelte'

let myVideo = document.getElementById('myVideo')
let hover = false
let window_medium = false

// When incoming call and this get mounted we play the ringtone
onMount(async () => {
    playVideo()
})

onDestroy(() => {})

const playVideo = () => {
    myVideo = document.getElementById('myVideo')
    if (myVideo === null) return
    if (!$swarm.myVideo && !$webRTC.myVideo) return
    if ($webRTC.call.length) myVideo.srcObject = $webRTC.myStream
    if (!$swarm.myStream) return
    if ($swarm.myVideo) myVideo.srcObject = $swarm.myStream
    if (!$swarm.showVideGrid) return
    myVideo.play()
}

//As a precaution we pause the ringtone again when destroyed
onDestroy(() => {})

$: if ($swarm.screen_stream || $webRTC.screen_stream) {
    playVideo()
} else if ($swarm.video || $webRTC.myVideo) {
    playVideo()
}


$: window_medium
</script>

<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div class="card" in:fly={{ x: -150}} class:hide={$videoGrid.hideMyVideo}>
    <video
        on:click="{playVideo}"
        muted
        in:fade
        id="myVideo"
        playsinline
        autoplay
        bind:this="{myVideo}"></video>
        <div class:in_call="{true}"></div>
        <div class="name">{$user.username}</div>
        <VoiceUserIcon/>
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
    }
}

.caller {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
}


.in_call {
    left: 9px;
    top: 92%;
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
}

.hide {
    display: none;
}
</style>
