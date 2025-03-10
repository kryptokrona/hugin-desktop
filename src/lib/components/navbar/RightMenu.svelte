<script>
import { fade } from 'svelte/transition'
import { page } from '$app/stores'
import { boards, groups, transactions, user, webRTC, beam, swarm } from '$lib/stores/user.js'
import { remoteFiles, localFiles } from '$lib/stores/files.js'
import { get_avatar, get_board_icon } from '$lib/utils/hugin-utils.js'
import { createEventDispatcher } from 'svelte'
import SimpleAdd from '$lib/components/icons/SimpleAdd.svelte'
import PayIcon from '$lib/components/icons/PayIcon.svelte'
import MicIcon from '$lib/components/icons/MicIcon.svelte'
import MuteIcon from '$lib/components/icons/MuteIcon.svelte'
import HomeIcon from '$lib/components/icons/HomeIcon.svelte'
import Lock from '$lib/components/icons/Lock.svelte'

import CallIcon from '$lib/components/icons/CallIcon.svelte'
import CallSlash from '$lib/components/icons/CallSlash.svelte'
import VideoIcon from '$lib/components/icons/VideoIcon.svelte'
import VideoSlash from '$lib/components/icons/VideoSlash.svelte'
import { layoutState, videoGrid } from '$lib/stores/layout-state.js'
import ListButton from '$lib/components/icons/ListButton.svelte'
import Lightning from '$lib/components/icons/Lightning.svelte'
import { mediaSettings } from '$lib/stores/mediasettings'
import Tooltip from "$lib/components/popups/Tooltip.svelte"

const dispatch = createEventDispatcher()
let contact
let active_contact
let avatar
let calltype
let startTone = new Audio('/audio/startcall.mp3')
let endTone = new Audio('/audio/endcall.mp3')
let thisCall = false
let video = false
let videoInput

$: if ($mediaSettings.devices.length) {
    videoInput = $mediaSettings.devices.some((a) => a.kind == 'videoinput')
}

$: {
    if ($user.activeChat) {
        active_contact = $user.activeChat
        contact = $user.activeChat.chat + $user.activeChat.key
        avatar = get_avatar(active_contact.chat)
    } else {
        $user.activeChat = $user.contacts[0]
        active_contact = $user.activeChat
    }
}

//This chat
$: thisChat = $user.activeChat

//Beam reactive button states
$: activeBeam = $beam.active.some(a => a.chat === thisChat.chat)
$: connectedBeam = $beam.active.some(a => a.chat === thisChat.chat && a.connected === true)

//Starts any call
const startCall = async (contact, calltype) => {
    console.log(contact, calltype)
    if (!videoInput && calltype) {
        window.api.errorMessage('You have no video device')
        return
    }
    if ($webRTC.call.length >= 1) {
        $webRTC.initiator = true
    }

    if ($swarm.voice_channel.length) window.api.exitVoiceChannel()

    $webRTC.invited = false

    if (calltype) {
        video = true
        $videoGrid.showVideoGrid = true
    }

    startTone.play()
    let call = {
        msg: 'outgoing',
        out: true,
        chat: contact.substring(0, 99),
        video: calltype,
    }
    
    //Leave any active room
    window.api.send("exit-voice", $groups.thisGroup.key)
    window.api.send("end-swarm", $groups.thisGroup.key)
    $swarm.showVideoGrid = false

    $webRTC.call.unshift(call)
    window.api.startCall(contact, calltype)
    dispatch('startCall')

    console.log('call active', $webRTC.call)
}
//Print chosen board. SQL query to backend and then set result in Svelte store, then updates thisBoard.
const printBoard = async (board) => {
    console.log('Printing Board', board)
    dispatch('printBoard', {
        board: board,
    })
}

const openAdd = () => {
    boards.update((data) => {
        return {
            ...data,
            addBoard: true,
        }
    })
}


const endCall = () => {
    //We delay the answerCall for routing purposes
    window.api.endCall('peer', 'stream', active_contact.chat)
    //We pause the ringtone and destroy the popup
    endTone.play()
}

$: if ($webRTC.call.length) {
    thisCall = $webRTC.call.some((a) => a.chat === active_contact.chat)
} else {
    thisCall = false
}

