<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import {fade, fly} from 'svelte/transition'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import {groups, notify, swarm, user} from '$lib/stores/user.js'
    import VoiceUser from './VoiceUser.svelte'
    import Lightning from '../icons/Lightning.svelte'
    import { swarmGroups } from '$lib/stores/layout-state'
    import CallSlash from '../icons/CallSlash.svelte'
    import MicIcon from '../icons/MicIcon.svelte'
    import MuteIcon from '../icons/MuteIcon.svelte'
    import Button from '../buttons/Button.svelte'
    import { sleep } from '$lib/utils/utils'
    import ShowVideoMenu from '../icons/ShowVideoMenu.svelte'
    import FillButton from '../buttons/FillButton.svelte'
    
    let startTone = new Audio('/audio/startcall.mp3')
    let channels = []
    let voice_channel = []
    let connected = false
    let topic = ""    
    let muted = false
    const dispatch = createEventDispatcher()
    const my_address = $user.huginAddress.substring(0,99)
    $: thisSwarm = $swarm.active.find(a => a.key === $groups.thisGroup.key)

    $: in_voice = voice_channel.some(a => a.address === my_address)

    $: if (thisSwarm) channels = thisSwarm.channels
    $: if (thisSwarm) topic = thisSwarm.topic
    $: if (thisSwarm) voice_channel = thisSwarm.voice_channel

    onMount(async () => {
        // await sleep(200)
        // printThis("Chat room")
        join_voice_channel()
    })

    const printThis = (channel) => {
        //if (channel === $swarm.activeChannel.name) return
        
        $swarm.activeChannel = {name: channel, key: thisSwarm.key}
        dispatch('print-channel', channel)
    }
    
    const openRemove = () => {
        $groups.removeGroup = !$groups.removeGroup
    }

      //Share screenpmn
      const switchStream = async () => {
        if (!$swarm.screenshare) {
            await window.api.shareScreen(false, true)
            $swarm.screenshare = true
        }
    }

    window.api.receive('leave-active-voice-channel', async () => {
        console.log("leave vojs!")
        disconnect_from_active_voice()
    })

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

            console.log("play sound!")
            let endTone = new Audio('/audio/endcall.mp3')
            endTone.play()
            
            console.log("Aha? still")
            //Reset state if we are / were alone in the channel
            if ($swarm.call.length === 0) {
                $swarm.screenshare = false
                $swarm.video = false
                $swarm.screen_stream = false
                $swarm.myVideo = false
                $swarm.myStream = false
            }
            
            console.log("Exit vojs!")
            connected = false
            //Send status to backend
            window.api.send("exit-voice", old.key)
            $swarm.myVideo = false
            return true
    }
    
    
    const toggleAudio = () => {
        $swarm.audio = !$swarm.audio
        console.log("mystream?", $swarm.myStream)
        if (!$swarm.myStream) return
        $swarm.call.forEach((a) => {
            a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
        })
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
                console.log("Reconnect with video!")
                add_video()
            } else if ($swarm.call.length === 0 && !$swarm.screenshare && !$swarm.myVideo) {
                console.log("Activate video!")
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
        $swarm.call.forEach((a) => {
            a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
        })
    }
    
    // const showMessages = () => {
    //     $swarm.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
    // }
    
    const show_grid = () => {
        $swarm.showVideoGrid = true
    }


</script>
    <!-- <div on:click={dispatch('printGroup', $groups.thisGroup)}
        class="card"
        in:fade
        out:fade
        class:active="{in_voice}"
        class:swarm="{thisSwarm}"
    >
    
    <Lightning on:click={disconnect_from_swarm} connected={connected} />
    
        <img class="avatar" src="data:image/png;base64,{get_avatar($groups.thisGroup.key)}" alt="" />
        <div class="content">
            <h4>{$groups.thisGroup.name}</h4>
            <div class="text">
                <p class="from">{group.nick}:</p>
                <p>{group.msg}</p>
            </div>
        </div>
    </div> -->
