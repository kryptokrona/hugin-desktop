<script>
    import { run } from 'svelte/legacy';

    import {fade} from 'svelte/transition'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import { notify, swarm, user, rooms} from '$lib/stores/user.js'
    import { isLatin } from '$lib/utils/utils'
    
    /** @type {{r: any, onPrintRoom: any, usersOnline: boolean}} */
    let { r, onPrintRoom, usersOnline = false } = $props();
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

    let in_voice = $derived(voice_channel.has($user.myAddress))
    
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
        <div class="avatar-wrapper">
             <img class="avatar" onclick={openRemove} src="data:image/png;base64,{get_avatar(r.key)}" alt="" />
             {#if usersOnline}
                <div class="online-indicator"></div>
             {/if}
        </div>
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
        border: 1px solid transparent;
        border-bottom: 1px solid var(--border-color);
        background-color: var(--backgound-color);
        transition: 200ms ease-in-out;
        cursor: pointer;
        opacity: 0.9;
    
        &:hover {
            color: var(--text-color);
            opacity: 1;
            background-color: var(--card-background);
            border-bottom: 1px solid transparent;
        }
    }
    
    .avatar-wrapper {
        position: relative;
        margin-bottom: 10px;
        height: 30px; /* Match avatar height if known, usually better to let content dictate but here we need constraints for absolute pos */
        display: flex; /* Ensure avatar fits */
    }

    .avatar {
        /* margin-bottom: 10px; moved to wrapper */
        opacity: 0.92;
        cursor: pointer;
    }
    
    .online-indicator {
        position: absolute;
        top: -3px;
        left: -3px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--accent-color, #4CAF50);
        box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
        border: 2px solid var(--backgound-color); 
        animation: pulse 2s ease-in-out infinite;
        z-index: 10;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
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
        background-color: var(--card-background);
        border: 1px solid var(--success-color) !important;
        border-radius: 2px;
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
        color: white;
    }

    .asian {
        font: menu;
    }

    .big {
        font-size: 17px;
    }

    </style>