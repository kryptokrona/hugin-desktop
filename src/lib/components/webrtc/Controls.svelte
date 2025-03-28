<script>
    import { createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
import VideoIcon from '$lib/components/icons/VideoIcon.svelte'
import VideoSlash from '$lib/components/icons/VideoSlash.svelte'
import MicIcon from '$lib/components/icons/MicIcon.svelte'
import MuteIcon from '$lib/components/icons/MuteIcon.svelte'
import CallSlash from '$lib/components/icons/CallSlash.svelte'
import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
import { videoGrid } from '$lib/stores/layout-state.js'
import { webRTC, rtc_groups } from '$lib/stores/user.js'
import VideoSources from '$lib/components/webrtc/VideoSources.svelte'
import Contacts from '$lib/components/chat/Contacts.svelte'
import { onDestroy, onMount } from 'svelte'
import { calcTime } from '$lib/utils/utils.js'
import HideVideoGrid from '$lib/components/icons/HideVideoGrid.svelte'
import { mediaSettings, videoSettings } from '$lib/stores/mediasettings'
import AudioSources from '$lib/components/webrtc/AudioSources.svelte'
import ScreenSources from '$lib/components/webrtc/ScreenSources.svelte'

let muted = false
let video = $state(true)
let startTime = Date.now()
let time = $state('0:00:00')
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
    await window.api.shareScreen(false)
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
    $webRTC.audio = !$webRTC.audio
    $webRTC.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
    })
}
const add_video = async (add) => {
        if ($mediaSettings.cameraId === "none") return
        window.api.changeSource($webRTC.cameraId, false, add)
        $videoSettings.screenshare = false
    }


const toggleVideo = () => {
    $videoSettings.loading = true
    if ($videoSettings.screenshare) {
        let camera = $mediaSettings.cameraId
        window.api.changeSource(camera)
        $videoSettings.screenshare = false
        return
    }

    if (!$videoSettings.myVideo) {
        add_video(true)
        return
    }
    
    video = !video
    $webRTC.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
    $videoSettings.loading = false
}

const showMessages = () => {
    $rtc_groups.unread = []
    $rtc_groups.unread =  $rtc_groups.unread
    $videoGrid.showChat = !$videoGrid.showChat
    $videoGrid.multiView = true
}

const hideGrid = () => {
    $videoGrid.showVideoGrid = false
}
</script>

<div class="wrapper layered-shadow">
    <div>
        <div onclick={bubble('click')}>
            <p>{time}</p>
        </div>
    </div>
    <div class="controls">
        <div class="icon" onclick={toggleVideo}>
            {#if !video}
                <VideoSlash />
            {:else}
                <VideoIcon grid="{true}" />
            {/if}
        </div>
        <div class="icon" onclick={toggleAudio}>
            {#if $webRTC.audio}
                <MicIcon />
            {:else}
                <MuteIcon />
            {/if}
        </div>
        <div class="icon" onclick={switchStream}>
            <ScreenSources />
        </div>
        <div class="icon" onclick={endCall}>
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
        <div class="icon">
            <AudioSources conference={false}/>
        </div>
    </div>
    <div class="icon" onclick={() => hideGrid()}>
        <HideVideoGrid />
    </div>
    <div>
        <div class="icon" onclick={() => showMessages()}>
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
