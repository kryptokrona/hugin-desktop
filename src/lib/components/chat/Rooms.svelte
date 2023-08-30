<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import {fade} from 'svelte/transition'
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
    
    let startTone = new Audio('/audio/startcall.mp3')
    let channels = []
    let voice_channel = []
    let connected = true
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
        await sleep(300)
        printThis("Chat room")
    })

    const printThis = (channel) => {
        if (channel === $swarm.activeChannel.name) return
        dispatch('print-channel', channel)
        $swarm.activeChannel = {name: channel, key: thisSwarm.key}
    }
    
    const openRemove = () => {
        $groups.removeGroup = !$groups.removeGroup
    }


const exitVoiceChannel = (key) => {
      
        let leave = voice_channel.find(a => a.address === my_address)
        let stay = voice_channel.filter(a => a !== leave)
        voice_channel = stay
        window.api.send("exit-voice", leave.key)
        thisSwarm.voice_connected = false
        //We also need to leave the $swarm.voice_channel which is the _one_ and only active call at a time.
    }
    
    const join_voice_channel = () => {
        if (in_voice) return
        startTone.play()
        muted = false
        console.log("Joining!")
        //Leave any active first
        if ($swarm.voice_channel.length) {
            //We already have an active call.  
            if (thisSwarm.voice_connected === true) return
             //Replace this with our new call
            if (!disconnect_from_active_voice()) return
        }
        console.log("Want to Join new voice")
        voice_channel.push({address: $user.huginAddress.substring(0,99), name: $user.username, key: thisSwarm.key })
        $swarm.voice_channel = voice_channel
        console.log("voice", voice_channel)
        window.api.send("join-voice", thisSwarm.key)
        //Set to true? here
        thisSwarm.voice_connected = true
        $swarm = $swarm 
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }
    
    
    const disconnect_from_active_voice = () => {
        console.log("Disconnect from active voice!")
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
            let active = $swarm.voice_channel.find(a => a.address === $user.huginAddress.substring(0,99))
            if (!active) return true

            //Change voice connected status in other channels
            let old = $swarm.active.find(a => a.voice_connected === true)
            if (old) old.voice_connected = false


            //Remove from the active voice channel we have
            console.log("Want to exit old voice")
            let remove = $swarm.voice_channel.filter( a => a !== active)
            $swarm.voice_channel = remove

            if (!old) return true

            let endTone = new Audio('/audio/endcall.mp3')
            endTone.play()

            //Send status to backend
            window.api.send("exit-voice", old.key)
            return true
    }

    const disconnect_from_swarm = () => {
        let key = $groups.thisGroup.key
        window.api.send("exit-voice",key)
        window.api.send("end-swarm", key)
        $swarmGroups.showGroups = true
        connected = false
    }

    const toggleAudio = () => {
        $swarm.audio = !$swarm.audio
        if (!$swarm.myStream) return
        $swarm.myStream.getTracks().forEach((track) => (track.enabled = !track.enabled))
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
{#if thisSwarm}
<div class="swarm_info">
    <!-- <div class="channels"> -->
        <div class="voice-channel">
            <p class="voice" on:click={join_voice_channel}><Button disabled={false} text={"Radio room"}/></p>
            {#if in_voice}
            <div class="voice-controls">
                <div  on:click={disconnect_from_active_voice}>
                    <CallSlash/>
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
    <div class="text-channels">
        {#each channels as channel}
        
            {#if $swarm.activeChannel.name === channel.name}
                <div class="this-channel"></div>
            {/if}
            
            {#if $notify.unread.some(a => a.channel === channel.name)}
                <div class="dot" in:fade></div>
            {/if}
            
        <p class="channel" on:click={printThis(channel.name)}><Button disabled={false} text={channel.name}/></p>
        {/each}
    </div>
{/if}

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
}


</style>