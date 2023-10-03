<script>
//To handle true and false, or in this case show and hide.
import { fly } from 'svelte/transition'
import { cubicIn, cubicOut } from 'svelte/easing'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { webRTC } from '$lib/stores/user.js'
import ShowVideoMenu from '../icons/ShowVideoMenu.svelte'
import { videoGrid } from '$lib/stores/layout-state.js'
import { calcTime } from '$lib/utils/utils.js'
import CallSlash from '$lib/components/icons/CallSlash.svelte'
import MicIcon from '../icons/MicIcon.svelte'
import MuteIcon from '../icons/MuteIcon.svelte'

export let paused = false
let toggle = false

let startTime = Date.now()
let time = '0:00:00'
let timer

onMount(() => {
    timer = setInterval(() => {
        let currentTime = Date.now()
        let ms = currentTime - startTime
        time = calcTime(ms)
    }, 1000)
})

onDestroy(() => {
    clearInterval(timer)
})

//End call with all peers
const endCall = () => {
    $webRTC.call.forEach((a) => {
        window.api.endCall('peer', 'stream', a.chat)
    })
    //We pause the ringtone and destroy the popup
}

//As a precaution we pause the ringtone again when destroyed
onDestroy(() => {})

const toggleAudio = () => {
    toggle = !toggle
    $webRTC.audio = !$webRTC.audio
    $webRTC.myStream.getTAudioracks().forEach((track) => (track.enabled = !track.enabled))
}

const showGrid = () => {
    $videoGrid.showVideoGrid = true
}
</script>

<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div
    in:fly="{{ y: 100, duration: 200, easing: cubicOut }}"
    out:fly="{{ y: 100, duration: 200, easing: cubicIn }}"
    class="card"
>
    <audio bind:paused></audio>
    <div class="wrapper">
        <div class="caller">
            {#each $webRTC.call as call}
                <img class="avatar" src="data:image/png;base64,{get_avatar(call.chat)}" alt="" />
            {/each}
            <!-- <p>{this_call.name}</p> -->
        </div>

        <audio bind:paused></audio>
        <div class="controls">
            <div on:click>
                <p>{time}</p>
            </div>
            <div on:click="{endCall}">
                <CallSlash />
            </div>
            <div on:click="{toggleAudio}">
                {#if $webRTC.audio}
                    <MicIcon />
                {:else}
                    <MuteIcon />
                {/if}
            </div>
            <div on:click="{() => showGrid()}">
                <ShowVideoMenu />
            </div>
        </div>
    </div>
</div>

<style lang="scss">
.wrapper {
    margin-top: 1rem;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    padding: 0 1rem;
    height: 70px;
}

.card {
    display: flex;
    position: absolute;
    padding: 2px;
    bottom: 70px;
    right: 70px;
    max-width: 500px;
    border-radius: 5px;
    z-index: 500;

}

.inner-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    border-radius: 3px;
    background-color: #202020;
}

.caller {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
}

.controls {
    display: flex;
    gap: 1rem;
    align-items: center;

    .icon {
        cursor: pointer;
    }
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

.active {
    background: rgba(0, 0, 0, 0.5) !important;
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
</style>
