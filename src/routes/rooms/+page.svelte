<script>
    import { run } from 'svelte/legacy';

import RoomHugins from "./components/RoomHugins.svelte"
import RoomList from "./components/RoomList.svelte"

import {fade, fly} from 'svelte/transition'
import ChatInput from '$lib/components/chat/ChatInput.svelte'
import {roomMessages} from '$lib/stores/roommsgs.js'
import GroupMessage from '$lib/components/chat/GroupMessage.svelte'
import {notify, user, swarm, rooms, misc, files, transactions, keyboard} from '$lib/stores/user.js'
import {onDestroy, onMount} from 'svelte'
import AddGroup from '$lib/components/chat/AddGroup.svelte'
import {page} from '$app/stores'
import BlockContact from '$lib/components/chat/BlockContact.svelte'
import { containsOnlyEmojis, hashPadding, sleep } from '$lib/utils/utils'
import Loader from '$lib/components/popups/Loader.svelte'
import Button from '$lib/components/buttons/Button.svelte'
import Dropzone from "svelte-file-dropzone";
import DropFile from '$lib/components/popups/DropFile.svelte'
import { fileViewer, localFiles, remoteFiles } from '$lib/stores/files'
import AddRoom from "./components/AddRoom.svelte"
import BigImage from "$lib/components/popups/BigImage.svelte"
import TopBar from "./components/TopBar.svelte"
import FillButton from "$lib/components/buttons/FillButton.svelte"
import SendTransaction from "$lib/components/finance/SendTransaction.svelte"
	import { flip } from 'svelte/animate';

let replyto = ''
let reply_exit_icon = 'x'
let noMsgs = $state(false)
let loader = $state(false)
let filterRooms = $state([])
let filterEmojis = $state([])
let fixedRooms = $state([])
let replyTrue = $state(false)
let scrollGroups = []
let windowHeight = $state()
let windowChat = $state()
let channelMessages = []
let pageNum = 0;
let loadMore = $state(true)
let admin = $state(false)
const welcomeAddress = $misc.welcomeAddress
let thisSwarm = $state(false)
let someoneTyping = $state(null);
let usersTyping = $state(0);

const filteredUsers = () => { 
    return $rooms.typingUsers.filter(a => a.topic === $rooms.thisRoom?.topic)
}

$effect(() => {
    usersTyping = filteredUsers().length;
    if (usersTyping === 0) return
    if (usersTyping > 1) return
    someoneTyping = filteredUsers()[0] ?? null;
})



let isThis = $derived($rooms.thisRoom?.key === $swarm.activeSwarm?.key)
run(() => {
        if (isThis && $swarm.activeSwarm) thisSwarm = $swarm.activeSwarm
    });

run(() => {
        replyTrue = $rooms.replyTo?.reply
    });

run(() => {
        if (thisSwarm) admin = thisSwarm.admin
    });

const isFile = (data) => {
    const findit = (arr) => {
        return arr.find(a => parseInt(data.time) === parseInt(a.time))
    }
    const local = findit($localFiles)
    if (local) return local
    
    let file = findit($files)
    if (file) {
        file.saved = true
        return file
    }
    const remote = findit($remoteFiles)
    if (remote) return remote
}

onMount(async () => {
    $fileViewer.enhanceImage = false
    $fileViewer.focusImage = ""
    if ($rooms.params !== null) {
        const inviteKey = $rooms.params.slice(-128)
        const parse = $rooms.params.split('hugin://')[1]
        const roomName = parse.slice(0, (parse.length - 1) - inviteKey.length)
        const inviteName = roomName.replace(/-/g, ' ');
        addNewRoom({key: inviteKey, name: inviteName, admin: false})
        $rooms.params = null
    }
    scrollDown()
    //Listens for new messages from backend
    window.api.receive('roomMsg', (data) => {
        newMessage(data)
        
        
    })
    window.api.receive('history-update', (data) => {
        const inroom = $swarm.activeSwarm?.key === data.key

        //Print individual missed messages in a conversation if active
        if (data.missing?.length > 0 && inroom) {
            for (const a of data.missing) {
                printRoomMessage(a)
            }
            return
        }
        
        //Update history synced messages and reprint the whole room.
        if (inroom) {
            const room = {key: data.key, name: $rooms.thisRoom.name,}
            printRoom(room)
        }
    })
    
})

