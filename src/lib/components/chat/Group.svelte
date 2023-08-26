<script>
    import {createEventDispatcher} from 'svelte'
    import {fade} from 'svelte/transition'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import {groups, swarm, user} from '$lib/stores/user.js'
    import { swarmGroups } from '$lib/stores/layout-state'
    import Lightning from '../icons/Lightning.svelte'
    import {standardGroups} from "$lib/stores/standardgroups.js";
    
    export let group
    let channels = []
    let voice_channel = []
    
    $: channels
    
    $: if (thisSwarm) voice_channel = thisSwarm.voice_channel
    
    const dispatch = createEventDispatcher()
    
    const print_group = (group) => {
         //If p2p group, enter focus mode
         if (thisSwarm) {
            $swarmGroups.showGroups = false
        }
        if (group.key === $groups.thisGroup.key) return
     
        dispatch('print')
    }
    
    const openRemove = () => {
        $groups.removeGroup = !$groups.removeGroup
    }

    const disconnect_from_swarm = () => {
        let key = $groups.thisGroup.key
        window.api.send("exit-voice",key)
        window.api.send("end-swarm", key)
        $swarmGroups.showGroups = true
    }

    const connecto_to_swarm = () => {
        if (swarmGroup) return
        $swarmGroups.showGroups = false
        window.api.send("new-swarm", {
            key: group.key, 
            address: $user.huginAddress.substring(0,99),
            name: $user.username
        })
    }
    
    const my_address = $user.huginAddress.substring(0,99)

    $: swarmGroup = $swarm.active.some(a => a.key === group.key)
    
    $: thisSwarm = $swarm.active.find(a => a.key === group.key)

    $: in_voice = voice_channel.some(a => a.address === my_address)
    
    $: if (thisSwarm) channels = thisSwarm.channels
    
    const createNewChannel = () => {
        //Add to channels and notify others in the swarm
    }
    
    const exitVoiceChannel = (key) => {
        let endTone = new Audio('/audio/endcall.mp3')
        endTone.play()
        let leave = voice_channel.find(a => a.address === $user.huginAddress.substring(0,99))
        let stay = voice_channel.filter(a => a !== leave)
        voice_channel = stay
        window.api.send("exit-voice", group.key)
        thisSwarm.voice_connected = false
        //We also need to leave the $swarm.voice_channel which is the _one_ and only active call at a time.
    }
    
    const join_voice_channel = () => {
        let startTone = new Audio('/audio/startcall.mp3')
        startTone.play()
        console.log("Joining!")
        //Leave any active first
        if ($swarm.voice_channel.length) {
            //We already have an active call.
            //Replace this with our new call
            if (!disconnect_from_active_voice()) return
        }
        console.log("Want to Join new voice")
        $swarm.voice_channel.push({address: $user.huginAddress.substring(0,99), name: $user.username, key: group.key })
        $swarm.voice_channel = voice_channel
        console.log("voice", voice_channel)
        window.api.send("join-voice", group.key)
        //Set to true? here
        thisSwarm.voice_connected = true
    }

    
    const disconnect_from_active_voice = () => {
        console.log("Disconnect from old!")
            //Leave any active first, check if my own address is active in some channel
            let active = $swarm.voice_channel.find(a => a.address === $user.huginAddress.substring(0,99))
            console.log("Wanna disconnect", active)
            if (!active) return true
            if (group.key === active.key) return false
            console.log("Want to exit old voice")
            let old = $swarm.active.find(a => a.voice_connected === true)
            if (!old) {
                console.log("No active voice found!")
            }
            old.voice_connected = false
            $swarm.voice_channel.filter( a => a !== active)
            $swarm.voice_channel = $swarm.voice_channel
            window.api.send("exit-voice", old.key)
            return true
    }
    
    </script>
    
    <div
        class="card"
        in:fade
        out:fade
        class:active="{$groups.thisGroup.key === group.key}"
        class:swarm="{swarmGroup}"
        on:click="{(e) => print_group(group)}"
    >
        {#if group.new}
            <div class:unread="{group.new}"></div>
        {/if}

         {#if !$standardGroups.some(a => a.key === group.key)}
        <Lightning on:click={connecto_to_swarm} connected={swarmGroup} />
        {/if}
    
        <img class="avatar" on:click={openRemove} src="data:image/png;base64,{get_avatar(group.key)}" alt="" />
        <div class="content">
            <h4>{group.name}</h4>
            <div class="text">
                <p class="from">{group.nick}:</p>
                <p>{group.msg}</p>
            </div>
        </div>
    </div>
    
    <!-- Here we can hover / or and show details from this active group *** <--
        {#if swarmGroup}
    <div class="swarm_info">
      <div class="channels">
        <div class="voice-channel">
        <p>Channels</p>
        <p class="voice" on:click={join_voice_channel}>#Radio room</p>
            <br>
        {#each voice_channel as user}
                <p>{user.name}</p>
            {/each}
        </div>
        {#if in_voice}
        <div>
            <p>DISCONNECT</p>
        </div>
        {/if}
        {#each channels as channel}
            <p>{channel.name}</p>{channel.type}
        {/each}
    
      </div>
    </div>
    {/if} -->
    <style lang="scss">
    
        .voice {
            cursor: pointer;
        }
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
    
    .unread {
        animation: border_rgb 30s infinite;
        background-color: white;
        width: 5px;
        height: 2px;
        border-radius: 30%;
        left: 340px;
        margin-top: 25px;
        position: absolute;
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
    
    .swarm {
        border: 1px solid var(--success-color);
    }
    
    .swarm_info {
        color: white;
        height: 100px;
        border-bottom: 1px solid var(--border-color);
    }
    </style>