<script>
    import { run } from 'svelte/legacy';

import {fade, fly} from 'svelte/transition'
import {groups, swarm, user, notify, rooms} from '$lib/stores/user.js'
import {get_avatar, getColorFromHash} from '$lib/utils/hugin-utils.js'
import {layoutState, swarmGroups} from '$lib/stores/layout-state.js'
import { isLatin, sleep } from '$lib/utils/utils'
import Groupcall from '$lib/components/icons/Groupcall.svelte'
import VoiceUser from '$lib/components/chat/VoiceUser.svelte'
import { videoSettings } from '$lib/stores/mediasettings'
import UserOptions from './UserOptions.svelte'
import BanInfo from './BanInfo.svelte'
	import { roomMessages } from '$lib/stores/roommsgs';
const startTone = new Audio('/audio/startcall.mp3')

let roomName
let asian = false
let firstConnect = false
let loading = false
let in_voice = false
let admin = false
let showUserInfo = false
let userInfo = {}
let showMenu = false
let infoUser = {}
const me = {address: $user.myAddress, name: $user.username }
const myAddress = $user.myAddress
let onlineUsers = []
let thisSwarm = false
let knownUsers = $state($rooms.activeHugins)
let room = $state('')
let voice_channel = $derived(thisSwarm)

//Active hugins

$effect(() => {
    if ($swarm.activeSwarm) thisSwarm = $swarm.activeSwarm
    if (!thisSwarm) return
    admin = thisSwarm.admin
    updateCall()
})

//Set group key
run(() => {
    if ($rooms.thisRoom?.key) {
        room = $rooms.thisRoom.key
    }
    if ($swarm.activeSwarm && thisSwarm)  {
        updateList()
    }

});

const updateCall = () => {
    if (!thisSwarm) return
    in_voice = thisSwarm.voice_channel.some(a => a.address === $user.myAddress)
    voice_channel = thisSwarm.voice_channel
}


const removeDuplicates = (arr) => {
    let uniq = {}
    return arr.filter((obj) => !uniq[obj.address] && (uniq[obj.address] = true))
}

const notIncludes = (a) => {
    return !knownUsers.includes(a.address)
}

const updateList = () => {
    //Adds connected and known users to one array
    onlineUsers = []
    knownUsers = removeDuplicates([...thisSwarm.connections.filter(a => notIncludes(a)),
    ...$rooms.activeHugins]).filter( a => a.address !== myAddress)
    updateOnline()
}

const updateOnline = () => {
     //Updates the online status and checks known users
    onlineUsers = knownUsers.filter(a => thisSwarm.connections.map(b=>b.address).includes(a.address))
    knownUsers.unshift(me)
    knownUsers = removeDuplicates([...onlineUsers.filter(a => notIncludes(a)), ...knownUsers])
}

function showUser(user) {
    // Add friend request/tip/send pm etc here?
    if (!admin || user.address === myAddress) return
    showMenu = true
    infoUser = user
}


const join_voice_channel = async (video = false, screen) => {
        loading = true
        if (in_voice) return
        if (thisSwarm.voice_channel?.length > 9) {
            window.api.errorMessage('There are too many in the call')
            loading = false
            return
        }
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
        await sleep(50)
        console.log("Want to Join new voice")
        thisSwarm.voice_channel.push({address: $user.myAddress, name: $user.username, key: thisSwarm.key })
        $swarm.voice_channel = thisSwarm.voice_channel
        $swarm.voice = thisSwarm
        window.api.send("join-voice", {key: thisSwarm.key, video: $videoSettings.myVideo, videoMute: !$videoSettings.myVideo, audioMute: !$swarm.audio, screenshare: $videoSettings.screenshare})
        //Set to true? here

        $swarm = $swarm
        loading = false
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }

    function disconnect_from_active_voice() {
        window.api.exitVoiceChannel()
    }
    
    const isOnline = (user) => {
       return (thisSwarm && user.address === myAddress) || onlineUsers.some(a => a.address === user.address)
    }
    
    const check_avatar = (address) => {
       const found = $rooms.avatars.find(a => a.address === address)
       if (found) return found.avatar
       else return false
    }

</script>

{#if $rooms.showBanInfo}
    <BanInfo onClose={() => $rooms.showBanInfo = false}/>
{/if}

<div class="wrapper" out:fly|global="{{ x: 100 }}" class:hide="{$layoutState.hideGroupList}">

        <div class="list-wrapper">

            <div class="voice" style="cursor: pointer;border-bottom: 1px solid var(--border-color);">
                <div class="voice-list" onclick={join_voice_channel}>
                
                    <p style="margin-top: 0px;margin-right: 5px;font-family: Montserrat;font-weight: 700;margin-bottom: -4px;">Voice channel</p>
                    <span style="margin-top: 4px"><Groupcall size="{14}" /></span>

                </div>
                    {#each voice_channel as voice (voice.address)}
                        <VoiceUser voice_user={voice} voice_channel={thisSwarm.voice_channel} />
                    {/each}

            </div>

            <div class="user-list" >
            <div style="padding: 10px;
            padding-top: 4px;
            display: flex;
            border-bottom: 1px solid var(--border-color);">
                <p style="font-family: Montserrat; font-weight: 700">Users ({knownUsers.length})</p>
            </div>

            
            
            {#each knownUsers as user}    
            
                    <div in:fade|global class="card" class:offline={!isOnline(user)} onclick={() => showUser(user)}>
                        {#if isOnline(user)}
                            <div class="online"></div>
                        {/if}
                        {#await check_avatar(user.address)}
                        {:then avatar}
                        {#if avatar}
                            <img
                                class="custom-avatar"
                                src="{avatar}"
                                alt=""
                            />
                        {:else}
                        
                            <img
                            class="avatar"
                            src="data:image/png;base64,{get_avatar(user.address)}"
                            alt=""
                            />
                        {/if}
                        {/await}
                        <p class="nickname" style="color: {getColorFromHash(user.address)}">{user.name}</p>
                        <br />
                      
                    </div>
                <!-- {#if showMenu && infoUser?.address !== myAddress && infoUser.address === user.address}
                    <div on:mouseleave="{() => { showMenu = false}}" >
                        <UserOptions on:close={() => showMenu = false} admin={admin} info={infoUser} />
                    </div>
                {/if} -->
            {/each}

          

        </div>
        </div>

</div>

<style lang="scss">
p {
    padding: 5px;
}
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
    font-size: 14px;
    text-overflow: ellipsis;
    display: block;
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
    height: 100%;
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
    color: var(--text-color);
    border-bottom: 1px solid var(--border-color);
    transition: 177ms ease-in-out;
    cursor: pointer;

    &:hover {
        background-color: var(--border-border);
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
    color: var(--title-color);
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
    color: var(--title-color);
    border-bottom: 1px solid var(--border-color);
}

.add {
    font-size: 15px;
    color: var(--title-color);
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

.online {
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
            background-color: var(--border-border);
        }
    }
}

.voice-list {
    text-align: center; padding-bottom: 0; padding: 15.5px 10px 18px 10px; display: flex;
    
    &:hover {
        background-color: var(--border-border);
    }
}

.offline {
    opacity: 0.7 !important;
}

.custom-avatar {
    height: 30px;
    width: 30px;
    border-radius: 10px;
    padding: 5px;
    margin: 1px;
    object-fit: cover;
}

</style>