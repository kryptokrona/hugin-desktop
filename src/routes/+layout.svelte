<script>
import { onMount } from 'svelte'
import LeftMenu from '../components/navbar/LeftMenu.svelte'
import RightMenu from '/src/components/navbar/RightMenu.svelte'
import IncomingCall from '/src/components/webrtc/IncomingCall.svelte'
import Webrtc from '/src/components/webrtc/Calls.svelte'
import TrafficLights from '$components/TrafficLights.svelte'
import CallerMenu from '/src/components/webrtc/CallerMenu.svelte'
import PeerAudio from '/src/components/webrtc/PeerAudio.svelte'
import VideoGrid from '$components/webrtc/VideoGrid.svelte'
import Loader from '/src/components/popups/Loader.svelte'
import { page } from '$app/stores'
//Stores
import { boards, groups, misc, notify, user, webRTC } from '$lib/stores/user.js'
import { messages } from '$lib/stores/messages.js'

//Global CSS
import '/src/lib/theme/global.scss'
import Notification from '/src/components/popups/Notification.svelte'
import { appUpdateState } from '$lib/stores/updater-state.js'
import UpdatePopup from '$components/popups/UpdatePopup.svelte'

let ready = false
let myVideo = false
let peerVideo = true
let incoming_call
let showCallerMenu = false
let new_messages = false
let board_message_sound
let errors = []
let loading = false
let new_message_sound
let incomingCalls = []
const closePopup = () => {
    incoming_call = false
}

const endThisCall = () => {
    showCallerMenu = false
    myVideo = false
}

const answerIncomingCall = (call) => {
    $webRTC.call.unshift(call)
    let filter = $webRTC.incoming.filter((a) => a.chat !== call.chat)
    $webRTC.incoming = filter
    showCallerMenu = true
    myVideo = true
    incoming_call = false
    console.log('incoming clean', $webRTC.incoming)
    console.log('webRTC call ', $webRTC.call)
}

onMount(async () => {
    window.process = {
        ...window.process,
        env: { DEBUG: undefined },
        nextTick: function () {
            return null
        },
    }
    board_message_sound = new Audio('/audio/boardmessage.mp3')
    new_message_sound = new Audio('/audio/message.mp3')

    window.api.receive('contacts', async (my_contacts) => {
        console.log('contacts!', my_contacts)
        //Set contacts to store
        $user.contacts = my_contacts

        $user.activeChat = $user.contacts[my_contacts.length - 1]
    })

    ready = true

    //Handle incoming call
    window.api.receive('call-incoming', async (msg, chat, group = false) => {
        console.log('chat', chat)
        let incoming = $user.contacts.find((a) => a.chat === chat)
        console.log('contacts set???', $user.contacts)
        incoming_call = true
        console.log('INCMING CALL')
        console.log('new call', msg, chat)

        let type = 'incoming'
        if ($webRTC.groupCall) {
            type = 'groupinvite'
        }
        $webRTC.incoming.push({
            msg,
            chat,
            type: type,
            name: incoming.name,
        })
        $webRTC.incoming = $webRTC.incoming
    })

    window.api.receive('group-call', (data) => {
        console.log('group call data', data)
        $webRTC.groupCall = data.key
        if ($webRTC.groupCall && data.invite.length) {
            //This is the first peer invited to a call
            $webRTC.invited = true
        }
    })

    //Handle sync status
    window.api.receive('sync', (data) => {
        misc.update((current) => {
            return {
                ...current,
                syncState: data,
            }
        })
    })

    window.api.receive('newBoardMessage', (data) => {
        if (data.board === $boards.thisBoard && $page.url.pathname === '/boards') return
        if ($boards.thisBoard === 'Home') return
        if ($page.url.pathname !== '/boards') {
            data.type = 'board'
            $notify.unread.push(data)
            $notify.unread = $notify.unread
        }
        new_messages = true
        board_message_sound.play()
        $notify.new.push(data)
        console.log('notif', $notify.new)
        $notify.new = $notify.new
    })

    window.api.receive('newGroupMessage', (data) => {
        console.log('data group', data.group)
        if (data.address == $user.huginAddress.substring(0, 99)) return
        if (data.group === $groups.thisGroup.key && $page.url.pathname === '/groups') return
        if ($page.url.pathname !== '/groups') {
            data.type = 'group'
            $notify.unread.push(data)
            $notify.unread = $notify.unread
        }
        new_messages = true
        data.key = data.address
        new_message_sound.play()
        $notify.new.push(data)
        console.log('notif', $notify.new)
        $notify.new = $notify.new
    })

    window.api.receive('privateMsg', async (data) => {
        console.log('newmsg in layout', data)
        if (data.chat !== $user.activeChat.chat) {
            new_message_sound.play()
        }
        if ($page.url.pathname !== '/messages') {
            data.type = 'message'
            $notify.unread.push(data)
            $notify.unread = $notify.unread
            console.log('unread', $notify.unread)
        }
        saveToStore(data)
    })

    window.api.receive('addr', async (huginAddr) => {
        console.log('Addr incoming')
        user.update((data) => {
            return {
                ...data,
                huginAddress: huginAddr,
            }
        })
    })

    window.api.receive('node', async (node) => {
        misc.update((current) => {
            return {
                ...current,
                node: node,
            }
        })
    })

    window.api.receive('node-sync-data', (data) => {
        misc.update((current) => {
            return {
                ...current,
                walletBlockCount: data.walletBlockCount,
                networkBlockCount: data.networkBlockCount,
                localDaemonBlockCount: data.localDaemonBlockCount,
            }
        })
    })

    const saveToStore = (data) => {
        messages.update((current) => {
            return [...current, data]
        })
    }

    window.api.receive('endCall', async (data) => {
        console.log('endcall in layout', data)
        endThisCall()
    })

    window.api.receive('error_msg', async (error) => {
        console.log('Error', error)
        $notify.errors.push(error)
        $notify.errors = $notify.errors
    })

    window.api.receive('sent_tx', async (data) => {
        console.log('sent', data)
        $notify.success.push(data)
        $notify.success = $notify.success
    })

    window.api.receive('group_invited_contact', async (data) => {
        console.log('***** GROUP INVITED ****', data)
        let name
        let key
        if ($user.contacts.some((a) => a.chat == data.substring(0, 99))) {
            let contact = $user.contacts.find((a) => a.chat == data.substring(0, 99))
            name = contact.name
            key = contact.key
        } else {
            //Add prompt to add unknown contact
            name = 'Anon'
            key = data.substring(99, 163)
            //Todo?
            console.log('**** DONT KNOW THIS CONTACT. ADD ?? ****')
        }

        $notify.success.push({
            message: 'Invited to call',
            name: name,
            hash: Date.now(),
            key: key,
            type: 'success',
        })

        $notify.success = $notify.success
        $webRTC.joining = data.key
    })

    $: console.log('Contact joining call ', $webRTC.joining)
})

