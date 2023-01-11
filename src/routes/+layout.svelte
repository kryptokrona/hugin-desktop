<script>
    //Global CSS
    import '$lib/theme/global.scss'

    //Import window apis
    import '$lib/window-api/notifications.js'
    import '$lib/window-api/node.js'

    //Stores
    import {boards, groups, notify, user, webRTC, messageWallet, beam} from '$lib/stores/user.js'
    import {remoteFiles, localFiles} from '$lib/stores/files.js'
    import {messages} from '$lib/stores/messages.js'

    import {onMount} from 'svelte'
    import LeftMenu from '$lib/components/navbar/LeftMenu.svelte'
    import RightMenu from '$lib/components/navbar/RightMenu.svelte'
    import IncomingCall from '$lib/components/webrtc/IncomingCall.svelte'
    import Webrtc from '$lib/components/webrtc/Calls.svelte'
    import TrafficLights from '$lib/components/TrafficLights.svelte'
    import CallerMenu from '$lib/components/webrtc/CallerMenu.svelte'
    import PeerAudio from '$lib/components/webrtc/PeerAudio.svelte'
    import VideoGrid from '$lib/components/webrtc/VideoGrid.svelte'
    import {page} from '$app/stores'
    import Notification from '$lib/components/popups/Notification.svelte'
    import toast, {Toaster} from "svelte-french-toast";
    import {appUpdateState} from "$lib/components/updater/update-store.js";
    import Updater from "$lib/components/updater/Updater.svelte";
    import OptimizeToast from '$lib/components/custom-toasts/OptimizeToast.svelte'


    let ready = false
    let myVideo = false
    let peerVideo = true
    let incoming_call
    let showCallerMenu = false
    let new_messages = false
    let board_message_sound
    let errors = []
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

    let startAnimation
    onMount(async () => {
        ready = true
        startAnimation = true
        setTimeout(() => {
            startAnimation = false
        }, 1001)



        window.process = {
            ...window.process,
            env: {DEBUG: undefined},
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
        })

    })

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


        window.api.receive('rec-off', (data) => {
            //This is for logging SDP for calls, to look for bugs etc during parse and expand phase
            console.log('Reconstructed offer expanded, testdata:', data)
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
            if (data.address == $user.huginAddress.substring(0, 99)) return
            if (data.group === $groups.thisGroup.key && $page.url.pathname === '/groups') return
            if ($page.url.pathname !== '/groups') {
                data.type = 'group'
                $notify.unread.push(data)
                $notify.unread = $notify.unread
            }
            new_messages = true
            data.key = data.address
            board_message_sound.play()
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


        const saveToStore = (data) => {
            messages.update((current) => {
                return [...current, data]
            })
        }

        window.api.receive('endCall', async (data) => {
            console.log('endcall in layout', data)
            endThisCall()
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

    function removeErrors(e) {

        if ($notify.success.some((a) => a.hash === e.detail.hash)) {
            let filterArr = $notify.success.filter((a) => a.hash !== e.detail.hash)
            $notify.success = filterArr
            return
        }

        let filterArr = $notify.errors.filter((a) => a.hash !== e.detail.hash)
        $notify.errors = filterArr
    }

    function removeNotification(e) {
        let filterArr = $notify.new.filter((a) => a.hash !== e.detail.hash)
        $notify.new = filterArr
    }

    $: errors = $notify.errors

    //APP UPDATER
    window.api.receive('updater', (data) => {
        data = data.toString()

        switch (data) {
            case 'checking':
                //Do something
                break
            case 'available':
                $appUpdateState.step = 1
                $appUpdateState.openPopup = true
                $appUpdateState.updateAvailable = true
                break
            case 'not-available':
                if($page.url.pathname === '/settings') {
                    $appUpdateState.step = 4
                    $appUpdateState.openPopup = true
                }
                break
            case 'downloaded':
                $appUpdateState.openPopup = true
                $appUpdateState.step = 3
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

    window.api.receive('optimized', (data) => {
        if (!data) {
            toast.error(OptimizeToast, {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            })
        }
        $messageWallet.optimized = data
    })

    window.api.receive('update-blocklist', (block_list) => {
        $groups.blockList = block_list
    })

    window.api.receive('new-beam', async (beamData) => {
        toast.success(`New beam activated`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

    window.api.receive('beam-connected', (data)  => {
        let [address, key] = data
		let update = $beam.active.map(a => {
			if (a.chat == address) {
				a.connected = true
                a.key = key
			}
			return a
		})
        toast.success(`Beam connection established`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })

		console.log('Updated', update)
		$beam.active = update
	})
    window.api.receive('login-success', ()  => {
        $user.loggedIn = true
    })

    window.api.receive('stop-beam', (addr)  => {
        let filter = $beam.active.filter(a => a.chat !== addr)
        $beam.active = filter
        console.log('active beams', $beam.active)
        toast.error('Beam disconnected', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            })
    })

    window.api.receive('download-request', (data)  => { 
        console.log(
            'Download request', data
        )
    })

    window.api.receive('remote-files', (data)  => {
        let from = $user.contacts.find(a => a.chat === data[0].chat)
        let file = data
        console.log(
            'Remote Files', file
        )
        $remoteFiles = data
        console.log('remote files pushed', $remoteFiles)
        $remoteFiles = $remoteFiles
        console.log('remote files agen', $remoteFiles)
        toast.success(`New file incoming from ${from.name}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

    window.api.receive('local-files', (data)  => { 
        console.log(
            'Local files', data
        )
        $localFiles = data
        toast.success(`Uploading file ${data.fileName}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

    window.api.receive('downloading', (data)  => { 
        console.log(
            'Downloading', data
        )
    })

    window.api.receive('download-file-progress', (data)  => { 
        console.log(
            'Progress', data
        )
    })

    window.api.receive('upload-file-progress', (data)  => { 
        console.log(
            'Progress', data
        )
    })



</script>

<TrafficLights/>
<Toaster/>

{#if ready}

    {#if startAnimation}
        <div class="shine"></div>
    {/if}

    {#if ($user.loggedIn && $webRTC.call.length != 0) || $webRTC.incoming.length != 0}
        <VideoGrid/>

        <CallerMenu
                on:click="{endThisCall}"
                on:endCall="{endThisCall}"
                paused="{!showCallerMenu}"
        />

        {#each $webRTC.call as thiscall}
            {#if $webRTC.call.some((a) => a.peerAudio === true)}
                <PeerAudio audioCall="{thiscall}"/>
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
                <Notification on:hide="{removeNotification}" message="{notif}" error="{false}"/>
            {/each}
        </div>
    {/if}

    {#if $notify.errors.length > 0 && $user.loggedIn}
        <div class="notifs">
            {#each errors as error}
                <Notification message="{error}" error="{true}" on:hide="{removeErrors}"/>
            {/each}
        </div>
    {/if}

    {#if $user.loggedIn && $notify.new.length > 0 && new_messages}
        <div class="notifs">
            {#each $notify.new as notif}
                <Notification on:hide="{removeNotification}" message="{notif}" error="{false}"/>
            {/each}
        </div>
    {/if}

    {#if $notify.success.length > 0 && $user.loggedIn}
        <div class="notifs">
            {#each $notify.success as success}
                <Notification message="{success}" success="{true}" on:hide="{removeErrors}"/>
            {/each}
        </div>
    {/if}

    {#if $user.loggedIn}
        <LeftMenu/>
        {#if $page.url.pathname !== '/boards' && $page.url.pathname !== '/dashboard'}
            <RightMenu/>
        {/if}
        <Webrtc/>
    {/if}

    {#if $appUpdateState.openPopup}
        <Updater/>
    {/if}

    <slot/>
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
