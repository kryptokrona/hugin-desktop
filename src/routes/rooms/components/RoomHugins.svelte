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
import ShowVideoMenu from '$lib/components/icons/ShowVideoMenu.svelte'
import Groupcall from '$lib/components/icons/Groupcall.svelte'
import Tooltip from '$lib/components/popups/Tooltip.svelte'

let activeHugins = []
let room = ''
let roomName
let asian = false
let firstConnect = false
let loading = false
let voice_channel = []

function sendPM() {
    // Add friend request here?
}

const myAddress = $user.myAddress

//Set group key
$: if ($rooms.thisRoom.key) {
    room = $rooms.thisRoom.key
}

//Active users in p2p chat
let activeUsers = []

$: thisSwarm = $swarm.active.find(a => a.key === $rooms.thisRoom.key)
$: in_voice = voice_channel.some(a => a.address === $user.myAddress)
$: if (thisSwarm) voice_channel = thisSwarm.voice_channel

//Active hugins
$: activeList = activeHugins.filter(a => a.grp !== a.address)

let timeout = false

$ : if (thisSwarm && $rooms.activeHugins) {
    updateOnline()
}

$: if (thisSwarm) {
    let uniq = {}
    activeHugins = [...thisSwarm.connections.filter(a => !activeHugins.includes(a.address)), ...$rooms.activeHugins].filter((obj) => !uniq[obj.address] && (uniq[obj.address] = true))
    updateOnline()
} else {
    activeUsers = []
}

const updateOnline = () => {
    activeUsers = activeHugins.filter(a => thisSwarm.connections.map(b=>b.address).includes(a.address))
}



</script>

<!-- {#if $swarm.showInfo && firstConnect}
    <SwarmInfo on:join-room={connecto_to_swarm}/>
{/if} -->

<div class="wrapper" out:fly="{{ x: 100 }}" class:hide="{$layoutState.hideGroupList}">

        <div class="list-wrapper">
            {#each activeList as user}     
            
                    <div class:invoice={voice_channel.some(a => a.address === user.address)} in:fade class="card" on:click="{() => sendPM(user)}">
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
    max-width: 210px;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
    border-left: 1px solid var(--border-color);
    border-right: none;
    margin-right: 86px;
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
    top: 0;
    width: 100%;
    max-width: 210px;
    padding: 20px;
    display: inline-block;
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

.invoice {
    border: 1px solid var(--success-color);
    border-radius: 5px;
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
</style>