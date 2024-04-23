<script>
import MyVideo from './MyVideo.svelte'
import { webRTC } from '$lib/stores/user.js'
import PeerVideo from '$lib/components/webrtc/PeerVideo.svelte'
import { videoGrid } from '$lib/stores/layout-state.js'
import { fade } from 'svelte/transition'
import RtcGroupMessages from '$lib/components/webrtc/RtcGroupMessages.svelte'
import Controls from '$lib/components/webrtc/Controls.svelte'
import { Moon } from 'svelte-loading-spinners'
import {onMount} from 'svelte'

let drag = false
let videoCalls = []
let join = false
let groupKey = ''

onMount(async () => {
    $videoGrid.showChat = true
})

const dragWindow = () => {
    console.log('dragwindow', drag)
    drag = true
}

const noDrag = () => {
    drag = false
}
const close = () => {
    $webRTC.showVideoGrid = false
}

const joinGroupChat = () => {
    console.log('joining')
    $webRTC.groupCall = groupKey
    groupKey = ''
    join = false
}

let isConnecting = false

//If the user is connecting to our call
$: if ($webRTC.call.some(a => !a.connected)) {
    isConnecting = true
} else {
    isConnecting = false
}


$: groupKey

$: videoCalls = $webRTC.call.filter((a) => a.connected === true)

</script>

<div in:fade out:fade class:show="{$videoGrid.showVideoGrid}" class="layout">

    <div class="video-wrapper">
        <div class="video-grid">
            {#if $webRTC.call.length}
                <MyVideo />
            {/if}

            {#if videoCalls.length}
                {#each videoCalls as peer (peer.chat)}
                    <PeerVideo call="{peer}" />
                {/each}
            {/if}
            {#if isConnecting}
            <div class="loader">
                <Moon color="#f5f5f5" size="60" unit="px"/>
            </div>
            {/if}
        </div>
        <Controls />
    </div>

    <RtcGroupMessages />
</div>

<style lang="scss">
.layout {
    display: flex;
    position: absolute;
    opacity: 0;
    gap: 1rem;
    padding: 1.5rem;
    background-color: var(--backgound-color);
    height: 100%;
    width: 100%;
    z-index: 9999;
    transition: all 500ms ease-in-out;
    border-radius: 15px;
    overflow: hidden;
    pointer-events: none;
}

.video-wrapper {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    width: 100%;
}

.video-grid {
    width: 100%;
    height: calc(100% - 73px);
    max-width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    vertical-align: middle;
    justify-content: center;
    align-items: center;
    align-content: center;
}

.fade {
    position: absolute;
    top: 0;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, #121212, #12121200);
    z-index: 100;
}

.outer {
    display: flex;
    flex-direction: column-reverse;
    overflow: scroll;

    &::-webkit-scrollbar {
        display: none;
    }
}

.show {
    @keyframes fadeLayout {
        from {
            opacity: 0;
            visibility: hidden;
        }
        to {
            opacity: 100%;
            visibility: visible;
        }
    }
    
    pointer-events: all !important;
    animation: fadeLayout ease-out 300ms;
    animation-fill-mode: forwards;
}

input {
    box-sizing: border-box;
    background-color: transparent;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0 1rem;
    height: 35px;
    width: 100%;
    color: white;

    &:focus {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.6);
    }
}

.join_group {
    position: absolute;
    display: flex;
}
</style>
