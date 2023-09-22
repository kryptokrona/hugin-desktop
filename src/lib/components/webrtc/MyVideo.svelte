<script>
//To handle true and false, or in this case show and hide.
import { fade } from 'svelte/transition'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { webRTC, user, swarm } from '$lib/stores/user.js'
import {layoutState, videoGrid} from '$lib/stores/layout-state.js'

let myVideo = document.getElementById('myVideo')
let video = false
let hover = false
let chatWindow = true
let window_max = false
let window_medium = false

export let call
const dispatch = createEventDispatcher()

// When incoming call and this get mounted we play the ringtone
onMount(async () => {
    playVideo()
})

onDestroy(() => {})

//Hover functions
function enter() {
    console.log('enter')
    hover = true
}

function leave() {
    hover = false
}

//When a user clicks answer
const pauseVideo = () => {
    console.log('pausevideo')
    myVideo.pause()
}

const playVideo = () => {
    myVideo = document.getElementById('myVideo')
    console.log("Myvide", myVideo)
    if (myVideo === null) return
    console.log("Playvideo")
    console.log("$swarm.myVideo", $swarm.myVideo)
    console.log("$webRTC.myVideo", $webRTC.myVideo)
    if (!$swarm.myVideo && !$webRTC.myVideo) return
    if ($webRTC.call.length) myVideo.srcObject = $webRTC.myStream
    if (!$swarm.myStream) return
    if ($swarm.myVideo) myVideo.srcObject = $swarm.myStream
    console.log('play video')
    myVideo.play()
}

//As a precaution we pause the ringtone again when destroyed
onDestroy(() => {})

$: if ($swarm.screen_stream) {
    playVideo()
} else if ($swarm.myVideo) {
    playVideo()
}

let source = true

const switchStream = async () => {
    if (!$webRTC.screen_stream) {
        await window.api.shareScreen(false)
    } else {
        window.api.setCamera()
    }
}

const resize = (size) => {
    switch (size) {
        case 'min':
            window_medium = false
            break
        case 'medium':
            window_medium = true
    }
}

$: window_medium
</script>

<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div in:fade out:fade class="card" class:hide={$videoGrid.hideMyVideo}>
    <video
        on:click="{playVideo}"
        muted
        in:fade
        id="myVideo"
        playsinline
        autoplay
        bind:this="{myVideo}"></video>
        <div class="name">{$user.username}</div>
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
    background: white;
    position: relative;
    opacity: 0.6;
    color: black;
}

.hide {
    display: none;
}
</style>
