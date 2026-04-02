<script>
import {fade, fly} from 'svelte/transition'
import { t } from '$lib/utils/translation.js'
import {groups, swarm, user, notify, rooms} from '$lib/stores/user.js'
import {get_avatar, getColorFromHash} from '$lib/utils/hugin-utils.js'
import {layoutState, swarmGroups} from '$lib/stores/layout-state.js'
import { isLatin, sleep } from '$lib/utils/utils'
import Groupcall from '$lib/components/icons/Groupcall.svelte'
import VoiceUser from '$lib/components/chat/VoiceUser.svelte'
import { videoSettings } from '$lib/stores/mediasettings'
import BanInfo from './BanInfo.svelte'
import FriendRequestPrompt from './FriendRequestPrompt.svelte'
import { roomMessages } from '$lib/stores/roommsgs'
import { peers } from '$lib/stores/swarm-state.svelte.js'
const startTone = new Audio('/audio/startcall.mp3')

let roomName
let asian = false
let firstConnect = false
let loading = false
let in_voice = $derived((peers.activeSwarm?.voice_channel || new Map()).has($user.myAddress))
let admin = $derived(!!peers.activeSwarm?.admin)
let showUserInfo = false
let userInfo = {}
let requestUser = $state(null)
const myAddress = $derived($user.myAddress)
const me = $derived({ address: $user.myAddress, name: $user.username })
let room = $derived(peers.activeRoomKey || $rooms.thisRoom?.key || '')
let thisSwarm = $derived(peers.activeSwarm || false)
let voice_channel = $derived(peers.activeVoiceUsers)
let knownUsers = $derived.by(() => {
    const roomKey = peers.activeRoomKey
    const knownByRoom = peers.knownUsersByRoom
    const active = roomKey ? peers.swarms.find((s) => s.key === roomKey) : null
    const connected = (active?.connections ?? []).map((u) => ({
        address: u.address,
        room: roomKey,
        name: u.name || 'Anon'
    }))
    const merged = normalizeUsers([...connected, ...(knownByRoom[roomKey] ?? [])])
    const seen = new Set()
    const result = []
    if (me.address) {
        seen.add(me.address)
        result.push(me)
    }
    for (const u of merged) {
        if (!u?.address || seen.has(u.address)) continue
        seen.add(u.address)
        result.push(u)
    }
    return result
})

const normalizeUsers = (users) => {
    const seen = new Set()
    return (users || []).filter((u) => {
        if (!u?.address || seen.has(u.address)) return false
        seen.add(u.address)
        return true
    }).map((u) => ({
        address: u.address,
        room: u.room,
        name: u.name || u.nickname || 'Anon'
    }))
}

const refreshKnownUsers = async (roomKey = room) => {
    if (!roomKey) return
    const users = await window.api.getRoomUsers(roomKey)
    if (!Array.isArray(users)) return
    const normalized = normalizeUsers(users)
    if (normalized.length === 0 && peers.activeKnownUsers.length > 0) return
    peers.setRoomUsers(roomKey, normalized)
}

function openRequest(user) {
    if (user.address === myAddress) return
    requestUser = user
}

function sendFriendRequest() {
    if (!requestUser || !room) return
    window.api.sendFriendRequest(requestUser.address, room)
    requestUser = null
}

function closeRequest() {
    requestUser = null
}


const join_voice_channel = async (video = false, screen) => {
        loading = true
        if (in_voice) {
            disconnect_from_active_voice()
            loading = false
            return
        }
        if (!thisSwarm) return
        if (thisSwarm.voice_channel.size > 9) {
            window.api.errorMessage(t('tooManyInCall'))
            loading = false
            return
        }
        console.log("Joining!")
        if ($swarm.voice_channel.size) {
            console.log("Still in voice")
            window.api.errorMessage(t('alreadyInVoiceChannel'))
            return
        }
        startTone.play()
        await sleep(50)
        console.log("Want to Join new voice")
        const address = $user.myAddress
        const vc = new Map(thisSwarm.voice_channel || new Map())
        vc.set(address, {address, name: $user.username, key: thisSwarm.key })
        // Reassign Map to trigger Svelte 5 reactivity (Maps aren't deep-proxied)
        const swm = peers.getSwarm(thisSwarm.key)
        if (swm) swm.voice_channel = vc
        $swarm.voice_channel = vc
        $swarm.voice = thisSwarm
        window.api.send("join-voice", {key: thisSwarm.key, video: $videoSettings.myVideo, videoMute: !$videoSettings.myVideo, audioMute: !$swarm.audio, screenshare: $videoSettings.screenshare})
        $swarm = $swarm
        loading = false
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }

    function disconnect_from_active_voice() {
        window.api.exitVoiceChannel()
        peers.leaveVoice($user.myAddress)
        $swarm.voice_channel = new Map()
        $swarm.voice = false
        $swarm = $swarm
    }
    
    const isOnline = (usr) => {
       return usr.address === $user.myAddress || peers.isOnlineInRoom(usr.address)
    }
    
    const check_avatar = (address) => {
       const found = $rooms.avatars.find(a => a.address === address)
       if (found) return found.avatar
       else return false
    }

$effect(() => {
    const activeKey = peers.activeRoomKey
    $roomMessages.length
    if (!activeKey) return
    refreshKnownUsers(activeKey)
})

</script>

{#if $rooms.showBanInfo}
    <BanInfo onClose={() => $rooms.showBanInfo = false}/>
{/if}

<div class="wrapper" out:fly|global="{{ x: 100 }}" class:hide="{$layoutState.hideGroupList}">

        <div class="list-wrapper">

            <div class="voice" style="cursor: pointer;border-bottom: 1px solid var(--border-color);">
                <div class="voice-list" class:voice-active={voice_channel.length > 0} onclick={join_voice_channel}>
                
                    <p style="margin-top: 0px;margin-right: 5px;font-family: Montserrat;font-weight: 700;margin-bottom: -4px;">{t('voiceChannel')}</p>
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
                <p style="font-family: Montserrat; font-weight: 700">{t('users')} ({knownUsers.length})</p>
            </div>

            
            
            {#each knownUsers as user (user.address)}    
            
                    <div in:fade|global class="card" class:offline={!isOnline(user)} onclick={() => openRequest(user)}>
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

{#if requestUser}
    <FriendRequestPrompt user={requestUser} onSend={sendFriendRequest} on:click={closeRequest} />
{/if}

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
    background-color: #3fd782;
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
    transition: color 300ms ease;

    &:hover {
        background-color: var(--border-border);
    }
}

.voice-active {
    color: #3fd782;

    :global(svg) {
        color: #3fd782;
        fill: #3fd782;
    }

    animation: voice-pulse 2s ease-in-out infinite;
}

@keyframes voice-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
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

.ctx-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 9998;
}

.ctx-menu {
    position: fixed;
    z-index: 9999;
    background: var(--card-color, #1a1a2e);
    border: 1px solid var(--border-color, rgba(255,255,255,0.12));
    border-radius: 6px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    min-width: 140px;
    padding: 4px 0;
}

.ctx-item {
    padding: 8px 16px;
    font-size: 13px;
    font-family: 'Montserrat';
    color: var(--text-color, #eee);
    cursor: pointer;
    transition: background 120ms;

    &:hover {
        background: rgba(255,255,255,0.08);
    }
}

</style>