$: if (thisCall) {
    let active_video = $webRTC.call.find((a) => a.chat === active_contact.chat)
    if (active_video.video) {
        video = true
    } else {
        video = false
    }
}

const sendMoney = () => {
    $transactions.tip = true
    $transactions.send = {
        to: $user.activeChat.chat,
        name: $user.activeChat.name,
    }
}

let muted = false

const toggleAudio = () => {
    $webRTC.audio = !$webRTC.audio
    $webRTC.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = !track.enabled))
    })
}

function copyThis(copy) {
    let msg = 'You copied a key'
    let name = 'Copy'
    let key = copy
    console.log('copy?', copy)
    if (copy.length > 64) {
        //Notification
        msg = 'You copied a Hugin address'
        name = $user.activeChat.name
        //Avatar in notification
        key = $user.activeChat.chat
    }

    window.api.successMessage(msg)
    navigator.clipboard.writeText(copy)
}


function newBeam() {
    window.api.createBeam($user.activeChat.chat + $user.activeChat.key)
    $beam.active.push({
      chat: $user.activeChat.chat,
      connected: false,
      key: undefined,
    })
    $beam.active = $beam.active
}

let incoming_file = false
let shared_files = false

$: if ($remoteFiles.some(a => a.chat === $user.activeChat.chat)) {
    incoming_file = true
} else {
    incoming_file = false
}

$: if ($localFiles.some(a => a.chat === $user.activeChat.chat)) {
    shared_files = true
} else {
    shared_files = false
}



</script>

