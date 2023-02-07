<script>
import VideoIcon from '$lib/components/icons/VideoIcon.svelte'
import VideoSlash from '$lib/components/icons/VideoSlash.svelte'
import MicIcon from '$lib/components/icons/MicIcon.svelte'
import MuteIcon from '$lib/components/icons/MuteIcon.svelte'
import Screenshare from '$lib/components/icons/Screenshare.svelte'
import CallSlash from '$lib/components/icons/CallSlash.svelte'
import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
import { videoGrid } from '$lib/stores/layout-state.js'
import { webRTC, rtc_groups } from '$lib/stores/user.js'
import VideoSources from '$lib/components/chat/VideoSources.svelte'
import Contacts from '$lib/components/chat/Contacts.svelte'
import { onDestroy, onMount } from 'svelte'
import { calcTime } from '$lib/utils/utils.js'
import HideVideoGrid from '$lib/components/icons/HideVideoGrid.svelte'

let muted = false
let video = true
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

//Share screenpmn
const switchStream = async () => {
    if (!$webRTC.screenshare) {
        await window.api.shareScreen(false)
        $webRTC.screenshare = true
    }
}

//End call with all peers
const endCall = () => {
    hideGrid()
    $webRTC.call.forEach((a) => {
        window.api.endCall('peer', 'stream', a.chat)
    })
    
    //We pause the ringtone and destroy the popup
}

const toggleAudio = () => {
    muted = !muted
    $webRTC.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
    })
}

const toggleVideo = () => {
    if ($webRTC.screenshare) {
        let camera = $webRTC.cameraId
        window.api.changeSource(camera)
        $webRTC.screenshare = false
        return
    }
    video = !video
    $webRTC.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
}

const showMessages = () => {
    $rtc_groups.unread = []
    $rtc_groups.unread =  $rtc_groups.unread
    $videoGrid.showChat = !$videoGrid.showChat
    $videoGrid.multiView = true
}

const hideGrid = () => {
    $videoGrid.showVideoGrid = false
    $videoGrid.showChat = false
}
</script>

<div class="wrapper layered-shadow">
    <div>
        <div on:click>
            <p>{time}</p>
        </div>
    </div>
    <div class="controls">
        <div class="icon" on:click="{toggleVideo}">
            {#if !video}
                <VideoSlash />
            {:else}
                <VideoIcon grid="{true}" />
            {/if}
        </div>
        <div class="icon" on:click="{toggleAudio}">
            {#if !muted}
                <MicIcon />
            {:else}
                <MuteIcon />
            {/if}
        </div>
        <div class="icon" on:click="{switchStream}">
            <Screenshare />
        </div>
        <div class="icon" on:click="{endCall}">
            <CallSlash />
        </div>
        <div class="icon">
            {#if $webRTC.myStream}
                <VideoSources />
            {/if}
        </div>
        <div class="icon">
            <Contacts />
        </div>
        <!-- <div class="icon">
            <AudioSources />
        </div> -->
    </div>
    <div class="icon" on:click="{() => hideGrid()}">
        <HideVideoGrid />
    </div>
    <div>
        <div class="icon" on:click="{() => showMessages()}">
            <MessageIcon />
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
}

.controls {
    display: flex;
    gap: 1rem;
    align-items: center;

    .icon {
        cursor: pointer;
    }
}
</style>
