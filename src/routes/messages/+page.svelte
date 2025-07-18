<script>
import { run } from 'svelte/legacy';

import {fade, fly} from 'svelte/transition'
import {onDestroy, onMount} from 'svelte'
import {messages} from '$lib/stores/messages.js'
import ChatBubble from '$lib/components/chat/ChatBubble.svelte'
import ChatInput from '$lib/components/chat/ChatInput.svelte'
import ChatList from '$lib/components/chat/ChatList.svelte'
import AddChat from '$lib/components/chat/AddChat.svelte'
import {boards, notify, transactions, user, beam, webRTC, swarm, files, keyboard} from '$lib/stores/user.js'
import Rename from '$lib/components/chat/Rename.svelte'
import SendTransaction from '$lib/components/finance/SendTransaction.svelte'
import Dropzone from "svelte-file-dropzone";
import { sleep } from '$lib/utils/utils'
import FileViewer from '$lib/components/popups/FileViewer.svelte'
import { fileSettings, fileViewer, localFiles, remoteFiles } from '$lib/stores/files.js'
import BigImage from '$lib/components/popups/BigImage.svelte'
import DropFile from '$lib/components/popups/DropFile.svelte'
import ActiveCall from './components/ActiveCall.svelte'
import { flip } from 'svelte/animate';
import Button from '$lib/components/buttons/Button.svelte';

let active_contact = $state()
let messageList = $state([])
let contact
let dragover = $state(false)
let toggleRename = $state(false)
let wantToAdd = $state(false)
let windowHeight = $state()
let windowChat = $state()

let thisSwarm = $derived($swarm.active.find(a => a.chat === $user.activeChat.chat))
//Get messages on mount.
onMount(async () => {
    $fileViewer.enhanceImage = false
    $fileViewer.focusImage = ""
    boards.update((data) => {
        return {
            ...data,
            replyTo: { reply: false },
        }
    })

    //If we have an active chat in store we show that conversation
    if ($user.activeChat) {
        printConversation($user.activeChat)
    } else {
        printConversation($user.contacts[0])
    }

    scrollDown()

    //Listen for new message private messages saved in DB
    window.api.receive('newMsg', async (data) => {

        if (data.chat === $user.activeChat.chat) {
            const file = isFile(data)
            if (file) data.file = file
            printMessage(data)
        }
    })

    window.api.receive('remote-file-added', async (data) => {

        if (data.chat === $user.activeChat.chat) {
            messageList = sortMessages(messageList)
        }
    })

    window.api.receive('user-joined-voice-channel', async (data) => {
        await sleep(200)
        if (data.address === $user.activeChat.chat) {
            messageList = sortMessages(messageList)
        }
    })



    window.api.receive('privateMsg', async (data) => {
        if (data.chat === $user.activeChat.chat) {
            scrollDown()
        }
    })

    window.api.receive('pm-send-error', async (data) => {
        let failed = messageList.find(a => a.msg === data.message)
        failed.error = true
        messageList = messageList
    })

})

onDestroy(() => {
    window.api.removeAllListeners('newMsg')
})

const isFile = (data) => {
    const findit = (arr) => {
        return arr.find(a => parseInt(data.timestamp) === parseInt(a.time))
    }
    let file = findit($files)
    if (file) {
        file.saved = true
        return file
    }
    const remote = findit($remoteFiles)
    if (remote) return remote
    const local = findit($localFiles)
    if (local) return local
    return false
}

function sortMessages(arr) {
    return removeDuplicates(
    [ ...arr,...$messages.filter((x) => x.chat === $user.activeChat.chat)]
    .sort((a, b) => a.timestamp - b.timestamp))

}
async function loadMessages() {
    const dbMessages = await window.api.getConversation($user.activeChat.chat, 0)
    return sortMessages(dbMessages)
    
}

const removeDuplicates = (arr) => {
    let uniq = {}
    return arr.filter((obj) => !uniq[parseInt(obj.timestamp)] && (uniq[parseInt(obj.timestamp)] = true))
}

