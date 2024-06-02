<script>
import {fade, fly} from 'svelte/transition'
import {groups, swarm, user, webRTC, notify, rooms} from '$lib/stores/user.js'
import {get_avatar} from '$lib/utils/hugin-utils.js'
import {layoutState, swarmGroups} from '$lib/stores/layout-state.js'
import { isLatin, sleep } from '$lib/utils/utils'
import Bell from '$lib/components/icons/Bell.svelte'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import SwarmInfo from '$lib/components/popups/SwarmInfo.svelte'
import Lightning from '$lib/components/icons/Lightning.svelte'

let activeHugins = []
let room = ''
let roomName
let asian = false
let firstConnect = false
let loading = false

function sendPM() {
    // Add friend request here?
}

function copyThis(copy) {
    let msg = 'You copied a Room key'
    window.api.successMessage(msg)
    navigator.clipboard.writeText(copy)
}

const myAddress = $user.myAddress

//Set group key
$: if ($rooms.thisRoom.key) {
    room = $rooms.thisRoom.key
}

//Active users in p2p chat
let activeUsers = []

//This group name
$: roomName = $rooms.thisRoom.name

$: if (roomName) {
    if (!isLatin(roomName)) asian = true
    else asian = false
}

//Active hugins
$: activeHugins = $rooms.activeHugins

$: activeList = activeHugins.filter(a => a.grp !== a.address)

$: thisSwarm = $swarm.active.find(a => a.key === $rooms.thisRoom.key)

$: muteGroup = $notify.off.some(a => a === roomName)

let timeout = false

$: if (thisSwarm) {
    activeUsers = activeHugins.filter(a => thisSwarm.connections.map(b=>b.address).includes(a.address))
} else {
    activeUsers = []
}

const toggleNotification = () => {
    if (muteGroup) {
        const filter = $notify.off.filter(a => a !== roomName)
        $notify.off = filter
    } else {
        $notify.off.push(roomName)
    }
    $notify = $notify
    window.api.send('group-notifications', $notify.off)
}

const disconnect_from_swarm = async () => {
        let key = $rooms.thisRoom.key
        window.api.send("exit-voice",key)
        window.api.send("end-swarm", key)
        $swarmGroups.showGroups = true
        $swarm.showVideoGrid = false
        await sleep(2000)
        timeout = false
}


const connecto_to_swarm = async () => {
    loading = true
    if (!window.localStorage.getItem('swarm-info')) {
        $swarm.showInfo = true
        firstConnect = true
        loading = false
        return
    }
    if (thisSwarm) {
        disconnect_from_swarm()
        await sleep(200)
        loading = false
        return
    } else if (!thisSwarm && $swarm.active.length) {
        //Temporary fix until we handle more 
        window.api.errorMessage('You are already in a room')
        loading = false
        return
    }
    
    if ($webRTC.call.length) {
        window.api.errorMessage('You are already in a call')
        loading = false
        return
    }
    
    if (timeout) {
        window.api.errorMessage('Please wait a couple of seconds')
        loading = false
        return
    }

    window.api.send("new-swarm", {
        key: $rooms.thisRoom.key, 
        address: $user.myAddress,
        name: $user.username
    })
    timeout = true
    await sleep(200)
    loading = false
}

    // const show_video_room = () => {
    //     $swarm.showVideoGrid = true
    // }

</script>

<!-- {#if $swarm.showInfo && firstConnect}
    <SwarmInfo on:join-room={connecto_to_swarm}/>
{/if} -->

<div class="wrapper" out:fly="{{ x: 100 }}" class:hide="{$layoutState.hideGroupList}">
    <div class="top">
        <h2 class:asian style="cursor: pointer;" on:click={() => copyThis(room)}>{roomName}</h2>
        <br />
            
            <div class="connect" on:click={connecto_to_swarm}>
                <Lightning connected={thisSwarm} />
            </div>
            <br />
        
        <div style="cursor: pointer; display: flex; width: 25px;" on:click={toggleNotification}>
            {#if !muteGroup}
                <Bell active={true}/>
            {:else}
                <Bell active={false}/>
            {/if}
        </div>
    </div>
        <div class="list-wrapper">
            {#each activeList as user}     
            
                    <div in:fade class="card" on:click="{() => sendPM(user)}">
                        {#if (thisSwarm && user.address === myAddress) || activeUsers.some(a => a.address === user.address)}
                            <div class:unread="{(thisSwarm && user.address === myAddress) || activeUsers.some(a => a.address === user.address)}"></div>
                        {/if}
                        <img
                            class="avatar"
                            src="data:image/png;base64,{get_avatar(user.address)}"
                            alt=""
                        />
                        <p class="nickname">{user.name}</p>
                        <br />
                      
                    </div>
            {/each}
        </div>

</div>

<style lang="scss">

.connectto {
    color: var(--success-color);
    margin-left: 5px;
}

.disconnect {
    color: var(--warn-color);
    margin-left: 5px;
}

.connect {
    display: flex;
    cursor: pointer;
    opacity: 0.8;
    width: 170px;
    &:hover {
        opacity: 1;
    }
}

.swarm {
    cursor: pointer;
}

.nickname {
    margin: 0;
    word-break: break-word;
    display: contents;
    font-family: 'Montserrat' !important;
    font-size: 12px;
}

.wrapper {
    width: 100%;
    max-width: 280px;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
    max-width: 210px;
    border-left: 1px solid var(--border-color);
    border-right: none;
    margin-right: 85px;
}

.list-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100% - 103px);
    overflow: scroll;
    padding-bottom: 20px;
}

.wrapper::-webkit-scrollbar,
.list-wrapper::-webkit-scrollbar {
    display: none;
}

.top {
    height: 85px;
    top: 0;
    width: 100%;
    max-width: 280px;
    padding: 20px;
    display: inline-table;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.card {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    width: 100%;
    color: white;
    border-bottom: 1px solid var(--border-color);
    transition: 177ms ease-in-out;
    cursor: pointer;

    &:hover {
        background-color: #333333;
    }
}

.avatar {
    height: 30px;
}

h4 {
    margin: 0;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    font-family: 'Montserrat';
    text-overflow: ellipsis;
}

h2 {
    margin: 0;
    color: #fff;
    font-family: 'Montserrat';
    font-weight: bold;
    font-size: 22px;
}

p {
    margin: 0;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    font-size: 12px;
    margin-top: 5px;
    text-overflow: ellipsis;
}

.active_hugins {
    padding: 1rem;
    color: white;
    border-bottom: 1px solid var(--border-color);
}

.add {
    font-size: 15px;
    color: white;
}

.content {
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.remove {
    display: inline-block;
}

.buttons {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
}

.hide {
    transition: 200ms ease-in-out;
    margin-right: -125px;
}

.in_swarm {
    transition: 0.2s;
    border: 1px solid var(--success-color);
}

.unread {
    background-color: var(--success-color);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    position: relative;
}

.notification {
    font-family: "Montserrat";
    font-size: 15px;
    color: var(--success-color);
    font-weight: 500;

}

.muted {
    color: var(--warn-color) !important;
}

.list {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 200px;
    padding: inherit;
    background-color: var(--card-color);
    border-radius: 0.4rem;
    z-index: 999;
    right: 18px;
    div {
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;

        &:hover {
            background-color: var(--card-border);
        }
    }
}

.asian {
    font: menu;
    font-size: 20px !important;
    font-weight: 500;
}
</style>