<div class="rightMenu" class:hide="{$videoGrid.showVideoGrid && $webRTC.call.length || $page.url.pathname === '/groups' || $page.url.pathname === '/rooms'}">
    {#if $page.url.pathname === '/boards'}
        <div class="nav" style="display:block !important;">
            <div class="add" on:click="{openAdd}">
                <SimpleAdd />
            </div>
            <div class="boards">
                {#each $boards.boardsArray as board}
                    {#await get_board_icon(board) then board_color}
                        <div style="display: flex; align-items: center; position: relative;">
                            <div
                                class="board"
                                style="background-color: rgb({board_color.red}, {board_color.green},{board_color.blue})"
                            >
                                {#if board === 'Home'}
                                    <button class="board-icon" on:click="{() => printBoard(board)}">
                                        <HomeIcon />
                                    </button>
                                {:else}
                                    <button class="board-icon" on:click="{() => printBoard(board)}"
                                        >{board.substring(0, 1).toUpperCase()}</button
                                    >
                                {/if}
                            </div>
                            {#if board === $boards.thisBoard}
                                <div class="dot" in:fade></div>
                            {/if}
                        </div>
                    {:catch error}
                        <div>{error.message}</div>
                    {/await}
                {/each}
            </div>
        </div>
    {/if}

    {#if $page.url.pathname === '/messages'}
        <div class="nav">
            <img
                class="avatar"
                src="data:image/png;base64,{avatar}"
                alt=""
                on:click="{() => copyThis($user.activeChat.chat + $user.activeChat.key)}"
            />
            <Tooltip title="P2P Chat" leftAlign={true}>
                <div class="button" on:click={() => {
                    if (connectedBeam || activeBeam) {
                        window.api.send('end-beam', $user.activeChat.chat)
                    }   else newBeam()}
                    }>
                
                    <Lightning connected={connectedBeam} connecting={activeBeam} />
                </div>
            </Tooltip>
            {#if connectedBeam}
            
                <button class="button">
                    {#if thisCall && !video}
                        <CallSlash on:click="{() => endCall()}"/>
                    {:else}
                    <Tooltip title="Audio call" leftAlign={true}>
                        <CallIcon on:click="{() => startCall(contact, false)}"/>
                    </Tooltip>
                    {/if}
                </button>
            
                
                    <button class="button">
                        {#if thisCall && video}
                            <VideoSlash on:click="{() => endCall()}"/>
                        {:else if !thisCall}
                        <Tooltip title="Video call" leftAlign={true}>
                            <VideoIcon menu="{true}" on:click="{() => startCall(contact, true)}"/>
                        </Tooltip>
                        {/if}
                    </button>
            {/if}

            {#if $page.url.pathname === '/messages'}
            <Tooltip title="Send XKR" leftAlign={true}>
                <div on:click="{() => sendMoney(contact)}" class="button">
                    <PayIcon />
                </div>
            </Tooltip>
            {/if}

            {#if thisCall}
                <div class="button" on:click="{toggleAudio}">
                    {#if !muted}
                        <MicIcon />
                    {:else}
                        <MuteIcon />
                    {/if}
                </div>
            {/if}

            <!-- {#if incoming_file}
            <div class="button" on:click="{() => console.log('LoL!')}">
                    <Lightning connected={true} />
            </div>
            {/if} -->

             <!-- {#if shared_files }
             <div class="button" on:click="{() => $fileSettings.showFiles = !$fileSettings.showFiles}">
                     <Lightning connected={true} />
             </div>
              {/if} -->

        </div>
        <div class="draggable"></div>
    {/if}

    {#if $page.url.pathname === '/groups'}
        <div class="nav" style="height: 100%">
            <div class="nav">
                <img
                    class="avatar"
                    src="data:image/png;base64,{get_avatar($groups.thisGroup.key)}"
                    alt=""
                />
                <button class="button">
                    <Lock on:copy="{() => copyThis($groups.thisGroup.key)}" />
                </button>
                <button class="button">
                    <ListButton
                        on:click="{() =>
                            ($layoutState.showActiveList = !$layoutState.showActiveList)}"
                    />
                </button>
            </div>
            <div class="draggable hitbox"></div>
        </div>
    {/if}
</div>

<style lang="scss">
.rightMenu {
    width: 85px;
    height: 100%;
    border-left: 1px solid var(--border-color);
    padding-bottom: 1.5em;
    padding-top: 1em;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: fixed;
    right: 0;
    z-index: 100;
}

.rightMenu::-webkit-scrollbar {
    display: none;
}

.hitbox {
    height: 100%;
    width: 85px;
}

.nav {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: 0.5rem;
}

.boards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    height: calc(100% - 35px);
    overflow-y: scroll;
    padding-bottom: 1rem;

    &::-webkit-scrollbar {
        display: none;
    }
}

.add {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 38px;
    width: 38px;
    border-radius: 100%;
    background-color: rgba(255, 255, 255, 0.22);
    transition: 250ms ease-in-out;
    cursor: pointer;
    margin-bottom: 15px;
    margin-top: 5px;
    margin-left: 3px;

    &:hover {
        background-color: rgba(255, 255, 255, 0.4);
    }
}

.board-icon {
    border: none;
    background: none;
    color: #f2f2f2;
    font-size: 22px;
    font-family: 'Montserrat', sans-serif;
    cursor: pointer;
    border-radius: 15px;
    width: 44px;
    height: 44px;

    &:hover {
        opacity: 1;
        color: white;
    }
}

.caller_menu {
    margin-top: 25%;
    background: rgba(255, 255, 255, 0.4);
    color: black;
}

.button {
    width: 40px;
    height: 40px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 5px;
    border-radius: 5px;
    transition: 250ms ease-in-out;
    background-color: transparent;
    cursor: pointer;
    border: none;

    &:hover,
    :hover > .icon {
        background-color: rgba(255, 255, 255, 0.4);
        background-color: #313131;
        opacity: 100%;
    }
}

.icon {
    opacity: 80%;
    transition: 250ms ease-in-out;
}

.avatar {
    margin-top: 0px;
    height: 55px;
    margin-bottom: 5px;
    cursor: pointer;
}

.board {
    position: relative;
    border-radius: 11px;
    opacity: 0.88;

    &:hover {
        opacity: 1;
    }
}

.dot {
    position: absolute;
    background-color: white;
    border-radius: 2px;
    height: 16px;
    width: 10px;
    right: -7px;
    box-shadow: 0 0 10px white;
}

.hide {
    display: none !important;
}

.shiny {
    box-shadow: 0 0 10px white;
    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0) 1%, rgba(255, 255, 255, 0.2) 9%, rgba(255, 255, 255, 0) 100%);
}
</style>
