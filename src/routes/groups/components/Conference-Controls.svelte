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
    
    window.api.receive('leave-active-voice-channel', async () => {
        disconnect_from_active_voice()
    })

    //Share screenpmn
    const switchStream = async () => {
        if (!$swarm.screenshare) {
            $swarm.myVideo = true
            $swarm.video = true
            await window.api.shareScreen(false, true)
            $swarm.screenshare = true
        }
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
        console.log("Disconnect from active voice!")

        if (!reconnect) $swarm.showVideoGrid = false
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
            if (active && $swarm.myStream && $swarm.myVideo) {
                $swarm.myStream.getVideoTracks().forEach((track) => track.stop())
            }
            
            //Stop any active stream
            if (!old) return true

            if (!reconnect) {
                let endTone = new Audio('/audio/endcall.mp3')
                endTone.play()
            }
            
            //Reset state if we are / were alone in the channel
            if ($swarm.call.length === 0) {
                $swarm.screenshare = false
                $swarm.video = false
                $swarm.screen_stream = false
                $swarm.myVideo = false
                $swarm.myStream = false
            }

            connected = false
            //Send status to backend
            window.api.send("exit-voice", old.key)
            $swarm.myVideo = false
            return true
    }
    
    
    const toggleAudio = () => {
        $swarm.audio = !$swarm.audio
        if (!$swarm.myStream) return
        $swarm.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
    }

    const add_video = async (screen = false) => {
        if ($swarm.cameraId === "none") return
        window.api.changeSource($swarm.cameraId, true, true)
        $swarm.screenshare = false
    }

    const activate_video = () =>{
        window.api.send('active-video')
    }
    
    const toggleVideo = () => {
    
        if (!connected) {
            if ($swarm.call.length > 0 && !$swarm.screenshare && !$swarm.myVideo) {
                add_video()
            } else if ($swarm.call.length === 0 && !$swarm.screenshare && !$swarm.myVideo) {
                activate_video()
            }
            connected = true
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
        $swarm.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
    }
    
    // const showMessages = () => {
    //     $swarm.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
    // }
    
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
                <VideoSources />
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
    