function getActiveChat(chat) {
    return $keyboard.messages.get(chat)
}

//Prints conversation from active contact
const printConversation = async (active) => {
    messageList = []
    $keyboard.input = ''
    const active_chat = { chat: active.chat, key: active.key, name: active.name }
    $user.activeChat = active_chat
    const clear = $notify.unread.filter(unread => unread.chat !== active.chat)
    $notify.unread = clear
    active_contact = active.chat + active.key

    const inChat = getActiveChat(active.chat)
    if (inChat) $keyboard.input = inChat.text
    $keyboard = $keyboard
    
    const allMessages = await loadMessages()

    let updated = []
    for (const a of allMessages) {
        const file = isFile(a) 
        if (file) a.file = file
        updated.push(a)
    }
    messageList = removeDuplicates(updated)
    scrollDown()
}

//Chat to add
const handleAddChat = (e) => {
    let addContact = e.chat + e.key
    //Send contact to backend and to saveContact()
    window.api.addChat(addContact, e.name, true)
    //Add input to message arr
    let newMessage = e

    // saveToStore(newMessage)
    //Prepare send function and filter
    printConversation(newMessage)
    //Close popup
    wantToAdd = false
}
//Update messages live if users keep chat mounted
const printMessage = (data) => {
    messageList.push(data)
    messageList = messageList
    scrollDown()
}


const scrollDown = () => {
   windowChat.scrollTop = 0;
}

run(() => {
        active_contact
    });

//Send message to store and DB
const sendMsg = (e) => {

    let offChain = false
    let beam = false
    let msg = e.text
    let error = checkErr(e)
    if (error) return

    console.log('Sending message')

    if (e.offChain) {
        offChain = true
    }

    if (e.beam) {
      beam = true
      offChain = true;
    }

    let myMessage = {
        chat: $user.activeChat.chat,
        msg: msg,
        sent: true,
        timestamp: Date.now(),
        beam: beam
    }
    
    $keyboard.input = ''

    printMessage(myMessage)
    window.api.sendMsg(msg, active_contact, offChain, false, beam)
    //printMessage(myMessage)
    console.log('Message sent')
}

//Check for possible errors
const checkErr = (e) => {
    let error = false
    if (e.text.length === 0) return true
    if (e.text.length > 777) error = "Message is too long"
    if ($user.wait) error = 'Please wait a couple of minutes before sending a message.'
    if (!error) return false

    window.api.errorMessage(error)
    return true
}

//Default value should be false to hide the AddChat form.
const openAdd = () => {
    wantToAdd = !wantToAdd
}

function renameContact(e) {
    let thisContact = $user.rename.chat + $user.rename.key
    //Send contact to backend and overwrite our old contact
    window.api.addChat(thisContact, e.text, false)
    toggleRename = false
}

const openRename = (a) => {
    console.log('rename open!')
    toggleRename = !toggleRename
}

const download = (link) => {
    console.log('downloading link', link)
    window.api.download(link)
}

async function dropFile(e) {
    dragover = false
    if (!thisSwarm) {
        window.api.errorMessage('No connection...')
        return
    }
    const { acceptedFiles, fileRejections } = e.detail
    let filename = acceptedFiles[0].name
    let path = acceptedFiles[0].path
    let size = acceptedFiles[0].size
    let toHuginAddress = $user.activeChat.chat + $user.activeChat.key
    let time = Date.now()
    let offchain = false
    const hash = await window.api.createGroup()
    const beam = true

    acceptedFiles[0].fileName = filename
    acceptedFiles[0].time = time
    acceptedFiles[0].chat = $user.activeChat.chat
    acceptedFiles[0].saved = true
    
    if (fileRejections.length) {
        console.log('rejected file')
        return
    }

    let message = {
        chat: $user.activeChat.chat,
        msg: '',
        sent: true,
        timestamp: time,
        file: acceptedFiles[0],
    }
    printMessage(message)
    // saveToStore(message)

    window.api.groupUpload(filename, path, $user.activeChat.chat, size, time, hash, !beam)
}

