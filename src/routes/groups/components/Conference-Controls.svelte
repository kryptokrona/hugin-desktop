<script>
    import VideoIcon from '$lib/components/icons/VideoIcon.svelte'
    import VideoSlash from '$lib/components/icons/VideoSlash.svelte'
    import MicIcon from '$lib/components/icons/MicIcon.svelte'
    import MuteIcon from '$lib/components/icons/MuteIcon.svelte'
    import Screenshare from '$lib/components/icons/Screenshare.svelte'
    import CallSlash from '$lib/components/icons/CallSlash.svelte'
    import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
    import { swarmGroups, videoGrid } from '$lib/stores/layout-state.js'
    import { swarm, user, groups, rtc_groups } from '$lib/stores/user.js'
    import VideoSources from '$lib/components/webrtc/VideoSources.svelte'
    import Contacts from '$lib/components/chat/Contacts.svelte'
    import { onDestroy, onMount } from 'svelte'
    import { calcTime, sleep } from '$lib/utils/utils.js'
    import HideVideoGrid from '$lib/components/icons/HideVideoGrid.svelte'
    import {createEventDispatcher} from 'svelte'
    import AudioSources from '$lib/components/webrtc/AudioSources.svelte'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import { videoSettings, mediaSettings, video } from '$lib/stores/mediasettings'
    
    let startTime = Date.now()
    let time = '0:00:00'
    let timer

    let startTone = new Audio('/audio/startcall.mp3')
    let channels = []
    let voice_channel = []
    let connected = false
    let topic = ""
    const dispatch = createEventDispatcher()
    const my_address = $user.huginAddress.substring(0,99)

    $: thisSwarm = $swarm.active.find(a => a.key === $groups.thisGroup.key)
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
    

    const join_voice_channel = async (video = false, screen) => {
        if (in_voice) return
        if (thisSwarm.voice_channel.length > 9) {
            window.api.errorMessage('There are too many in the call')
            return
        }
        startTone.play()
        $swarm.showVideoGrid = true
        console.log("Joining!")

        //Leave any active first
        if ($swarm.voice_channel.length) {
            console.log("Still in voice")
            //We already have an active call.  
            if (thisSwarm.voice_connected === true) return
             //Replace this with our new call
            if (!disconnect_from_active_voice()) return
        }
        console.log("Want to Join new voice")
        thisSwarm.voice_channel.push({address: my_address, name: $user.username, key: thisSwarm.key })
        $swarm.voice_channel = thisSwarm.voice_channel
        console.log("Voice channel", voice_channel)
        window.api.send("join-voice", {key: thisSwarm.key, video: $videoSettings.myVideo})
        //Set to true? here
        thisSwarm.voice_connected = true
        $swarm = $swarm 
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }

    function disconnect_from_active_voice() {
        console.log("Disconnect from active voice!")

        $swarm.showVideoGrid = true
            //Leave any active first, check if my own address is active in some channel
            //Also remove from voice channel
            let swarms = $swarm.active
            //Remove my own address from swarm active voice channel list in UI
            swarms.forEach(joined => {
                if (joined.voice_channel.some(a => a.address === my_address)) {
                let removed = joined.voice_channel.filter(a => a.address !== my_address) 
                joined.voice_channel = removed
                }
            })
            
            //Check my current active swarm voice channel and remove aswell
            let active = $swarm.voice_channel.find(a => a.address === my_address)
            if (!active) return true

            //Change voice connected status in other channels
            let old = $swarm.active.find(a => a.voice_connected === true)
            if (old) old.voice_connected = false

            
            //Remove from the active voice channel we have
            console.log("Want to exit old voice")
            let remove = $swarm.voice_channel.filter( a => a !== active)
            $swarm.voice_channel = remove
            
            //Stop any active tracks
            if (active && $swarm.myStream && $videoSettings.myVideo) {
                $swarm.myStream.getVideoTracks().forEach((track) => track.stop())
            }
            
            //Stop any active stream
            if (!old) return true

            let endTone = new Audio('/audio/endcall.mp3')
            endTone.play()
            
            //Reset state if we are / were alone in the channel
            if ($swarm.call.length === 0) {
                $video.play = false
                $videoSettings.myVideo = false
                $videoSettings.screenshare = false
                $swarm.myStream = false
            }
            
            console.log("Exit vojs!")
            connected = false
            //Send status to backend
            window.api.send("exit-voice", old.key)
            $videoSettings.myVideo = false
            return true
    }

    //Share screen
    const switchStream = async () => {
        if (!$videoSettings.screenshare) {
            $videoSettings.loading = true
            await window.api.shareScreen(false, true)
            $videoSettings.screenshare = true
            return
        }
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
        window.api.send('active-video')
    }
    
    const toggleVideo = () => {
        $videoSettings.loading = true
    
        if ($swarm.call.length > 0 && !$videoSettings.screenshare && !$videoSettings.myVideo) {
            add_video(true)
        } else if ($swarm.call.length === 0 && !$videoSettings.screenshare && !$videoSettings.myVideo) {
            activate_video()
        }

        if ($videoSettings.screenshare) {
            let camera = $mediaSettings.cameraId
            window.api.changeSource(camera, true)
            $videoSettings.screenshare = false
            return
        }

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
            <FillButton text={"Join call"} enabled={true} on:click={join_voice_channel}/>
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
                <Screenshare />
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
            <div class="icon" style="padding: 5px;" on:click="{() => showMessages()}">
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
    