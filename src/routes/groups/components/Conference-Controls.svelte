<script>
    import VideoIcon from '$lib/components/icons/VideoIcon.svelte'
    import VideoSlash from '$lib/components/icons/VideoSlash.svelte'
    import MicIcon from '$lib/components/icons/MicIcon.svelte'
    import MuteIcon from '$lib/components/icons/MuteIcon.svelte'
    import Screenshare from '$lib/components/icons/Screenshare.svelte'
    import CallSlash from '$lib/components/icons/CallSlash.svelte'
    import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
    import { swarmGroups, videoGrid } from '$lib/stores/layout-state.js'
    import { swarm, user, groups } from '$lib/stores/user.js'
    import VideoSources from '$lib/components/chat/VideoSources.svelte'
    import Contacts from '$lib/components/chat/Contacts.svelte'
    import { onDestroy, onMount } from 'svelte'
    import { calcTime, sleep } from '$lib/utils/utils.js'
    import HideVideoGrid from '$lib/components/icons/HideVideoGrid.svelte'
    import {createEventDispatcher} from 'svelte'
    import AudioSources from '$lib/components/group_webrtc/AudioSources.svelte'
    
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
    
    //Share screenpmn
    const switchStream = async () => {
        if (!$swarm.screenshare) {
            $swarm.myVideo = true
            $swarm.video = true
            await window.api.shareScreen(false, true)
            $swarm.screenshare = true
            return
        }
        $swarm.myVideo = false
        $swarm.screenshare = false
        $swarm.myStream.getVideoTracks().forEach((track) => track.stop())
    }

    const join_voice_channel = async (video = false, reconnect = false, screen) => {
        if (in_voice) return
        if (!reconnect) startTone.play()
        $swarm.showVideoGrid = false
        console.log("Joining!")
        if (reconnect) {
            //activate_video()
            //await sleep(200)
            $swarm.myVideo = true
        }
        //Leave any active first
        if ($swarm.voice_channel.length) {
            //We already have an active call.  
            if (thisSwarm.voice_connected === true) return
             //Replace this with our new call
            if (!disconnect_from_active_voice()) return
        }
        console.log("Want to Join new voice")
        thisSwarm.voice_channel.push({address: my_address, name: $user.username, key: thisSwarm.key })
        $swarm.voice_channel = thisSwarm.voice_channel
        console.log("voice", voice_channel)
        window.api.send("join-voice", {key: thisSwarm.key, video: $swarm.myVideo})
        //Set to true? here
        thisSwarm.voice_connected = true
        $swarm = $swarm 
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }

    function disconnect_from_active_voice(reconnect = false) {
       window.api.exitVoiceChannel()
    }
    
    
    const toggleAudio = () => {
        $swarm.audio = !$swarm.audio
        if (!$swarm.myStream) return
        $swarm.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
        })
    }

    const add_video = async (add) => {
        if ($swarm.cameraId === "none") return
        window.api.changeSource($swarm.cameraId, true, add)
        $swarm.screenshare = false
    }

    const activate_video = () =>{
        window.api.send('active-video')
    }
    
    const toggleVideo = () => {
    
        if (!connected) {
            if ($swarm.call.length > 0 && !$swarm.screenshare && !$swarm.myVideo) {
                add_video(true)
            } else if ($swarm.call.length === 0 && !$swarm.screenshare && !$swarm.myVideo) {
                activate_video()
            }
            connected = true
            return
        } else if ($swarm.call.length > 0 && !$swarm.screenshare && connected && !$swarm.myVideo) {
            add_video(false)
            return
        }

        if ($swarm.screenshare) {
            let camera = $swarm.cameraId
            window.api.changeSource(camera, true)
            $swarm.screenshare = false
            return
        }

        console.log("Changed toggle! stream",$swarm.myStream)
        $swarm.myVideo = !$swarm.myVideo
        if (!$swarm.myStream) return
        $swarm.call.forEach((a) => {
            a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
        })
    }
    
    const showMessages = () => {
       console.log("show msgs!! *todo")
    }
    
    const hideGrid = () => {
        $swarm.showVideoGrid = false
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
                {#if !$swarm.myVideo}
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
                <AudioSources />
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
        height: 25px;
        .icon {
            cursor: pointer;
        }
    }
    </style>
    