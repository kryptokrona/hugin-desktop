<script>
    import VideoIcon from '$lib/components/icons/VideoIcon.svelte'
    import VideoSlash from '$lib/components/icons/VideoSlash.svelte'
    import MicIcon from '$lib/components/icons/MicIcon.svelte'
    import MuteIcon from '$lib/components/icons/MuteIcon.svelte'
    import CallSlash from '$lib/components/icons/CallSlash.svelte'
    import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
    import { videoGrid } from '$lib/stores/layout-state.js'
    import { swarm, user, groups, rtc_groups, rooms } from '$lib/stores/user.js'
    import VideoSources from '$lib/components/webrtc/VideoSources.svelte'
    import { onDestroy, onMount } from 'svelte'
    import { calcTime, sleep } from '$lib/utils/utils.js'
    import HideVideoGrid from '$lib/components/icons/HideVideoGrid.svelte'
    import {createEventDispatcher} from 'svelte'
    import AudioSources from '$lib/components/webrtc/AudioSources.svelte'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import { videoSettings, mediaSettings, video } from '$lib/stores/mediasettings'
    import ScreenSources from '$lib/components/webrtc/ScreenSources.svelte'
    
    let startTime = Date.now()
    let time = '0:00:00'
    let timer

    let startTone = new Audio('/audio/startcall.mp3')
    let channels = []
    let voice_channel = []
    let loading = false
    let topic = ""
    const dispatch = createEventDispatcher()
    const my_address = $user.myAddress

    $: thisSwarm = $swarm.active.find(a => a.voice_connected)
    $: in_voice = voice_channel.some(a => a.address === my_address)

    $: if (thisSwarm) channels = thisSwarm.channels
    $: if (thisSwarm) topic = thisSwarm.topic
    $: if (thisSwarm) voice_channel = thisSwarm.voice_channel

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

    const share_profile = async () => {
        return
        const profile = await window.api.getProfile()
        const hash = await window.api.createGroup()
        const time = Date.now()
        window.api.groupUpload(profile.name, profile.path, $swarm.activeSwarm.topic, profile.size, time, hash, true)
}

    const join_voice_channel = async (video = false, screen) => {
        loading = true
        if (in_voice) return
        if (thisSwarm.voice_channel.length > 9) {
            window.api.errorMessage('There are too many in the call')
            loading = false
            return
        }
        console.log("Joining!")
        await sleep(50)
        //Leave any active first
        if ($swarm.voice_channel.length) {
            console.log("Still in voice")
            window.api.errorMessage('You are already in a voice channel')
            return
            //We already have an active call.
            disconnect_from_active_voice()
        }
        startTone.play()
        $swarm.showVideoGrid = true
        console.log("Want to Join new voice")
        thisSwarm.voice_channel.push({address: my_address, name: $user.username, key: thisSwarm.key })
        $swarm.voice_channel = thisSwarm.voice_channel
        console.log("Voice channel", voice_channel)
        window.api.send("join-voice", {key: thisSwarm.key, video: $videoSettings.myVideo})
        //Set to true? here
        thisSwarm.voice_connected = true
        $swarm = $swarm
        loading = false
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }

    function disconnect_from_active_voice() {
        window.api.exitVoiceChannel()
    }

    //Share screen
    const switchStream = async () => {
        await window.api.shareScreen(false, true)
    }
    
    const toggleAudio = () => {
        $swarm.audio = !$swarm.audio
        if (!$swarm.myStream) return
        $swarm.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
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
    
    <div class="wrapper layered-shadow">
        <div>
        <div class="connectButton">
            {#if !in_voice}
            <FillButton text={"Join call"} enabled={true} loading={loading} on:click={join_voice_channel}/>
            {:else}
            <p>{time}</p>
            {/if}
        </div>
        </div>
        <div class="controls">
            {#if in_voice}
            <div class="icon" on:click="{toggleVideo}">
                {#if !$videoSettings.myVideo}
                    <VideoSlash />
                {:else}
                    <VideoIcon grid="{true}" />
                {/if}
            </div>
            <div class="icon" on:click="{toggleAudio}">
                {#if $swarm.audio}
                    <MicIcon />
                {:else}
                    <MuteIcon />
                {/if}
            </div>
            <div class="icon" on:click="{switchStream}">
                <ScreenSources group={true}/>
            </div>
            <div class="icon" on:click="{() => disconnect_from_active_voice(false)}">
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
        <div class="icon" style="padding: 5px;" on:click="{() => hideGrid()}">
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
    </style>
    