function newMessage(data) {
    const file = isFile(data)
    if (file) data.file = file
    const thisroom = data.group === $swarm.activeSwarm.key
    const roomtopic = data.topic === $swarm.activeSwarm.topic
    const thistopic = data.file?.key === $swarm.activeSwarm.topic
    const inrooms = $page.url.pathname === '/rooms'
    if (data.address === $user.myAddress) return
        if ((thisroom || thistopic || roomtopic) && inrooms) {
            printRoomMessage(data, file)
        } else {
            console.log("Another room")
        }
        
        return
}

onDestroy(() => {
    window.api.removeAllListeners('sent_room')
    window.api.removeAllListeners('set-channels')
    window.api.removeAllListeners('history-update')
})

// window.api.receive('sent_group', (data) => {
//     addHash(data)
// })


window.api.receive('set-channels', async () => { 
    //Await swarm data to be set
    // await sleep(200)
    // setChannels()
})

//Check for possible errors
const checkErr = (e, tip = false) => {
    let error = false
    if (e.text?.length === 0 && !tip) return true 
    if (e.text?.length > 777) error = "Message is too long"
    if ($user.wait) error = 'Please wait a couple of minutes before sending a message.'
    if (!error) return false

    window.api.errorMessage(error)
    return true
}

//Send message to store and DB
const sendRoomMsg = async (e, tipping = false, reaction = false) => {
    const error = checkErr(e, tipping)
    if (error) return
    let msg = e.text
    let myaddr = $user.myAddress
    let time = Date.now()
    const hash = await window.api.createGroup()
    let myName = $user.username
    let room = $swarm.activeSwarm?.key
    let in_swarm = true
    let in_channel = $swarm.activeChannel.name
    let tip = false
    //Reaction switch
    if (e.reply) {
        replyto = e.reply
    }

    if (e.tip) {
        tip = e.tip
    }
    
    //Construct a new json object (myGroupMessage) to be able to print our message instant.
    let myRoomMessage = {
        message: msg,
        grp: room,
        reply: replyto,
        address: myaddr,
        time: time,
        name: myName,
        hash: hash,
        sent: true,
        tip: tip
    }
    let sendMsg = {
        m: msg,
        g: room,
        r: replyto,
        k: myaddr,
        t: time,
        n: myName,
        hash: hash,
        swarm: in_swarm,
        sent: true,
        tip: tip
    }

    if (in_channel) {
        sendMsg.c = in_channel
    }

    $transactions.pending = false
    window.api.sendRoomMessage(sendMsg)
    printRoomMessage(myRoomMessage)
    replyExit()
    if (reaction) return
    scrollDown()
}


const scrollDown = () => {
    windowChat.scrollTop = windowChat.scrollTopMax
}

//Prints any single group message. 
const printRoomMessage = (roomMsg, file = false) => {
    if (
        roomMsg.reply.length === 64 &&
        roomMsg.message.length < 9 &&
        containsOnlyEmojis(roomMsg.message)
    ) {
        updateReactions(roomMsg)
    } else {
        fixedRooms.unshift(roomMsg)
    }
    roomMessages.update((current) => {
        return [roomMsg, ...current]
    })

    //If we sync older files, make sure to sort the incoming messages.
    if (file) {
      fixedRooms = removeDuplicates(fixedRooms.sort((a, b) => b.time - a.time)) 
    } else  fixedRooms = removeDuplicates(fixedRooms)
}


const removeDuplicates = (arr) => {
    let uniq = {}
    return arr.filter((obj) => !uniq[obj.hash] && (uniq[obj.hash] = true))
}

//Exit reply mode
const replyExit = () => {
    replyto = false
    rooms.update((data) => {
        return {
            ...data,
            replyTo: { reply: false },
        }
    })
}

//Enter reply mode
async function replyToMessage(hash, nickname, emoji = false) {
    if (replyto != false) {
        replyExit()
    }
    replyto = hash

    rooms.update((data) => {
        return {
            ...data,
            replyTo: {
                to: hash,
                nick: nickname,
                reply: true,
                emoji: emoji,
            },
        }
    })
}

//Default value should be false to hide the AddGroup form.
let wantToAdd = false

