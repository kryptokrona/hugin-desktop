<script>
import LeftMenu from '$lib/components/navbar/LeftMenu.svelte'
import { page } from '$app/stores'
import RightMenu from '$lib/components/navbar/RightMenu.svelte'
import Webrtc from '$lib/components/webrtc/Calls.svelte'
import {
    beam,
    boards,
    groups,
    messageWallet,
    misc,
    notify,
    user,
    webRTC,
} from '$lib/stores/user.js'
import Notification from '$lib/components/popups/Notification.svelte'
import toast from 'svelte-french-toast'
import OptimizeToast from '$lib/components/custom-toasts/OptimizeToast.svelte'
import { download, localFiles, remoteFiles, upload } from '$lib/stores/files.js'
import DownloadToast from '$lib/components/custom-toasts/DownloadToast.svelte'
import UploadToast from '$lib/components/custom-toasts/UploadToast.svelte'
import { messages } from '$lib/stores/messages.js'
import { onMount } from 'svelte'

let new_messages
let board_message_sound
let new_message_sound
let showCallerMenu
let incoming_call

onMount(() => {
    board_message_sound = new Audio('/audio/boardmessage.mp3')
    new_message_sound = new Audio('/audio/message.mp3')
})

window.api.receive('sync', (state) => {
    if (state === 'Synced') $misc.syncedStatus = true
    if (state === 'Syncing') $misc.syncedStatus = false
    if (state === 'Not syncing') $misc.syncedStatus = false
})

window.api.receive('new-beam', async (beamData) => {
    toast.success(`New beam activated`, {
        position: 'top-right',
        style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
    })
})

window.api.receive('newGroupMessage', (data) => {
    if (data.address === $user.huginAddress.substring(0, 99)) return
    if (data.group === $groups.thisGroup.key && $page.url.pathname === '/groups') return
    if ($page.url.pathname !== '/groups') {
        data.type = 'group'
        $notify.unread.push(data)
        $notify.unread = $notify.unread
    }
    new_messages = true
    data.key = data.address
    if ($notify.new.length < 5) {
        board_message_sound.play()
        $notify.new.push(data)
    }
    $notify.new = $notify.new
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

window.api.receive('beam-connected', (data) => {
    let [address, key] = data
    let update = $beam.active.map((a) => {
        if (a.chat === address) {
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

window.api.receive('stop-beam', (addr) => {
    $beam.active = $beam.active.filter((a) => a.chat !== addr)
    console.log('active beams', $beam.active)
    toast.error('Beam disconnected', {
        position: 'top-right',
        style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
    })
})

function removeNotification(e) {
    $notify.new.some((a) => {
        if (a.hash === e.detail.hash) $notify.new.pop(a)
    })
    $notify.new = $notify.new
}

window.api.receive('download-request', (data) => {
    console.log('Download request', data)
})

window.api.receive('remote-file-added', (data) => {
    console.log('Remote file added', data)
    let from = $user.contacts.find((a) => a.chat === data.chat)
    let newFile = data.remoteFiles[0]
    let incomingFile = {
        chat: data.chat,
        file: [newFile],
        timestamp: newFile.time,
        msg: `Incoming file: ${newFile.fileName}`,
        sent: false,
        beam: true,
    }
    saveToStore(incomingFile)
    $remoteFiles = data.remoteFiles
    toast.success(`New file shared by ${from.name}`, {
        position: 'top-right',
        style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
    })
})

window.api.receive('remote-files', (data) => {
    let from = $user.contacts.find((a) => a.chat === data.chat)
    $remoteFiles = data.remoteFiles
})

window.api.receive('local-files', async (data) => {
    console.log('Local files n data', data)
    $localFiles = data.localFiles
    console.log('lcocalfiles', $localFiles)
})

window.api.receive('uploading', (data) => {
    setUploadStatus(data)
})

window.api.receive('downloading', (data) => {
    setDownloadStatus(data)
})

window.api.receive('download-file-progress', (data) => {
    updateDownloadProgress(data)
})

window.api.receive('upload-file-progress', (data) => {
    updateUploadProgress(data)
})

const updateUploadProgress = async (data) => {
    const thisAddr = data.chat
    const thisFile = data.fileName
    $upload.some((a) => {
        if (a.chat === thisAddr && a.fileName === thisFile && a.time === data.time) {
            a.progress = data.progress
        }
    })
    $upload = $upload
}

const updateDownloadProgress = async (data) => {
    const thisAddr = data.chat
    const thisFile = data.fileName
    $download.some((a) => {
        if (a.chat === thisAddr && a.fileName === thisFile) {
            a.path = data.path
            a.progress = data.progress
        }
    })

    $upload = $upload

    if (data.progress === 100) {
        toast.success(`${thisFile} finished downloading`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    }
}

const setDownloadStatus = (data) => {
    let file = $remoteFiles.find((a) => a.fileName === data.fileName && a.chat === data.chat)
    file.progress = 0
    $download.unshift(file)
    $download = $download
    console.log('Download store', $download)
    toast(DownloadToast, {
        position: 'top-right',
        style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        duration: 1000 * 18000,
        file: data.fileName,
        chat: data.chat,
        time: file.time,
    })
}
const setUploadStatus = (data) => {
    let file = $localFiles.find(
        (a) => a.fileName === data.fileName && a.chat === data.chat && data.time === a.time
    )
    file.progress = 0
    $upload.unshift(file)
    $upload = $upload
    console.log('Upload store', $upload)
    toast(UploadToast, {
        position: 'top-right',
        style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        duration: 1000 * 18000,
        file: data.fileName,
        chat: data.chat,
        time: file.time,
    })
}

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
    if ($notify.new.length < 5) {
        board_message_sound.play()
        $notify.new.push(data)
    }
    $notify.new = $notify.new
})

window.api.receive('privateMsg', async (data) => {
    console.log('newmsg in layout', data)
    if (data.chat === $user.huginAddress.substring(0, 99)) return
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

    window.api.successMessage('A new friend was invited to call')
    $webRTC.joining = data.key
})

const endThisCall = () => {
    showCallerMenu = false
}

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

</script>

{#if $notify.new.length > 0 && new_messages}
    <div class="notifs">
        {#each $notify.new as notif}
            <Notification on:hide="{removeNotification}" message="{notif}" error="{false}" />
        {/each}
    </div>
{/if}

<Webrtc />
<LeftMenu />
<slot />
{#if $page.url.pathname !== '/boards' && $page.url.pathname !== '/dashboard'}
    <RightMenu />
{/if}