<div class="swarm_info" in:fly="{{ y: 50 }}">
    <!-- <div class="channels"> -->
        <div class="voice-channel">
            <p class="voice" on:click={join_voice_channel}><FillButton disabled={false} enabled={in_voice} text={in_voice ? "Voice channel" : "Join call"}/></p>
            {#if in_voice}
            <div class="voice-controls">
                <div  on:click={disconnect_from_active_voice}>
                    <CallSlash/>
                </div>
                <div  on:click={show_grid}>
                    <ShowVideoMenu />
                </div>
                <div on:click="{toggleAudio}">
                    {#if $swarm.audio}
                        <MicIcon />
                    {:else}
                        <MuteIcon />
                    {/if}
                </div>
            </div>
            {/if}
                <div class="list-wrapper">
                    {#each voice_channel as user}
                        <VoiceUser voice_user={user} topic={topic} voice_channel={voice_channel}/>
                    {/each}
                </div>
            </div>
        <!-- </div> -->
</div>
    <!-- <div class="text-channels">
        {#each channels as channel}
        
            {#if $swarm.activeChannel.name === channel.name}
                <div class="this-channel"></div>
            {/if}
            
            {#if $notify.unread.some(a => a.channel === channel.name)}
                <div class="dot" in:fade></div>
            {/if}
            
        <p class="channel" on:click={printThis(channel.name)}><Button disabled={false} text={channel.name}/></p>
        {/each}
    </div> -->

<style lang="scss">

    .card {
        display: flex;
        height: 80px;
        padding: 1rem;
        width: 100%;
        color: var(--title-color);
        border-bottom: 1px solid var(--border-color);
        background-color: var(--backgound-color);
        transition: 200ms ease-in-out;
        cursor: pointer;
        opacity: 0.9;

        &:hover {
            color: white;
            opacity: 1;
            background-color: var(--card-border);
            border-bottom: 1px solid transparent;
        }
    }
    
    .avatar {
        margin-bottom: 10px;
        opacity: 0.92;
        cursor: pointer;
    }

    .svg {
        margin-top: 5px;
    }
    
    .content {
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
    }
    
    h4 {
        margin: 0;
        white-space: nowrap;
        max-width: 180px;
        overflow: hidden;
        font-family: 'Montserrat', sans-serif;
        text-overflow: ellipsis;
        font-weight: bold;
    }
    
    p {
        margin: 5px 0 0 0;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        font-size: 12px;
        text-overflow: ellipsis;
        font-family: 'Montserrat', sans-serif;
    }

    .active {
        background-color: var(--border-color);
        border-bottom: 1px solid transparent;
    }
    
    .from {
        font-weight: bold;
        display: inline-table;
    }
    
    .text {
        display: flex;
        gap: 4px;
    }
    
    .swarm_info {
        color: white;
    }

    .voice {
        cursor: pointer;
        display: contents;
        font-size: 15px;
        font-family: "Roboto Mono";
        padding: 10px;
        margin-left: 10px;
    }

    .channel {
        cursor: pointer;
        font-size: 15px;
        font-family: "Roboto Mono";
    }

    .list-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: calc(100% - 103px);
        overflow: hidden;
    }

    .disconnect {
        color: var(--warn-color);
        font-size: 14px;
        cursor: pointer;
        opacity: 0.8;
        margin-bottom: 5px;
        margin-left: 8px;
        &:hover {
            opacity: 0.95;
        }
    }

    .text-channels {
        display: block;
        position: relative;
        padding: 10px;
        margin: 10px;
    }

    .this-channel {
        position: absolute;
        background-color: white;
        border-radius: 2px;
        height: 16px;
        width: 3px;
        left: -10px;
        box-shadow: 0 0 10px white;
        margin-top: 13px;
        transition: 0.2s;
}

.create {
    font-size: 20px;
    cursor: pointer;
    opacity: 0.85;
    &:hover {
        opacity: 1
    }
}

.dot {
    position: absolute;
    background-color: var(--warn-color);
    border-radius: 50%;
    height: 5px;
    width: 5px;
    left: 2px;
    margin-top: 17px;
    box-shadow: 0 0 10px white;
}

.voice-controls {
    display: flex;
    justify-content: space-around;
    margin-bottom: 10px;
    margin-top: 10px;
}


</style>