//Open AddGroup component and update state in store.
const openAddRoom = () => {
    wantToAdd = !wantToAdd

    if (!wantToAdd) {
       $rooms.addRoom = false
    }
}

//Adds new Group to groArray and prints that Group, its probably empty.
const addNewRoom = async (e) => {
    console.log("AAADDD ROOM INVITE", e)
    let room = e
    const admin = e.admin
    if (room.length < 32) return
    openAddRoom()
    //Avoid svelte collision
    let hash = Date.now().toString() + hashPadding()
    let add = {
        m: 'Joined Room',
        n: room.name,
        hash: hash,
        t: Date.now().toString(),
        s: '',
        sent: false,
        r: '',
        k: room.key,
        g: room.key,
        h: parseInt(Date.now() * 1000),
    }
    window.api.addRoom(add, admin)
    printRoom(room, true)
}

//Svelte reactive. Sets noMsgs boolean for welcome message.
run(() => {
        if ($roomMessages.length == 0) {
        noMsgs = true
    } else {
        noMsgs = false
    }
    });

function getActiveRoom(room) {
    return $keyboard.room.find(a => a.room === room)
}

//Print chosen group. SQL query to backend and then set result in Svelte store, then updates thisRoom.
async function printRoom(room, create = false) {
    $keyboard.input = ''
    loadMore = true
    pageNum = 0
    fixedRooms = []
    filterEmojis = []
    scrollGroups = []
    channelMessages = []
    filterRooms = []
    $roomMessages = []
    $rooms.activeHugins = []
    $swarm.activeSwarm = false
    //Return the latest messages
    console.log("Get messages")
    const messages = await getMessages(room)
    $roomMessages = messages

    if (create) {
        loader = true
        await sleep(777)

    }
    const active = $swarm.active.find(a => a.key === room.key)
    $swarm.activeSwarm = active
    $rooms.thisRoom = { key: room.key, name: room.name, chat: true, topic: active.topic}

    const inRoom = getActiveRoom(room.key)
    if (inRoom) $keyboard.input = inRoom.text
    $keyboard = $keyboard

    checkReactions(messages, false)
    replyExit()
    scrollDown()
    loader = false
}

function addFileMessage(array) {
    for (const msg of array) {
        const i = array.indexOf(msg)
        if (!msg.message && msg.tip === "") {
            array[i].message = ""
            continue
        }
        const file = isFile(msg)
        if (!file) continue
        if (parseInt(file.time) === parseInt(msg.time) || file.hash === msg.hash) {
       
        array[i].file = file
        }
    }
    return array
}

//Checks messages for reactions in chosen Room from printRoom() function
function checkReactions(array, scroll) {
    
    //Add any pending file message
    array = addFileMessage(array)
    //Only reactions
    filterEmojis = [...array.filter(
        (e) => e.reply.length === 64 && e.message.length < 15 && containsOnlyEmojis(e.message)
    ), ...filterEmojis]
    
       //All group messages all messages except reactions
       filterRooms = array.filter(
        (m) => !(m.reply.length === 64 && containsOnlyEmojis(m.message)) && !filterEmojis.includes(m)
    )
    
    if (filterEmojis.length) {
        //Adding emojis to the correct message.
        addEmoji(scroll)
    } else {
        if (scroll) fixedRooms = [...fixedRooms, ...array]
        else fixedRooms = filterRooms
    }
}


function addEmoji(scroll) {
    let emojis = filterEmojis
    let array = scroll ? [...fixedRooms, ...filterRooms] : filterRooms
    let newArr = []
    //Check for replies and message hash that match and then adds reactions to the messages.
    for (const a of array) {
        for (const b of emojis) {
            if (!a.react && b.reply == a.hash) {
                a.react = []
                b.hash = b.hash + hashPadding
                a.react.unshift(b)

            } else if (b.reply == a.hash) {
                b.hash = b.hash + hashPadding
                a.react.unshift(b)
            }
        
        newArr.push(a)
        }
    }
    fixedRooms = removeDuplicates(newArr)
}

async function updateReactions(msg) {

    fixedRooms.some(function (r) {
        if (r.hash == msg.reply && !r.react) {
            r.react = []
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        } else if (r.hash == msg.reply && r.react) {
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        }
    })
    fixedRooms = fixedRooms
}

const deleteMessage = async (hash) => {
    window.api.deleteMessage(hash)
    fixedRooms = fixedRooms.filter(a => a.hash !== hash)
}

