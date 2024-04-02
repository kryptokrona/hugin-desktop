<script>
import {fade, fly} from 'svelte/transition'
import {onDestroy, onMount} from 'svelte'
import {messages} from '$lib/stores/messages.js'
import ChatBubble from '$lib/components/chat/ChatBubble.svelte'
import ChatInput from '$lib/components/chat/ChatInput.svelte'
import ChatList from '$lib/components/chat/ChatList.svelte'
import AddChat from '$lib/components/chat/AddChat.svelte'
import {boards, notify, transactions, user, beam, webRTC} from '$lib/stores/user.js'
import Rename from '$lib/components/chat/Rename.svelte'
import BackDrop from '$lib/components/popups/BackDrop.svelte'
import SendTransaction from '$lib/components/finance/SendTransaction.svelte'
import Dropzone from "svelte-file-dropzone";
import { sleep } from '$lib/utils/utils'
import FileViewer from '$lib/components/popups/FileViewer.svelte'
import { fileSettings, fileViewer } from '$lib/stores/files.js'
import BigImage from '$lib/components/popups/BigImage.svelte'

let chat
let active_contact
let savedMsg = []
let key
let contact
let dragover = false
let toggleRename = false
let wantToAdd = false
let windowHeight
let windowChat

//Get messages on mount.
onMount(async () => {

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
            printMessage(data)
        }
    })

    window.api.receive('privateMsg', async (data) => {
        if (data.chat === $user.activeChat.chat) {
            scrollDown()
        }
    })

    window.api.receive('pm-send-error', async (data) => {
        let failed = savedMsg.find(a => a.msg === data.message)
        failed.error = true
        savedMsg = savedMsg
    })

})

onDestroy(() => {
    window.api.removeAllListeners('newMsg')
})

//Prints conversation from active contact
const printConversation = (active) => {
    chat = active.chat
    key = active.key
    active_contact = chat + key
    savedMsg = $messages.filter((x) => x.chat === chat)
    let active_chat = { chat: chat, key: key, name: active.name }
    $user.activeChat = active_chat
    scrollDown()
}
//Chat to add
const handleAddChat = (e) => {
    let addContact = e.detail.chat + e.detail.key
    //Send contact to backend and to saveContact()
    window.api.addChat(addContact, e.detail.name, true)
    //Add input to message arr
    let newMessage = e.detail

    saveToStore(newMessage)
    //Prepare send function and filter
    printConversation(newMessage)
    //Close popup
    wantToAdd = false
}
//Update messages live if users keep chat mounted
const printMessage = (data) => {
    savedMsg.push(data)
    savedMsg = savedMsg
    scrollDown()
}


const scrollDown = () => {
    windowChat.scrollTop = windowChat.scrollTopMax
}

const saveToStore = (data) => {
    messages.update((current) => {
        return [...current, data]
    })
}

$: active_contact

//Send message to store and DB
const sendMsg = (e) => {

    let offChain = false
    let beam = false
    let msg = e.detail.text
    let error = checkErr(e)
    if (error) return

    console.log('Sending message')

    if (e.detail.offChain) {
        offChain = true
    }

    if (e.detail.beam) {
      beam = true
      offChain = true;
    }

    let myMessage = {
        chat: chat,
        msg: msg,
        sent: true,
        timestamp: Date.now(),
        beam: beam
    }

    saveToStore(myMessage)
    window.api.sendMsg(msg, active_contact, offChain, false, beam)
    //printMessage(myMessage)
    console.log('Message sent')
}

//Check for possible errors
const checkErr = (e) => {
    let error = false
    if (e.detail.text.length > 777) error = "Message is too long"
    if ($user.wait) error = 'Please wait a couple of minutes before sending a message.'
    if (!error) return false

    window.api.errorMessage(error)
    return true
}

//Default value should be false to hide the AddChat form.
const openAdd = () => {
    wantToAdd = !wantToAdd
}

$: savedMsg = $messages.filter((x) => x.chat === chat)

function renameContact(e) {
    let thisContact = $user.rename.chat + $user.rename.key
    //Send contact to backend and overwrite our old contact
    window.api.addChat(thisContact, e.detail.text, false)
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
    const { acceptedFiles, fileRejections } = e.detail
    let filename = acceptedFiles[0].name
    acceptedFiles[0].fileName = filename
    let path = acceptedFiles[0].path
    let size = acceptedFiles[0].size
    let toHuginAddress = $user.activeChat.chat + $user.activeChat.key
    let time = Date.now()
    let offchain = false
    
    acceptedFiles[0].time = time
    acceptedFiles[0].chat = $user.activeChat.chat
    
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
    saveToStore(message)

    if ($webRTC.call.some(a => a.chat === $user.activeChat.chat)) offchain = true

    if (!$beam.active.some(a => a.chat === message.chat)) {
        window.api.createBeam("new", toHuginAddress, true, offchain)
        $beam.active.push({
            chat: $user.activeChat.chat,
            connected: false,
            key: undefined,
        })
        $beam.active = $beam.active
        await sleep(300)
    }
    window.api.upload(filename, path, $user.activeChat.chat, size, time)
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
    let tx = e.detail
    window.api.sendTransaction(tx)
}

const hideModal = () => {
    $transactions.tip = false
    $transactions.send = { name: '' }
}


</script>

{#if $fileViewer.enhanceImage}
    <BigImage />
{/if}

{#if toggleRename}
    <Rename
        on:rename="{(a) => renameContact(a)}"
        on:openRename="{openRename}"
        this_contact="{contact}"
        on:click="{openRename}"
    />
{/if}

{#if wantToAdd}
    <AddChat on:click="{openAdd}" on:addChat="{(e) => handleAddChat(e)}" />
{/if}

{#if dragover}
    <BackDrop />
{/if}

{#if $transactions.tip}
    <SendTransaction on:click="{hideModal}" on:send="{(e) => sendTransaction(e)}" />
{/if}

<main in:fade="{{ duration: 350 }}">
    <ChatList
        on:openRename="{(a) => openRename(a)}"
        on:conversation="{(e) => printConversation(e.detail)}"
        on:open="{openAdd}"
    />

    <div class="right_side" in:fade="{{ duration: 350 }}" out:fade="{{ duration: 100 }}">
        <div class="fade"></div>
        <div class="outer" id="chat_window" in:fly="{{ y: 50 }}">
            <Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> drag()} on:dragleave={()=> nodrag()} on:drop={dropFile}>
            <div class="inner" bind:this={windowChat} bind:clientHeight={windowHeight}>
                {#each savedMsg as message (message.timestamp)}
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
                {/each}
            </div>
            </Dropzone>
        </div>
        <ChatInput on:message="{sendMsg}" />
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

    &::-webkit-scrollbar {
        display: none;
    }
}

.fade {
    position: absolute;
    top: 0;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, #121212, #12121200);
    z-index: 100;
}
</style>