function drag() {
    dragover = true
}

function nodrag() {
    dragover = false
}

const sendTransaction = (e) => {
    $transactions.tip = false
    $transactions.send = false
    let tx = e
    window.api.sendTransaction(tx)
}
const hideModal = () => {
    $transactions.tip = false
    $transactions.send = { name: '' }
}

let loadMore = $state(true)

const noLoad = () => {
    pageNum--; loadMore = false; return
}

async function loadMoreMessages() {
    pageNum++
    const more = await window.api.getConversation($user.activeChat.chat, pageNum)
    messageList = [...messageList, ...more]
    if (more.length === 0) {noLoad(); return}
}

let imTyping = false
const typing = (e) => {
    if (imTyping === e.typing) return
    imTyping = e.typing
    window.api.send('typing', {key: $swarm.activeSwarm.key, typing: e.typing})
}

</script>

{#if $fileViewer.enhanceImage}
    <BigImage />
{/if}

{#if toggleRename}
    <Rename
        onRename="{(a) => renameContact(a)}"
        OpenRename="{openRename}"
        this_contact="{contact}"
        on:click="{openRename}"
    />
{/if}

{#if wantToAdd}
    <AddChat on:click="{openAdd}" AddChat="{(e) => handleAddChat(e)}" />
{/if}

{#if dragover}
    <DropFile />
{/if}

{#if $transactions.tip}
    <SendTransaction on:click="{hideModal}" onSendTx="{(e) => sendTransaction(e)}" />
{/if}


<main in:fade|global="{{ duration: 250 }}">
    <ChatList
        OpenRename="{(a) => openRename(a)}"
        onConversation="{(e) => printConversation(e)}"
        onOpen="{openAdd}"
    />

    <div class="right_side" out:fade|global="{{ duration: 100 }}">
        <div class="outer" id="chat_window" in:fly|global="{{ y: 50 }}" bind:this={windowChat} bind:clientHeight={windowHeight}>
            <Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> drag()} on:dragleave={()=> nodrag()} on:drop={dropFile}>
            <div class="inner">
                <div class="fade"></div>
                {#if messageList.length > 99 && loadMore} 
                    <Button text={"Load more"} disabled={false} on:click={() => loadMoreMessages()} />
                {/if}
                {#each messageList as message (message.timestamp)}
                <div animate:flip="{{duration: 100}}">
                    <ChatBubble
                        on:download="{() => download(message.msg)}"
                        files="{message.file}"
                        message="{message.msg}"
                        ownMsg="{message.sent}"
                        msgFrom="{message.chat}"
                        timestamp="{message.timestamp}"
                        beamMsg="{message.beam}"
                        error="{message?.error}"
                    />
                </div>
                {/each}
            </div>
            </Dropzone>
        </div>
        <ChatInput onMessage="{sendMsg}" onTyping={(e) => typing(e)} />
    </div>
</main>

<style lang="scss">
main {
    display: flex;
    margin-left: 85px;
    height: 100vh;
    overflow: hidden;
    z-index: 3;
    width: 100%;
}

.right_side {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    width: 100%;
    margin-right: 170px;
    position: relative;
}

.inner {
    display: flex;
    flex-direction: column;
    padding-top: 20px;
    width: 100%;
}

.outer {
    display: flex;
    flex-direction: column-reverse;
    overflow: scroll;
}

.fade {
    position: absolute;
    top: 0;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, var(--fade-color), var(--fade-to-color));
    z-index: 100;
    pointer-events: none;
}

.outer {
    --scrollbarBG: transparent;
    --thumbBG: #3337;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--thumbBG) var(--scrollbarBG);
}

.outer::-webkit-scrollbar {
    width: 8px;
}

.outer::-webkit-scrollbar-track {
    background: var(--scrollbarBG);
}

.outer::-webkit-scrollbar-thumb {
    background-color: var(--thumbBG);
    border-radius: 3px;
    border: 3px solid var(--scrollbarBG);
}
</style>
