<script>
    import { run } from 'svelte/legacy';

    import VideoIcon from '$lib/components/icons/VideoIcon.svelte'
    import VideoSlash from '$lib/components/icons/VideoSlash.svelte'
    import MicIcon from '$lib/components/icons/MicIcon.svelte'
    import MuteIcon from '$lib/components/icons/MuteIcon.svelte'
    import CallSlash from '$lib/components/icons/CallSlash.svelte'
    import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
    import { videoGrid } from '$lib/stores/layout-state.js'
    import { swarm, user, groups, rtc_groups, rooms, pushToTalk } from '$lib/stores/user.js'
    import VideoSources from '$lib/components/webrtc/VideoSources.svelte'
    import { onDestroy, onMount } from 'svelte'
    import { calcTime, sleep } from '$lib/utils/utils.js'
    import HideVideoGrid from '$lib/components/icons/HideVideoGrid.svelte'
    import AudioSources from '$lib/components/webrtc/AudioSources.svelte'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import { videoSettings, mediaSettings, video } from '$lib/stores/mediasettings'
    import ScreenSources from '$lib/components/webrtc/ScreenSources.svelte'
    
    let startTime = Date.now()
    let time = $state('0:00:00')
    let timer

    let startTone = new Audio('/audio/startcall.mp3')
    let channels = $state([])
    let voice_channel = $state([])
    let loading = $state(false)
    let topic = $state("")
    const my_address = $user.myAddress

    let thisSwarm = $derived($swarm.voice)
    let in_voice = $derived(voice_channel.has(my_address))

    run(() => {
        if (thisSwarm) channels = thisSwarm.channels
    });
    run(() => {
        if (thisSwarm) topic = thisSwarm.topic
    });
    run(() => {
        if (thisSwarm) voice_channel = thisSwarm.voice_channel
    });

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

    function disconnect_from_active_voice() {
        window.api.exitVoiceChannel()
    }

    //Share screen
    const switchStream = async () => {
        await window.api.shareScreen(false, true)
    }
    
    const toggleAudio = () => {
        $swarm.audio = !$swarm.audio
        window.api.updateVoiceChannelStatus({key: thisSwarm.key, videoMute: !$videoSettings.myVideo, screenshare: $videoSettings.screenshare, audioMute: !$swarm.audio, video: $videoSettings.myVideo})
        if (!$swarm.myStream) return
        if ($pushToTalk.on) return
        $swarm.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = $swarm.audio))
        })
    }

    const add_video = async (add) => {
        if ($mediaSettings.cameraId === "none") return
        window.api.changeSource($mediaSettings.cameraId, true, add)
        $videoSettings.screenshare = false
    }

    const activate_video = () =>{
        if ($mediaSettings.cameraId === "none") return
        $videoSettings.screenshare = false
        window.api.send('active-video')
    }
    
    const toggleVideo = () => {
        $videoSettings.loading = true
        //Add video to call or activate local video
        if (!$videoSettings.screenshare && !$videoSettings.myVideo && !$videoSettings.active) {
            if ($swarm.call.length > 0) add_video(true)
            if ($swarm.call.length === 0) activate_video()
            $videoSettings.myVideo = !$videoSettings.myVideo
            return
        }

        if ($videoSettings.screenshare) {
            let camera = $mediaSettings.cameraId
            window.api.changeSource(camera, true)
            $videoSettings.screenshare = false
            return
        }
        
        muteVideo()
    }

    const muteVideo = () => {
        
        $videoSettings.myVideo = !$videoSettings.myVideo
        if (!$swarm.myStream) return

        if ($swarm.call.length === 0) {
            $swarm.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
        }

        $swarm.call.forEach((a) => {
            a.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
        })
        window.api.updateVoiceChannelStatus({key: thisSwarm.key, videoMute: true, screenshare: false, audioMute: !$swarm.audio, video: true})
        $videoSettings.loading = false
    }
    
    const showMessages = () => {
        $rtc_groups.unread = []
        $rtc_groups.unread =  $rtc_groups.unread
        $videoGrid.showChat = !$videoGrid.showChat
        $videoGrid.multiView = true
    }
    
    const hideGrid = () => {
        $swarm.showVideoGrid = false
    }
    </script>
    
    <div class:drag={$swarm.showVideoGrid} class="wrapper layered-shadow">
        <div>
        <div class="connectButton">
            {#if !in_voice}
            {:else}
            <p>{time}</p>
            {/if}
        </div>
        </div>
        <div class="controls">
            {#if in_voice}
            <div class="icon" onclick={toggleVideo}>
                <VideoIcon grid="{true}" />
            </div>
            <div class="icon" onclick={toggleAudio}>
                {#if $swarm.audio}
                    <MicIcon />
                {:else}
                    <MuteIcon />
                {/if}
            </div>
            <div class="icon" onclick={switchStream}>
                <ScreenSources group={true}/>
            </div>
            <div class="icon" onclick={() => disconnect_from_active_voice(false)}>
                <CallSlash />
            </div>
            <div class="icon">
                <AudioSources conference={true}/>
            </div>
            <div class="icon">
                <VideoSources conference={true} />
            </div>
            <!-- <div class="icon">
                <Contacts />
            </div> -->
            <!-- <div class="icon">
                <AudioSources />
            </div> -->
        
        {/if}
        </div>
        <div class="icon" style="padding: 5px;" onclick={() => hideGrid()}>
            <HideVideoGrid />
        </div>
        <div>
            <!-- <div class="icon" style="padding: 5px;" on:click="{() => showMessages()}">
                <MessageIcon />
            </div> -->
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
        max-height: 70px;
    }
    
    .controls {
        display: flex;
        gap: 1rem;
        align-items: center;
        height: 25px;
        .icon {
            cursor: pointer;
        }
    }
    .connectButton {
            padding: 15px;
    }

    .drag {
        pointer-events: auto;
        -webkit-app-region: no-drag;
    }
    </style>
    