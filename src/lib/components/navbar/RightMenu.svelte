<script>
   import { run } from 'svelte/legacy';

import { fade } from 'svelte/transition'
import { page } from '$app/stores'
import { boards, groups, transactions, user, webRTC, beam, swarm, rooms } from '$lib/stores/user.js'
import { remoteFiles, localFiles } from '$lib/stores/files.js'
import { get_avatar, get_board_icon } from '$lib/utils/hugin-utils.js'
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
import { mediaSettings, videoSettings } from '$lib/stores/mediasettings'
import Tooltip from "$lib/components/popups/Tooltip.svelte"

let contact = $state()
let active_contact = $state()
let basicAvatar = $state()
let calltype
let startTone = new Audio('/audio/startcall.mp3')
let endTone = new Audio('/audio/endcall.mp3')
let thisCall = false
let video = false
let videoInput = $state()
let thisSwarm = $state(false)
let in_voice = $state(false)
let activeBeam = $derived( $swarm.active.some(a => a.chat === thisChat.chat))



$effect(() => {
   activeBeam = $swarm.active.some(a => a.chat === thisChat.chat)
})

run(() => {
      if ($mediaSettings.devices.length) {
       videoInput = $mediaSettings.devices.some((a) => a.kind == 'videoinput')
   }
   });

run(() => {
    if ($user.activeChat) {
        active_contact = $user.activeChat
        contact = $user.activeChat.chat + $user.activeChat.key
        basicAvatar = get_avatar(active_contact.chat)
    } else {
        $user.activeChat = $user.contacts[0]
        active_contact = $user.activeChat
    }
});

//This chat
let thisChat = $derived($user.activeChat)

//Beam reactive button states

let connectedBeam = $derived($swarm.active.some(a => a.chat === thisChat.chat && a.connections.some(a => a.address === thisChat.chat)))
run(() => {
      if (activeBeam) {
      thisSwarm = $swarm.active.find(a => a.chat === thisChat.chat)
   }
   });

run(() => {
      if (thisSwarm && $swarm.voice_channel.some(a => a.address === $user.myAddress && a.key === thisSwarm.key)) {
       in_voice = true
   } else in_voice = false
   });

//Starts any call
const startCall = async () => {
    join_voice_channel()
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
   window.api.exitVoiceChannel()
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
}

const join_voice_channel = async (video = false, screen) => {
        if (in_voice) return
        console.log("Joining!")
        //Leave any active first
        if ($swarm.voice_channel.length) {
            console.log("Still in voice")
            window.api.errorMessage('You are already in a voice channel')
            return
            disconnect_from_active_voice()
            //We already have an active call.
        }
        startTone.play()
        console.log("Want to Join new voice")
        thisSwarm.voice_channel.push({address: $user.myAddress, name: $user.username, key: thisSwarm.key })
        $swarm.voice_channel = thisSwarm.voice_channel
        window.api.send("join-voice", {key: thisSwarm.key, video: $videoSettings.myVideo, videoMute: !$videoSettings.myVideo, audioMute: !$swarm.audio, screenshare: $videoSettings.screenshare}) 
        $swarm.voice = thisSwarm
        console.log("this swarm ", thisSwarm)
        $swarm.active = $swarm.active
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }


let incoming_file = $state(false)
let shared_files = $state(false)

run(() => {
      if ($remoteFiles.some(a => a.chat === $user.activeChat.chat)) {
       incoming_file = true
   } else {
       incoming_file = false
   }
   });

run(() => {
      if ($localFiles.some(a => a.chat === $user.activeChat.chat)) {
       shared_files = true
   } else {
       shared_files = false
   }
   });

 const check_avatar = (address) => {
        const found = $rooms.avatars.find(a => a.address === address)
        if (found) return found.avatar
        else return false
    }

</script>

<div class="rightMenu" class:hide="{$videoGrid.showVideoGrid || $page.url.pathname === '/groups' || $page.url.pathname === '/rooms'}">
   
    {#if $page.url.pathname === '/messages'}
        <div class="nav">

            {#await check_avatar($user.activeChat.chat)}
            {:then avatar}
            {#if avatar}
                <img
                    in:fade|global="{{ duration: 150 }}"
                    class="avatar custom"
                    src="{avatar}"
                    alt=""
                     onclick={() => copyThis($user.activeChat.chat + $user.activeChat.key)}
                />
            {:else}
            <img
                class="avatar"
                src="data:image/png;base64,{basicAvatar}"
                alt=""
                onclick={() => copyThis($user.activeChat.chat + $user.activeChat.key)}
                />
            {/if}
            {/await}
         
            <Tooltip title="P2P Chat" leftAlign={true}>
                <div class="button" onclick={() => {
                    if (connectedBeam || activeBeam) {
                        window.api.send('end-beam', $user.activeChat.chat)
                    }   else newBeam()}}>
                
                    <Lightning connected={connectedBeam} connecting={activeBeam && !connectedBeam} />
                </div>
            </Tooltip>
            {#if activeBeam}
            
                <button class="button">
                    {#if thisCall && !video}
                        <CallSlash on:click="{() => endCall()}"/>
                    {:else}
                    <Tooltip title="Audio call" leftAlign={true}>
                        <CallIcon active={in_voice} on:click="{() => startCall()}"/>
                    </Tooltip>
                    {/if}
                </button>
            
                
                    <!-- <button class="button">
                        {#if thisCall && video}
                            <VideoSlash on:click="{() => endCall()}"/>
                        {:else if !thisCall}
                        <Tooltip title="Video call" leftAlign={true}>
                            <VideoIcon menu="{true}" on:click="{() => startCall(contact, true)}"/>
                        </Tooltip>
                        {/if}
                    </button> -->
            {/if}

            {#if $page.url.pathname === '/messages'}
            <Tooltip title="Send XKR" leftAlign={true}>
                <div onclick={() => sendMoney(contact)} class="button">
                    <PayIcon />
                </div>
            </Tooltip>
            {/if}

            {#if thisCall}
                <div class="button" onclick={toggleAudio}>
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
         background-color: var(--border-color);
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
    height: 55px;
    width: 55px;
    object-fit: cover;
}

.custom {
    height: 40px;
    border-radius: 5px;
    max-width: 40px;
    margin-top: 10px;
    margin-bottom: 10px;
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
