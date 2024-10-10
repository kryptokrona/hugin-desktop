<script>
    import {createEventDispatcher} from 'svelte'
    import {fade} from 'svelte/transition'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import { notify, swarm, user, rooms} from '$lib/stores/user.js'
    import { isLatin } from '$lib/utils/utils'
    
    export let r
    let channels = []
    let voice_channel = []
    let asian = false

    $: channels
    $: thisSwarm = $swarm.active.find(a => a.key === $rooms.thisRoom.key)
    $: if (thisSwarm) voice_channel = thisSwarm.voice_channel
    
    const dispatch = createEventDispatcher()
    
    const printRoom = (rm) => {
    
        if (rm.key === $rooms.thisRoom.key) return
        $swarm.activeSwarm = thisSwarm
        dispatch('print')
    }
    
    const openRemove = () => {
        $rooms.removeRoom = !$rooms.removeRoom
    }

    $: swarmRoom = $swarm.active.some(a => a.key === r.key)
    
    $: thisSwarm = $swarm.active.find(a => a.key === r.key)

    $: in_voice = voice_channel.some(a => a.address === $user.myAddress)
    
    $: if (thisSwarm) channels = thisSwarm.channels
    
    $: counter = $notify.unread.filter(a => a.type === "room" && a.group === r.key).length

    $: if (!isLatin(r.name)) asian = true

    const createNewChannel = () => {
        //Add to channels and notify others in the swarm
    }
    
    </script>
    
    <div
        class="card"
        in:fade
        out:fade
        class:active="{$rooms.thisRoom.key === r.key}"
        on:click="{(e) => printRoom(r)}"
    >
    
        <img class="avatar" on:click={openRemove} src="data:image/png;base64,{get_avatar(r.key)}" alt="" />
        <div class="content">
            <h4 class:asian class:big={asian}>{r.name}</h4>
            <div class="text">
                <p class:asian class="from">{r.nick}:</p>
                <p>{r.msg}</p>
            </div>
        </div>
        {#if counter > 0}
        <div in:fade class="unread">
            <div class="count">
                {counter}
            </div>
        </div>
        {/if}
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
        width: 90%;
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
        min-width: 17px;
        height: 17px;
        border-radius: 33%;
        background: #ce4141;
        padding: 2px;
        display: flex;
        margin-top: 10px;
        justify-content: center;
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
        height: 100px;
        border-bottom: 1px solid var(--border-color);
    }

    .count {
        font-size: 12px;
        color: white;
    }

    .asian {
        font: menu;
    }

    .big {
        font-size: 17px;
    }

    </style>