async function loadMoreMessages() {
    pageNum++
    const more = await getMoreMessages()
    if (more.length === 0) {noLoad(); return}
    checkReactions(more, true)
}

const noLoad = () => {
    pageNum--; loadMore = false; return
}

async function getMessages(group) {
    return await window.api.printRoom(group.key, 0)
}

async function getMoreMessages() {
    return await window.api.printRoom($swarm.activeSwarm?.key, pageNum)
}

let dragover = $state(false)

function drag() {
    dragover = true
}

function nodrag() {
    dragover = false
}

async function dropFile(e) {
    dragover = false
    const { acceptedFiles, fileRejections } = e.detail
    const filename = acceptedFiles[0].name
    const path = acceptedFiles[0].path
    const size = acceptedFiles[0].size
    const time = Date.now()
    
    acceptedFiles[0].time = time
    acceptedFiles[0].fileName = filename
    acceptedFiles[0].saved = true

    if (fileRejections.length) {
        console.log('rejected file')
        return
    }
    const hash = await window.api.createGroup()
    const message = {
        message: 'File shared',
        grp: $swarm.activeSwarm?.key,
        name: $user.username,
        address: $user.myAddress,
        reply: "",
        timestamp: time,
        file: acceptedFiles[0],
        sent: true,
        channel: "Room",
        joined: true,
        hash: hash,
        time: time
    }
    $files.push(acceptedFiles[0])
    $localFiles.push(acceptedFiles[0])
    $localFiles = $localFiles
    $files = $files
    printRoomMessage(message)
    window.api.groupUpload(filename, path, $swarm.activeSwarm?.key, size, time, hash)
}

// function setChannels() {
//     let in_swarm = $swarm.active.find(a => a.key === thisRoom)
//     if (in_swarm) {
//         let uniq = {}
//         // if (!channelMessages.some(a => a.channel && a.grp === thisRoom)) return
//         const channels = channelMessages.filter((obj) => !uniq[obj.channel] && (uniq[obj.channel] = true))
//         // if (!channels) return
//         const mapped = [{name: "Chat room"}]
//         in_swarm.channels = mapped
//         $swarm.active = $swarm.active
//     }
// }

// const printChannel = async (name) => {
//     let filter = $notify.unread.filter((a) => a.channel !== name)
//     $notify.unread = filter
//     fixedRooms = []
//     filterEmojis = []
//     let channel = channelMessages.filter(a => a.channel === name)
//     $swarm.activeChannelMessages = channel
//     //await checkReactions(channel)

// }

const sendTransaction = async (e) => {
    $transactions.tip = false
    $transactions.send = false
    let tx = e
    $transactions.pending = tx
    const sent = await window.api.sendTransaction(tx)
    if (sent) {
        const e = {
        text: "",
         tip: {
            amount: $transactions.pending.amount,
            receiver: fixedRooms.find(a => a.address === $transactions.pending.to).name
        }
    }
        sendRoomMsg(e, true)
    } else {
        $transactions.pending = false
    }
}

const hideModal = () => {
    $transactions.tip = false
    $transactions.send = { name: '' }
}


let imTyping = false
const typing = (e) => {
    if (imTyping === e.typing) return
    imTyping = e.typing
    window.api.send('typing', {key: $swarm.activeSwarm.key, typing: e.typing})
}

</script>