function removeErrors(e) {
    console.log(' remove this', e)

    if ($notify.success.some((a) => a.hash === e.detail.hash)) {
        let filterArr = $notify.success.filter((a) => a.hash !== e.detail.hash)
        console.log('filtered', filterArr)
        $notify.success = filterArr
        return
    }

    let filterArr = $notify.errors.filter((a) => a.hash !== e.detail.hash)
    console.log('filtered', filterArr)
    $notify.errors = filterArr
}

function removeNotification(e) {
    let filterArr = $notify.new.filter((a) => a.hash !== e.detail.hash)
    console.log('filtered', filterArr)
    $notify.new = filterArr
}

$: loading = $misc.loading

$: errors = $notify.errors

$: console.log('Unread?', $notify.unread)

$: console.log('path', $page.url.pathname)

$: console.log('this gr', $groups.thisGroup)

//APP UPDATER
window.api.receive('updater', (data) => {
    data = data.toString()

    switch (data) {
        case 'checking':
            $appUpdateState.state = 'checking'
            break
        case 'available':
            $appUpdateState.updateAvailable = true
            break
        case 'not-available':
            $appUpdateState.state = 'not-available'
            break
        case 'downloaded':
            $appUpdateState.step = 3
            $appUpdateState.state = 'downloaded'
            break
        default:
        //Do nothing
    }
})

//APP UPDATE PROGRESS
window.api.receive('update-progress', (progress) => {
    $appUpdateState.step = 2
    $appUpdateState.percentageDownloaded = progress.percent
    $appUpdateState.dataDownloaded = progress.transferred
    $appUpdateState.downloadSize = progress.total
    $appUpdateState.downloadSpeed = progress.bytesPerSecond
})
</script>

<TrafficLights />

{#if ready}
    {#if loading}
        <Loader />
    {/if}

    {#if ($user.loggedIn && $webRTC.call.length != 0) || $webRTC.incoming.length != 0}
        <VideoGrid />

        <CallerMenu
            on:click="{endThisCall}"
            on:endCall="{endThisCall}"
            paused="{!showCallerMenu}"
        />

        {#each $webRTC.call as thiscall}
            {#if $webRTC.call.some((a) => a.peerAudio === true)}
                <PeerAudio audioCall="{thiscall}" />
            {/if}
        {/each}

        {#each $webRTC.incoming as call}
            {#if incoming_call}
                <IncomingCall
                    thisCall="{call}"
                    on:click="{closePopup}"
                    on:answerCall="{() => answerIncomingCall(call)}"
                    paused="{!incoming_call}"
                />
            {/if}
        {/each}
    {/if}

    {#if $user.loggedIn && $notify.new.length > 0 && new_messages}
        <div class="notifs">
            {#each $notify.new as notif}
                <Notification on:hide="{removeNotification}" message="{notif}" error="{false}" />
            {/each}
        </div>
    {/if}

    {#if $notify.errors.length > 0 && $user.loggedIn}
        <div class="notifs">
            {#each errors as error}
                <Notification message="{error}" error="{true}" on:hide="{removeErrors}" />
            {/each}
        </div>
    {/if}

    {#if $user.loggedIn && $notify.new.length > 0 && new_messages}
        <div class="notifs">
            {#each $notify.new as notif}
                <Notification on:hide="{removeNotification}" message="{notif}" error="{false}" />
            {/each}
        </div>
    {/if}

    {#if $notify.success.length > 0 && $user.loggedIn}
        <div class="notifs">
            {#each $notify.success as success}
                <Notification message="{success}" success="{true}" on:hide="{removeErrors}" />
            {/each}
        </div>
    {/if}

    {#if $user.loggedIn}
        <LeftMenu />
        {#if $page.url.pathname !== '/boards' && $page.url.pathname !== '/dashboard'}
            <RightMenu />
        {/if}
        <Webrtc />
    {/if}

    {#if $appUpdateState.updateAvailable}
        <UpdatePopup />
    {/if}

    <slot />
{/if}

<style>
.close {
    pointer-events: visible;
}

.wrap :global(strong) {
    font-weight: 600;
}

.notifs {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: absolute;
    top: 20px;
    right: 20px;
    height: 100%;
}
</style>
