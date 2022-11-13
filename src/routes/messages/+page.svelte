<script>
import {fade} from 'svelte/transition'
import {onDestroy, onMount} from 'svelte'
import {messages} from '$lib/stores/messages.js'
import ChatBubble from '/src/components/chat/ChatBubble.svelte'
import ChatInput from '/src/components/chat/ChatInput.svelte'
import ChatList from '/src/components/chat/ChatList.svelte'
import AddChat from '/src/components/chat/AddChat.svelte'
import {boards, notify, transactions, user} from '$lib/stores/user.js'
import Rename from '/src/components/chat/Rename.svelte'
import BackDrop from '/src/components/popups/BackDrop.svelte'
import SendTransaction from '/src/components/finance/SendTransaction.svelte'

let chat
let active_contact
let savedMsg = []
let key
let contact
let box
let chatWindow
let dragover = false

//Get messages on mount.
onMount(async () => {
    messages.set(await window.api.getMessages((res) => {}))

    chatWindow = document.getElementById('chat_window')

    boards.update((data) => {
        return {
            ...data,
            replyTo: { reply: false },
        }
    })

    let filter = $notify.unread.filter((a) => a.type !== 'message')
    $notify.unread = filter

    //If we have an active chat in store we show that conversation
    if ($user.activeChat) {
        printConversation($user.activeChat)
    }

    scrollDown()
})

onDestroy(() => {
    window.api.removeAllListeners('newMsg')
})

//Prints conversation from active contact
const printConversation = (active) => {
    chat = active.chat
    key = active.key
    active_contact = chat + key
    let active_chat = { chat: chat, key: key, name: active.name }
    $user.activeChat = active_chat
    savedMsg = []
    savedMsg = $messages.filter((x) => x.chat === chat)
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
    chatWindow.scrollTop = chatWindow.scrollHeight
}

const saveToStore = (data) => {
    messages.update((current) => {
        return [...current, data]
    })
}

//Listen for new message private messages saved in DB
window.api.receive('newMsg', async (data) => {
    console.log('userchat', $user.activeChat.chat)

    if (data.chat === $user.activeChat.chat) {
        printMessage(data)
    }
})

$: active_contact

//Send message to store and DB
const sendMsg = (e) => {

    if (e.detail.text.length > 477) {
        $notify.errors.push({
            message: 'Message is too long',
            name: 'Error',
            hash: parseInt(Date.now()),
        })
        $notify.errors = $notify.errors
        return
    }
    console.log('Sending message')
    let offChain = false
    let beam = false
    let msg = e.detail.text
    let myaddr = $user.huginAddress.substring(0, 99)
    let myMessage = {
        chat: chat,
        msg: msg,
        sent: true,
        timestamp: Date.now(),
    }
    saveToStore(myMessage)
    if (e.detail.offChain) {
        offChain = true
    }
    if (e.detail.beam) {
      beam = true
      offChain = true;
    }
    window.api.sendMsg(msg, active_contact, offChain, false, beam)
    printMessage(myMessage)
    console.log('Message sent')
}

//Default value should be false to hide the AddChat form.
let wantToAdd = false
const openAdd = () => {
    wantToAdd = !wantToAdd
}

$: savedMsg

function renameContact(e) {
    console.log('contac', e)
    let thisContact = $user.rename.chat + $user.rename.key
    //Send contact to backend and overwrite our old contact
    console.log(' want to add', thisContact)
    window.api.addChat(thisContact, e.detail.text, false)
    toggleRename = false
}

let toggleRename = false
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
    let path = acceptedFiles[0].path
    if (fileRejections.length) {
        console.log('rejected file')
    }
    let address = $user.activeChat.chat + $user.activeChat.key
    console.log(acceptedFiles)

    let message = {
        chat: $user.activeChat.chat,
        msg: '',
        sent: true,
        t: Date.now(),
        file: acceptedFiles,
    }
    printMessage(message)
    saveToStore(message)
    window.api.upload(filename, path, address)
}

function test() {
    dragover = true
}

function fest() {
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

<main in:fade="{{ duration: 350 }}" out:fade="{{ duration: 150 }}">
    <ChatList
        on:openRename="{(a) => openRename(a)}"
        on:conversation="{(e) => printConversation(e.detail)}"
        on:open="{openAdd}"
    />

    <div class="right_side" in:fade="{{ duration: 350 }}" out:fade="{{ duration: 100 }}">
        <div class="fade"></div>
        <!-- <Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> test()} on:dragleave={()=> fest()}
          on:drop={dropFile}> -->
        <div class="outer" id="chat_window">
            <div class="inner">
                {#each savedMsg as message}
                    <ChatBubble
                        on:download="{() => download(message.msg)}"
                        files="{message.file}"
                        torrent="{message.magnet}"
                        handleType="{message.sent}"
                        message="{message.msg}"
                        ownMsg="{message.sent}"
                        msgFrom="{message.chat}"
                        timestamp="{message.timestamp}"
                    />
                {/each}
            </div>
        </div>
        <!-- </Dropzone> -->
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
}

.right_side {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    width: 100%;
    margin-right: 85px;
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