{#if dragover}
    <DropFile />
{/if}

<!-- {#if $swarm.newChannel === true}
 <NewChannel/>
{/if} -->

{#if $transactions.tip}
    <SendTransaction on:click="{hideModal}" onSendTx="{(e) => sendTransaction(e)}" />
{/if}


{#if $rooms.addRoom}
    <AddRoom on:click="{openAddRoom}" onAddRoom="{(e) => addNewRoom(e)}" />
{/if}

{#if $user.block}
    <BlockContact />
{/if}

{#if $fileViewer.enhanceImage && $page.url.pathname === '/rooms'}
    <BigImage />
{/if}

<Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> drag()} on:dragleave={()=> nodrag()} on:drop={(e) => dropFile(e)}>
<main in:fade|global="{{ duration: 250 }}">
    <RoomList
        onPrintRoom="{(e) => printRoom(e)}"
        onRemoveRoom="{() => printRoom($rooms.roomArray[0])}"
    />
    
    <div class="right_side" out:fade|global="{{ duration: 100 }}">
      
        <TopBar />
        
        <div class="outer" id="group_chat_window" bind:this={windowChat} bind:clientHeight={windowHeight} in:fly|global="{{ y: 50 }}">
            {#if !$rooms.banned.some(a => a === $rooms.thisRoom?.key)}
            {#if (fixedRooms.length === 0 && !$rooms.roomArray.some(a => a.key === welcomeAddress) && !$rooms.thisRoom.chat) || loader}
                <div>
                    <Loader/>
                </div>
            {/if}
             <div class="fade"></div>
            {#each fixedRooms as message (message.hash)}
            <div animate:flip="{{duration: 150}}">
                <GroupMessage
                    ReactTo="{(e) => sendRoomMsg(e, false, true)}"
                    ReplyTo="{(e) => replyToMessage(message.hash, message.name)}"
                    DeleteMsg="{(e) => deleteMessage(message.hash)}"
                    JoinRoom="{(e) => addNewRoom(e)}"
                    message="{message}"
                    reply="{message.reply}"
                    msg="{message.message}"
                    myMsg="{message.sent}"
                    group="{message.grp}"
                    nickname="{message.name}"
                    msgFrom="{message.address}"
                    timestamp="{message.time}"
                    hash="{message.hash}"
                    file="{message?.file}"
                    room="{true}"
                    admin="{admin}"
                    tip="{message.tip}"
                />
            </div>
            {/each}
            {#if (fixedRooms.length + filterEmojis.length) > 49 && loadMore } 
                <Button text={"Load more"} disabled={false} on:click={() => loadMoreMessages()} />
            {/if}
            {:else}
            <FillButton disabled={true} red={true} text="Banned"/>
            {/if}
        </div>
        {#if replyTrue}
            <div class="reply_to_exit" class:reply_to="{replyTrue}" onclick={() => replyExit()}>
                {reply_exit_icon} Reply to {$rooms.replyTo.nick}
            </div>
        {/if}
        {#if usersTyping > 0}
            <div class="typing">
                {#if usersTyping > 1}
                    {usersTyping} users are typing...
                {:else}
                    {someoneTyping.name} is typing...
                {/if}
            </div>
        {/if}
        <ChatInput onMessage="{(e) => sendRoomMsg(e)}" onTyping={(e) => typing(e)} />
    </div>
    <RoomHugins />
</main>
</Dropzone>

<style lang="scss">
h3 {
    font-size: 16px;
    color: var(--title-color);
}

h1 {
    color: var(--title-color);
    margin: 0;
}

main {
    display: flex;
    margin-left: 85px;
    margin-right: 0px;
    z-index: 3;
    height: 100vh;
    width: 100%;
}

#board_box {
    width: 350px;
    border-left: 1px solid var(--border-color);
    overflow: hidden;
}

p {
    font-size: 17px;
    color: var(--text-color);
}

.reply_to_exit {
    width: 50px;
    padding-right: 5px;
    display: none;
    color: var(--text-color);
}

.reply_to {
    background: var(--backgound-color);
    display: inline-flex;
    font-size: 11px;
    height: 22px;
    font-family: "Montserrat";
    font-weight: 100;
    position: absolute;
    bottom: 50px;
    left: 0px;
    justify-content: center;
    color: var(--success-color);
    padding: 4px;
    width: fit-content;
    z-index: 9;
    border: px solid;
    cursor: pointer;
}

.typing {
    background: var(--backgound-color);
    display: inline-flex;
    font-size: 10px;
    font-weight: bold;
    height: 22px;
    font-family: "Montserrat";
    font-weight: 100;
    position: absolute;
    bottom: 2px;
    left: 0px;
    justify-content: center;
    color: var(--text-color);
    padding: 4px;
    width: fit-content;
    z-index: 9;
    border: px solid;
    cursor: pointer;
}

.left_side {
    display: flex;
    flex-direction: column;
    width: 100%;
}

.right_side {
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    width: 100%;
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
    overflow: auto;
    padding-bottom: 5px;
    position: initial !important;
    height: calc(100% - 131px);
}

.fade {
    position: absolute;
    top: 57px;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, var(--fade-color),var(--fade-to-color));
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