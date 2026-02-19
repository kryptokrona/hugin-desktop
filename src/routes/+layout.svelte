<script>

      import { run } from 'svelte/legacy';

    //Global CSS
    import '$lib/theme/global.scss'

    //Import window apis
    import '$lib/window-api/notifications.js'
    import '$lib/window-api/node.js'

    //Stores
    import {boards, groups, notify, user, webRTC, messageWallet, beam, misc, swarm, rooms, files, theme, HuginNode, feed, sounds, transactionList} from '$lib/stores/user.js'
    import { themes, generateMonochromaticColorTheme } from '$lib/theme/themes.js'
    import StoreFunctions from '$lib/stores/storeFunctions.svelte'
    import {remoteFiles, localFiles, upload, download} from '$lib/stores/files.js'
    import {messages} from '$lib/stores/messages.js'
    import { mediaSettings } from '$lib/stores/mediasettings'
    import {onMount} from 'svelte'
    import LeftMenu from '$lib/components/navbar/LeftMenu.svelte'
    import RightMenu from '$lib/components/navbar/RightMenu.svelte'
    import VoiceChannel from '../routes/rooms/components/VoiceChannel.svelte'
    import TrafficLights from '$lib/components/TrafficLights.svelte'
    import CallerMenu from '$lib/components/webrtc/CallerMenu.svelte'
    import PeerAudio from '$lib/components/webrtc/PeerAudio.svelte'
    import VideoGrid from '$lib/components/webrtc/VideoGrid.svelte'
    import {page} from '$app/stores'
    import Notification from '$lib/components/popups/Notification.svelte'
    import toast, {Toaster} from "svelte-5-french-toast";
    import {appUpdateState} from "$lib/components/updater/update-store.js";
    import Updater from "$lib/components/updater/Updater.svelte";
    import OptimizeToast from '$lib/components/custom-toasts/OptimizeToast.svelte'
    import UploadToast from '$lib/components/custom-toasts/UploadToast.svelte'
    import DownloadToast from '$lib/components/custom-toasts/DownloadToast.svelte'
    import { sleep } from '$lib/utils/utils'
    import Conference from '../routes/rooms/components/Conference.svelte'
    import ConferenceFloater from '../routes/rooms/components/ConferenceFloater.svelte'
    import Rooms from '../routes/rooms/components/Rooms.svelte'
    import { goto } from '$app/navigation'
    import RoomNotification from '$lib/components/popups/RoomNotification.svelte'
    import { setLanguage } from '$lib/utils/translation.js'
  /** @type {{children?: import('svelte').Snippet}} */
    let { children } = $props();
    let ready = $state(false)
    let incoming_call
    let showCallerMenu = false
    let new_messages = $state(false)
    let board_message_sound
    let new_message_sound
    let x
    let y
    
    const mouseMove = (e) => {
        x = e.pageX
        y = e.pageY
    }
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        window.api.send('right-click', {x, y})
    });


    let startAnimation = $state()

    onMount(async () => {
        // Initialize theme
        const savedThemeName = localStorage.getItem('themeName') || 'aesir';
        const savedMode = localStorage.getItem('themes') || 'dark';
        const customColor = localStorage.getItem('customThemeColor');
        
        // Ensure proper classes and vars are set
        let initialTheme;
        if (savedMode === 'color' && customColor) {
            initialTheme = generateMonochromaticColorTheme(customColor);
        } else {
            initialTheme = themes[savedThemeName] ? themes[savedThemeName][savedMode] : themes['neutral']['dark'];
        }

        const root = document.documentElement;
        
        if (initialTheme) {
             root.style.setProperty('--backgound-color', initialTheme.background);
             root.style.setProperty('--background-color', initialTheme.background);
             root.style.setProperty('--card-background', initialTheme.card);
             root.style.setProperty('--border-color', initialTheme.border);
             root.style.setProperty('--card-border', initialTheme.border);
             root.style.setProperty('--primary-color', initialTheme.primary);
             root.style.setProperty('--primary-foreground-color', initialTheme.primaryForeground || '#fff');
             root.style.setProperty('--text-color', initialTheme.foreground);
             root.style.setProperty('--title-color', initialTheme.foreground);
             root.style.setProperty('--input-background', initialTheme.input);
             // Set mode-specific variables
             if (savedMode === 'color') {
                 root.style.setProperty('--input-placeholder', 'var(--text-color)');
                 root.style.setProperty('--input-border', 'rgba(255, 255, 255, 0.15)');
                 root.style.setProperty('--success-color', '#ffffff');
                 root.style.setProperty('--warn-color', '#ffffff');
                 root.style.setProperty('--info-color', '#ffffff');
                 root.style.setProperty('--alert-color', '#ffffff');
                 root.style.setProperty('--nav-backgound-color', initialTheme.background);
                 root.style.setProperty('--fade-color', initialTheme.background);
                 root.style.setProperty('--fade-to-color', 'transparent');
                 root.classList.remove('light', 'dark');
                 root.classList.add('blue');
                 $theme = 'color'
             } else if (savedMode === 'light') {
                 root.style.setProperty('--input-placeholder', 'var(--text-color)');
                 root.style.setProperty('--input-border', 'rgba(90, 88, 88, 0.9)');
                 root.style.setProperty('--success-color', initialTheme.primary);
                 root.style.setProperty('--warn-color', '#f25f61');
                 root.style.setProperty('--info-color', initialTheme.primary);
                 root.style.setProperty('--alert-color', '#f2cb5f');
                 root.style.setProperty('--nav-backgound-color', 'rgba(224, 224, 224, 0.9)');
                 root.style.setProperty('--fade-color', '#fdfdfd');
                 root.style.setProperty('--fade-to-color', '#fdfdfd04');
                 root.classList.remove('dark', 'blue');
                 root.classList.add('light');
                 $theme = 'light'
             } else {
                 root.style.setProperty('--input-placeholder', 'var(--text-color)');
                 root.style.setProperty('--input-border', 'rgba(255, 255, 255, 0.15)');
                 root.style.setProperty('--success-color', initialTheme.primary);
                 root.style.setProperty('--warn-color', '#f25f61');
                 root.style.setProperty('--info-color', initialTheme.primary);
                 root.style.setProperty('--alert-color', '#f2cb5f');
                 root.style.setProperty('--nav-backgound-color', 'rgba(32, 32, 32, 0.9)');
                 root.style.setProperty('--fade-color', '#121212');
                 root.style.setProperty('--fade-to-color', '#12121200');
                 root.classList.remove('light', 'blue');
                 root.classList.add('dark');
                 $theme = 'dark'
             }
             
             root.style.setProperty('--logo-color', '#ffffff');
             root.style.setProperty('--backdrop-color', 'rgba(0, 0, 0, 0.5)');
        }


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
        board_message_sound.volume = 0.3 // 30% volume
        new_message_sound = new Audio('/audio/message.mp3')
        new_message_sound.volume = 0.3 // 30% volume


    })

    window.api.receive("sync", (state) => {
        if (state === "Synced") $misc.syncedStatus = true
        if (state === "Syncing") $misc.syncedStatus = false
        if (state === "Not syncing") $misc.syncedStatus = false 
    })

    window.api.receive('banned', (key) => {
        $rooms.banned.push(key)
        $rooms = $rooms
        window.api.send('room-banned', key)
    }) 

    window.api.receive('feed-message', (m) => {
        $feed.new.push(m)
        $feed = $feed
    })


    window.api.receive('rec-off', (data) => {
        //This is for logging SDP for calls, to look for bugs etc during parse and expand phase
        console.log('Reconstructed offer expanded, testdata:', data)
    })

    window.api.receive('switch-node', (data) => {
        $misc.node = data
        window.api.successMessage(`You are connected to ${data.node}`, false)
    })

    window.api.receive('typing', (data) => { 
        if (data.typing === false) {
         $rooms.typingUsers = $rooms.typingUsers.filter(a => a.address !== data.address)
         return
        }
        if ($rooms.typingUsers.some(a => a.address === data.address)) return
        const active = $swarm.active.find(a => a.key === data.key)
        if (!active) return
        const contact = active.connections.find(a => a.address === data.address)

        if (!contact) return
        const typer = {
            name: contact.name,
            topic: active.topic,
            address: data.address
        }

        $rooms.typingUsers.push(typer)
        $rooms.typingUsers = $rooms.typingUsers
     })


    window.api.receive('room-notification', ([data, add = false]) => {
        console.log("room notification", data)


        //Initial state check
        if ($notify.notifications.some(a => a.hash === data.hash)) return
        const thisgroup = data.group === $rooms.thisRoom.key
        const ingroups = $page.url.pathname === '/rooms'
        const group = $rooms.roomArray.find(a => a.key === data.group)
        if (data.address == $user.myAddress) return
        if (thisgroup && ingroups && $swarm.showVideoGrid && data.channel === "Chat room") return
        if (thisgroup && ingroups && data.channel !== "Chat room" && $misc.focus && !$swarm.showVideoGrid) return
        new_messages = true
        data.room = true

        //Check if we want to play sound and display notif.
        if ($notify.new.length < 2 && !$notify.que && !add) {
            if (Date.now() - parseInt(data.time) > 120000) return
            //In app notif.
            if (!$notify.off.some(a => a === group.name)) {
                if ($misc.focus && $sounds.on) {
                    board_message_sound.play()
                }
                $notify.new.push(data)
                //Os notif.
                if (!$misc.focus) { 
                    data.roomName = group.name
                    window.api.send('notify-room', data)
                }
            }
        }

        //Add to notifications page
        $notify.notifications.push(data)

        if (!$misc.focus && thisgroup && ingroups) return
        if (add) return

        //Add to unread ie. shows the unread counter, and dots on the sidebar.
        data.type = 'room'
        $notify.unread.push(data)
        $notify = $notify
    })

    window.api.receive('privateMsg', (data) => {
        //If address is our own, maybe sent from mobile
        if (data.chat === $user.myAddress) return

        // saveToStore(data)
        //Convert message to notification
        const contact = $user.contacts.find((a) => a.chat === data.chat)
        if (contact) data.name = contact.name
        
        data.message = data.msg
        data.type = 'message'

        const inchat = 
        data.chat === $user.activeChat.chat 
        && $misc.focus
        && $page.url.pathname === '/messages'

        if ($misc.focus && $sounds.on && !inchat) new_message_sound.play()
        if (!$misc.focus) window.api.send('notify-dm', data)
                

        //If we are active in the chat, but minimized.
        if (
            data.chat === $user.activeChat.chat 
            && !$misc.focus 
            && $page.url.pathname === '/messages'
        )
        return

        new_messages = true
        $notify.unread.push(data)
        // $notify.new.push(data)
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

    // Listen for real-time wallet updates (transactions)
    window.api.onWalletUpdate(async (data) => {
        console.log('Global wallet update:', data)
        
        // Update Transactions (fetch page 0)
        const transactions = await window.api.getTransactions(0)
        transactionList.set({
            txs: transactions.pageTx,
            pages: transactions.pages
        })

        // Update Balance
        const balance = await window.api.getBalance()
        $misc.balance = balance
    })

    window.api.receive('user-joined-voice-channel', data => {
        console.log("Someone joined a call, layout", data)
        let contact = $user.contacts.find((a) => a.chat == data.address)
        if (!contact) return
        let room = $swarm.active.find(a => a.topic === data.topic)
        console.log("Rojom", room)
        if (!room) return
        if (!room.beam) return
        //We are already in the call
        if (room === $swarm.voice) return
        if ($swarm.voice.voice_channel.has(data.address)) return

        let joined = {
            chat: data.address,
            file: false,
            timestamp: Date.now(),
            msg: ` ${contact.name} started a call`,
            sent: false,
            beam: true
        }

        window.api.successMessage(joined.msg)

        console.log("Saved joined voice")
        saveToStore(joined)
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
        let filter = $notify.new.filter(a => a.hash !== e.hash)
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
                window.api.successMessage('Hugin is up to date.', false)
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

    window.api.receive('files', data => {
        $files = data
    })

    window.api.receive('file-downloaded', (data, saved = false) => {
        const file = JSON.parse(data)
        console.log("File downloaded:", file)
        console.log("From:", name)
        if ($files.some(a => a.time === file.time)) return
        const add = {
            fileName: file.fileName,
            chat: file.address,
            path: saved ? file.path : 'storage',
            hash: file.hash,
            time: file.time,
            size: file.size,
            group: true,
            topic: file.topic,
            saved: true
        }

        $files.push(add)
        $files = $files
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

    window.api.receive('new-beam', async (data) => {
        $beam.active.push({
            chat: data.chat,
            connected: false,
            key: data.key,
            hugin: data.hugin
        })
        $beam.active = $beam.active
        if ($beam.active.length > 1) return
        toast.success(`Beams activated`, {
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

    window.api.receive('stop-beam', (addr, close = false)  => {
        let filter = $beam.active.filter(a => a.chat !== addr)
        $beam.active = filter
        console.log('active beams', $beam.active)
        toast.error('Beam disconnected', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            })
    })

    window.api.receive('hugin-node-connection', (status)  => {
        $HuginNode.connected = status
        if (!status) {
            window.api.errorMessage('Disconnected from node.')
        } else {
            window.api.successMessage('Connected to node', false)
        }
    })


    window.api.receive('download-request', (data)  => { 
        console.log(
            'Download request', data
        )
    })

    window.api.receive('remote-file-saved', (data)  => {
        const file = JSON.parse(data)
        console.log("Save temp file", file)
        $files.push(file)
        $files = $files
    })

    window.api.receive('remote-file-added', (data, update)  => {
        console.log('Remote file added', data)
        let from = $user.contacts.find(a => a.chat === data.chat)
        let newFile = data.remoteFiles[0]
        let incomingFile = {
            chat: data.chat,
            file: newFile,
            timestamp: newFile.time,
            msg: `Incoming file: ${newFile.fileName}`,
            sent: false,
            beam: true
        }
        saveToStore(incomingFile)
        $remoteFiles.push(data.remoteFiles[0])
        $remoteFiles = $remoteFiles
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

    window.api.receive('torrent-shared', (data) => {
        $groups.fileList.push(data)
        $groups.fileList = $groups.fileList
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

    run(() => {
    if ($user.idleLimit > 0 && $user.idleTime >= $user.idleLimit) {
          if ($webRTC.call.length === 0 && !$swarm.voice && !$beam.active.length) {
          $user.loggedIn = false
          goto('/login');
          }
      }
  });

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
        // toast(DownloadToast, {
        //         position: 'top-right',
        //         style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        //         duration: 1000 * 18000,
        //         file: data.fileName,
        //         chat: data.chat,
        //         time: file.time
        // })
    }

    const setUploadStatus = (data) => {
        let file = $localFiles.find(a => a.fileName === data.fileName && a.chat === data.chat && data.time === a.time)
        file.progress = 0
        $upload.unshift(file)
        $upload =  $upload
        if (data.group) return
        console.log('Upload store', $upload)
        // toast(UploadToast, {
        //         position: 'top-right',
        //         style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        //         duration: 1000 * 18000,
        //         file: data.fileName,
        //         chat: data.chat,
        //         time: file.time
        // })
    }


</script>
<main>
<div onmousemove={mouseMove}>
<TrafficLights/>
<Toaster/>

{#if ready}
    <StoreFunctions/>
    {#if startAnimation}
        <div class="shine"></div>
    {/if}

    {#if $swarm.active.length}
            <Conference />
            {#if $swarm.voice_channel.has($user.myAddress)}
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


    {#if $user.loggedIn && $notify.new.length > 0 && new_messages}
        <div class="notifs">
            {#if $notify.new.length < 2 && !$notify.que}
                {#each $notify.new as notif}
                {#if notif?.room === true}
                    <RoomNotification Hide="{removeNotification}" message="{notif}" error="{false}"/>
                    {:else}
                    <Notification Hide="{removeNotification}" message="{notif}" error="{false}" success={true}/>
                {/if}
                {/each}
            {/if}

        </div>
    {/if}


    {#if $user.loggedIn}
        <LeftMenu/>
        {#if $page.url.pathname !== '/boards' && $page.url.pathname !== '/dashboard' && $page.url.pathname !== '/feed' && $page.url.pathname !== '/wallet'}
            <RightMenu/>
        {/if}
    {/if}

    {#if $appUpdateState.openPopup}
        <Updater/>
    {/if}

    {@render children?.()}
    
{/if}


<VoiceChannel/>

</div>
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
