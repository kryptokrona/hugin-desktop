<script>
    import { run } from 'svelte/legacy';

    import {fade} from 'svelte/transition'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import { notify, swarm, user, rooms} from '$lib/stores/user.js'
    import { isLatin } from '$lib/utils/utils'
    
    /** @type {{r: any, onPrintRoom: any}} */
    let { r, onPrintRoom } = $props();
    let channels = $state([])
    let voice_channel = $state([])
    let asian = $state(false)
    let thisSwarm = $state(false)
    run(() => {
        channels
    });
    let isThis = $derived($rooms.thisRoom?.key === $swarm.activeSwarm?.key)
    run(() => {
        if (isThis && $swarm.activeSwarm) thisSwarm = $swarm.activeSwarm
    });
    run(() => {
        if (thisSwarm) voice_channel = thisSwarm.voice_channel
    });
    
    
    const printRoom = (rm) => {
        const active = $swarm.active.find(a => a.key === rm.key)
        if (rm.key === $swarm.activeSwarm.key) return
        $swarm.activeSwarm = active
        onPrintRoom()
    }
    
    const openRemove = () => {
        $rooms.removeRoom = !$rooms.removeRoom
    }

    let in_voice = $derived(voice_channel.some(a => a.address === $user.myAddress))
    
    run(() => {
        if (thisSwarm) channels = thisSwarm.channels
    });
    
    let counter = $derived($notify.unread.filter(a => a.type === "room" && a.group === r.key).length)

    run(() => {
        if (!isLatin(r.name)) asian = true
    });

    const createNewChannel = () => {
        //Add to channels and notify others in the swarm
    }
    
    </script>
    
    <div
        class="card"
        in:fade|global
        out:fade|global
        class:active="{$swarm.activeSwarm?.key === r.key}"
        onclick={(e) => printRoom(r)}
    >
    
        <img class="avatar" onclick={openRemove} src="data:image/png;base64,{get_avatar(r.key)}" alt="" />
        <div class="content">
            <h4 class:asian class:big={asian}>{r.name}</h4>
            <div class="text">
                <p class:asian class="from">{r.nick}:</p>
                <p>{r.msg}</p>
            </div>
        </div>
        {#if counter > 0}
        <div in:fade|global class="unread">
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
            color: var(--text-color);
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
        color: var(--text-color);
        height: 100px;
        border-bottom: 1px solid var(--border-color);
    }

    .count {
        font-size: 12px;
        color: var(--text-color);
    }

    .asian {
        font: menu;
    }

    .big {
        font-size: 17px;
    }

    </style>