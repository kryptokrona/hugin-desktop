<script>
    //Global CSS
    import '$lib/theme/global.scss'

    //Import window apis
    import '$lib/window-api/notifications.js'
    import '$lib/window-api/node.js'

    //Stores
    import {boards, groups, notify, user, webRTC, messageWallet, beam, misc, swarm} from '$lib/stores/user.js'
    import StoreFunctions from '$lib/stores/storeFunctions.svelte'
    import {remoteFiles, localFiles, upload, download} from '$lib/stores/files.js'
    import {messages} from '$lib/stores/messages.js'
    import { mediaSettings } from '$lib/stores/mediasettings'
    import {onMount} from 'svelte'
    import LeftMenu from '$lib/components/navbar/LeftMenu.svelte'
    import RightMenu from '$lib/components/navbar/RightMenu.svelte'
    import IncomingCall from '$lib/components/webrtc/IncomingCall.svelte'
    import Webrtc from '$lib/components/webrtc/Calls.svelte'
    import Group_Webrtc from '/src/routes/groups/components/VoiceChannel.svelte'
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
    import UploadToast from '$lib/components/custom-toasts/UploadToast.svelte'
    import DownloadToast from '$lib/components/custom-toasts/DownloadToast.svelte'
    import { sleep } from '$lib/utils/utils'
    import Conference from '/src/routes/groups/components/Conference.svelte'
    import ConferenceFloater from '/src/routes/groups/components/ConferenceFloater.svelte'
    import Rooms from '/src/routes/groups/components/Rooms.svelte'
    import { goto } from '$app/navigation'

    let ready = false
    let incoming_call
    let showCallerMenu = false
    let new_messages = false
    let board_message_sound
    let new_message_sound

    document.addEventListener('contextmenu', event => event.preventDefault());

    const closePopup = () => {
        incoming_call = false
    }

    const endThisCall = () => {
        showCallerMenu = false
    }

    const answerIncomingCall = (call) => {
        $webRTC.call.unshift(call)
        let filter = $webRTC.incoming.filter((a) => a.chat !== call.chat)
        $webRTC.incoming = filter
        showCallerMenu = true
        incoming_call = false
        console.log('incoming clean', $webRTC.incoming)
        console.log('webRTC call ', $webRTC.call)
        window.api.send("exit-voice",$groups.thisGroup.key)
        window.api.send("end-swarm", $groups.thisGroup.key)
        $swarm.showVideoGrid = false
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


    })

    window.api.receive("sync", (state) => {
        if (state === "Synced") $misc.syncedStatus = true
        if (state === "Syncing") $misc.syncedStatus = false
        if (state === "Not syncing") $misc.syncedStatus = false 
    })



        //Handle incoming call
        window.api.receive('call-incoming', async (data) => {
            let msg = data.msg
            let chat = data.sender
            let group = data.group
            let timestamp = data.timestamp
            console.log('Incoming call', data)
            await sleep(500)
            let incoming = $user.contacts.find((a) => a.chat === chat)
            //Missed call
            if (Date.now() - timestamp >= 1000 * 360) {
                    toast.success(`Missed call from ${incoming.name}`, {
                    position: 'top-right',
                    style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
                })
             return
            }
            incoming_call = true

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
            $webRTC.groupCall = data.invite_key
            if ($webRTC.groupCall && data.group.invite.length) {
                //This is the first peer invited to a call
                $webRTC.invited = true
            }
        })


        window.api.receive('rec-off', (data) => {
            //This is for logging SDP for calls, to look for bugs etc during parse and expand phase
            console.log('Reconstructed offer expanded, testdata:', data)
        })

        window.api.receive('switch-node', (data) => {
           $misc.node = data
           window.api.successMessage(`You are connected to ${data.node}`)
        })


        window.api.receive('newGroupMessage', ([data, add = false]) => {
            const thisgroup = data.group === $groups.thisGroup.key
            if (data.address == $user.myAddress) return
            if (thisgroup && $page.url.pathname === '/groups' && $swarm.showVideoGrid && data.channel === "Chat room") return
            if (thisgroup && $page.url.pathname === '/groups' && data.channel !== "Chat room" && $misc.focus) return
            new_messages = true
            data.key = data.address
            
            //Future notifications page
            $notify.notifications.push(data)

            if ($notify.new.length < 2 && !$notify.que && !add) {
                board_message_sound.play()
                $notify.new.push(data)
            }
            if (!$misc.focus && thisgroup) return
            if (add) return
            data.type = "group"
            $notify.unread.push(data)
            $notify.new = $notify.new
        })

        window.api.receive('privateMsg', (data) => {
            //If active chat, focused and in message page, return
            if (
            data.chat === $user.activeChat.chat 
            && $misc.focus
            && $page.url.pathname === '/messages'
            ) {
            saveToStore(data)  
            return
            }
            
            //If address is our own, maybe sent from mobile
            if (data.chat === $user.myAddress) return
            
            //Convert message to notification
            const contact = $user.contacts.find((a) => a.chat === data.chat)
            data.name = contact.name
            data.message = data.msg
            data.type = 'message'
            new_message_sound.play()
            saveToStore(data)

            //If we are active in the chat, but minimized.
            if (
                data.chat === $user.activeChat.chat 
                && !$misc.focus 
                && $page.url.pathname === '/messages'
            )
            return

            new_messages = true
            $notify.unread.push(data)
            $notify.new.push(data)
            $notify.unread = $notify.unread
            console.log('unread', $notify.unread)
        })

        window.api.receive('addr', (huginAddr) => {
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

        window.api.receive('screen-share-sources', async (data) => {
            $mediaSettings.screenSources = data
        })

        window.api.receive('group_invited_contact', (data) => {
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

            window.api.successMessage('A new friend was invited to call')
            $webRTC.joining = data.key
        })


    function removeNotification(e) {
        let filter = $notify.new.filter(a => a.hash !== e.detail.hash)
        $notify.new = filter
    }

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

    window.api.receive('remote-file-added', (data)  => {
        console.log('Remote file added', data)
        let from = $user.contacts.find(a => a.chat === data.chat)
        let newFile = data.remoteFiles[0]
        let incomingFile = {
            chat: data.chat,
            file: [newFile],
            timestamp: newFile.time,
            msg: `Incoming file: ${newFile.fileName}`,
            sent: false,
            beam: true
        }
        saveToStore(incomingFile)
        $remoteFiles = data.remoteFiles
        toast.success(`New file shared by ${from.name}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

    window.api.receive('group-remote-file-added', (data)  => {
        console.log("Group file!")
        $remoteFiles = data.remoteFiles
        const file = data.remoteFiles[0]
        console.log("File shared", file)
        toast.success(`${file.fileName} shared in room`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    }) 

    window.api.receive('remote-files', (data)  => {
        let from = $user.contacts.find(a => a.chat === data.chat)
        $remoteFiles = data.remoteFiles
    })

    window.api.receive('local-files', (data)  => { 
        console.log(
            'Local files n data', data
        )
        $localFiles = data.localFiles
        console.log('lcocalfiles', $localFiles)
    })

    window.api.receive('uploading', (data)  => { 
        setUploadStatus(data)
    })

    window.api.receive('downloading', (data)  => {
        setDownloadStatus(data)
    })

    window.api.receive('download-file-progress', (data)  => { 
        updateDownloadProgress(data)
    })

    window.api.receive('upload-file-progress', (data)  => { 
        updateUploadProgress(data)
    })

    window.api.receive('incoming-que', (data)  => { 
        $notify.que = data
    })

    window.api.receive('idle', (data) => {
        $user.idleTime = data
    })
    
    window.api.receive('focus', (data) => {
        $misc.focus = true
    })
    
    window.api.receive('blur', (data) => {
        $misc.focus = false
    })

    $: if ($user.idleTime >= $user.idleLimit) {
        if ($webRTC.call.length === 0 && !$swarm.active.some(a => a.voice_connected) && !$beam.active.length) {
        $user.loggedIn = false
        goto('/login');
        }
    }

    window.api.receive('checked', (data)  => { 
        console.log("Got p2p data", data)
        if (data) {
            toast.success(`P2P connection esablished`, {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            })
            return
        }

        toast.error('P2P connection failed', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
         })
        
    })

    const updateUploadProgress = (data) => {
        const thisAddr = data.chat
        const thisFile = data.fileName
        $upload.some(a => { 
            if (a.chat === thisAddr && a.fileName === thisFile && a.time === data.time) 
            {
                a.progress = data.progress
            }
        })
        $upload = $upload
    }

    const updateDownloadProgress = (data) => {
        const thisAddr = data.chat
        const thisFile = data.fileName
        $download.some(a => { 
            if (a.chat === thisAddr && a.fileName === thisFile) 
            {
                a.path = data.path
                a.progress = data.progress
            }
        })

        $download = $download

        if (data.progress === 100) {
            toast.success(`${thisFile} finished downloading`, {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            })
        }
    }

    const setDownloadStatus = (data) => {
        let file = $remoteFiles.find(a => a.fileName === data.fileName && a.chat === data.chat)
        file.progress = 0
        $download.unshift(file)
        $download =  $download
        console.log('Download store', $download)
        toast(DownloadToast, {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
                duration: 1000 * 18000,
                file: data.fileName,
                chat: data.chat,
                time: file.time
        })
    }

    const setUploadStatus = (data) => {
        let file = $localFiles.find(a => a.fileName === data.fileName && a.chat === data.chat && data.time === a.time)
        file.progress = 0
        $upload.unshift(file)
        $upload =  $upload
        console.log('Upload store', $upload)
        toast(UploadToast, {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
                duration: 1000 * 18000,
                file: data.fileName,
                chat: data.chat,
                time: file.time
        })
    }
    
    



</script>
<main>
<TrafficLights/>
<Toaster/>

{#if ready}
    <StoreFunctions/>
    {#if startAnimation}
        <div class="shine"></div>
    {/if}

    {#if $swarm.active.length}
            <Conference />
            {#if $swarm.voice_channel.some(a => a.address === $user.myAddress)}
                <ConferenceFloater />
            {/if}
    {/if}
    
    <Rooms />
  

    {#if ($user.loggedIn && $swarm.call.length)}

    {#each $swarm.call as connection}
        {#if $swarm.call.some((a) => a.peerAudio === true)}
            <PeerAudio audioCall="{connection}"/>
        {/if}
    {/each}

    {/if}

    {#if ($user.loggedIn && $webRTC.call.length != 0) || $webRTC.incoming.length != 0}
        <VideoGrid/>
    {#if $webRTC.call.length}
        <CallerMenu
                on:click="{endThisCall}"
                on:endCall="{endThisCall}"
                paused="{!showCallerMenu}"
        />
    {/if}

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
            {#if $notify.new.length < 2 && !$notify.que}
                {#each $notify.new as notif}
                    <Notification on:hide="{removeNotification}" message="{notif}" error="{false}"/>
                {/each}
            {/if}

        </div>
    {/if}


    {#if $user.loggedIn}
        <LeftMenu/>
        {#if $page.url.pathname !== '/boards' && $page.url.pathname !== '/dashboard'}
            <RightMenu/>
        {/if}
    {/if}

    {#if $appUpdateState.openPopup}
        <Updater/>
    {/if}

    <slot/>
{/if}

<Webrtc/>
<Group_Webrtc/>
</main>
<style>

main {
      height: 100vh;
      overflow: hidden;
      z-index: 3;
      width: 100%;
  }
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
