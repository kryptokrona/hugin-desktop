<script>
import RoomHugins from "./components/RoomHugins.svelte"
import RoomList from "./components/RoomList.svelte"

import {fade, fly} from 'svelte/transition'
import ChatInput from '$lib/components/chat/ChatInput.svelte'
import {roomMessages} from '$lib/stores/roommsgs.js'
import GroupMessage from '$lib/components/chat/GroupMessage.svelte'
import {notify, user, swarm, rooms, misc} from '$lib/stores/user.js'
import {onDestroy, onMount} from 'svelte'
import AddGroup from '$lib/components/chat/AddGroup.svelte'
import {page} from '$app/stores'
import BlockContact from '$lib/components/chat/BlockContact.svelte'
import { containsOnlyEmojis, hashPadding, sleep } from '$lib/utils/utils'
import Loader from '$lib/components/popups/Loader.svelte'
import Button from '$lib/components/buttons/Button.svelte'
import Dropzone from "svelte-file-dropzone";
import DropFile from '$lib/components/popups/DropFile.svelte'
import { localFiles } from '$lib/stores/files'

let replyto = ''
let reply_exit_icon = 'x'
let noMsgs = false
let filterRooms = []
let filterEmojis = []
let fixedRooms = []
let replyTrue = false
let scrollGroups = []
let windowHeight
let windowChat
let channelMessages = []
let pageNum = 0;
let loadMore = true
const welcomeAddress = $misc.welcomeAddress

$: thisRoom = $rooms.thisRoom.key

$: wantToAdd = $rooms.addRoom

$: replyTrue = $rooms.replyTo.reply

onMount(async () => {
    scrollDown()

    //Listens for new messages from backend
    window.api.receive('roomMsg', (data) => {
        const thisroom = data.group === $rooms.thisRoom.key
        const inrooms = $page.url.pathname === '/rooms'
        if (data.address === $user.myAddress) return
        if (data.channel.length) {
            if (thisroom && inrooms && data.channel === $swarm.activeChannel.name) {
                printRoomMessage(data)
            }

            return
        } else {
    
        console.log('Another group', data)
        }
    })
    
})

onDestroy(() => {
    window.api.removeAllListeners('roomMsg')
    window.api.removeAllListeners('sent_room')
    window.api.removeAllListeners('set-channels')
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
const checkErr = (e) => {
    let error = false
    if (e.detail.text.length === 0) return true 
    if (e.detail.text.length > 777) error = "Message is too long"
    if ($user.wait) error = 'Please wait a couple of minutes before sending a message.'
    if (!error) return false

    window.api.errorMessage(error)
    return true
}

//Send message to store and DB
const sendRoomMsg = async (e) => {
    const error = checkErr(e)
    if (error) return
    let msg = e.detail.text
    let myaddr = $user.myAddress
    let time = Date.now()
    let myName = $user.username
    let group = thisRoom
    let in_swarm = true
    let in_channel = $swarm.activeChannel.name
    let offchain = true
    //Reaction switch
    if (e.detail.reply) {
        replyto = e.detail.reply
    }
    
    //Construct a new json object (myGroupMessage) to be able to print our message instant.
    let myRoomMessage = {
        message: msg,
        grp: group,
        reply: replyto,
        address: myaddr,
        time: time,
        name: myName,
        hash: time,
        sent: true
    }
    let sendMsg = {
        m: msg,
        g: group,
        r: replyto,
        k: myaddr,
        t: time,
        n: myName,
        hash: time,
        swarm: in_swarm
    }

    if (in_channel) {
        sendMsg.c = in_channel
    }
    
    window.api.sendGroupMessage(sendMsg, offchain, in_swarm)
    printRoomMessage(myRoomMessage)
    replyExit()
    scrollDown()
}


const scrollDown = () => {
    windowChat.scrollTop = windowChat.scrollTopMax
}

//Prints any single group message. 
const printRoomMessage = (roomMsg) => {
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
    fixedRooms = fixedRooms
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
        rooms.update((data) => {
            return {
                ...data,
                addGroup: false,
            }
        })
    }
}

//Adds new Group to groArray and prints that Group, its probably empty.
const addNewRoom = async (e) => {
    let room = e.detail
    if (room.length < 32) return
    openAddRoom()
    //Avoid svelte collision
    let hash = Date.now().toString() + hashPadding()
    let add = {
        m: 'Joined group',
        n: group.name,
        hash: hash,
        t: Date.now().toString(),
        s: '',
        sent: false,
        r: '',
        k: group.key,
        g: group.key,
        h: parseInt(Date.now() * 1000),
    }
    $roomMessages = []
    window.api.addRoom(add)
    await sleep(100)
    printRoom(group)
}

//Svelte reactive. Sets noMsgs boolean for welcome message.
$: if ($roomMessages.length == 0) {
    noMsgs = true
} else {
    noMsgs = false
}

//Print chosen group. SQL query to backend and then set result in Svelte store, then updates thisRoom.
async function printRoom(room) {
    loadMore = true
    pageNum = 0
    fixedRooms = []
    filterEmojis = []
    scrollGroups = []
    channelMessages = []
    filterRooms = []
    noMsgs = false

    rooms.update((data) => {
        return {
            ...data,
            thisRoom: { key: room.key, name: room.name, chat: true},
        }
    })
    
    //Return the latest messages
    const messages = await getMessages(room)
    roomMessages.set(messages)

    checkReactions(messages, false)
    replyExit()
    scrollDown()
}

//Checks messages for reactions in chosen Room from printRoom() function
function checkReactions(array, scroll) {
    
    //Add any pending file message
    array = addFileMessage(array)
    //Only reactions
    filterEmojis = [...array.filter(
        (e) => e.reply.length === 64 && e.message.length < 9 && containsOnlyEmojis(e.message)
    ), ...filterEmojis]
    
       //All group messages all messages except reactions
       filterRooms = array.filter(
        (m) => m.message.length > 0 && !(m.reply.length === 64 && filterEmojis.includes(m))
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
    const already = (a) => {
        return fixedRooms.some(e => e === a)
    }
    //Check for replies and message hash that match and then adds reactions to the messages.
    for (const a of array) {
        for (const b of emojis) {
            if (!a.react && b.reply == a.hash) {
                a.react = []
                b.hash = b.hash + hashPadding
                a.react.push(b)

            } else if (b.reply == a.hash) {
                b.hash = b.hash + hashPadding
                a.react.push(b)
            }
        
        if (already(a)) continue
        fixedRooms.push(a)
        }
    }
    fixedRooms = fixedRooms
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
    return await window.api.printRoom(thisRoom, pageNum)
}

let dragover = false

function drag() {
    dragover = true
}

function nodrag() {
    dragover = false
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
</script>



{#if dragover}
    <DropFile />
{/if}

<!-- {#if $swarm.newChannel === true}
 <NewChannel/>
{/if} -->

<!-- ///FIXIXIXIXX -->

{#if wantToAdd}
    <AddRoom on:click="{openAddRoom}" on:addRoom="{(e) => addNewRoom(e)}" />
{/if}

{#if $user.block}
    <BlockContact />
{/if}

<Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> drag()} on:dragleave={()=> nodrag()} on:drop={(e) => console.log(e)}>
<main in:fade="{{ duration: 350 }}">
    <RoomList
        on:printRoom="{(e) => printRoom(e.detail)}"
        on:removeRoom="{() => printRoom($rooms.roomArray[0])}"
    />
    
    <div class="right_side" in:fade="{{ duration: 350 }}" out:fade="{{ duration: 100 }}">
       
        <div class="fade"></div>
        <div class="outer" id="group_chat_window" bind:this={windowChat} bind:clientHeight={windowHeight} in:fly="{{ y: 50 }}">
            {#if fixedRooms.length === 0 && !$rooms.roomArray.some(a => a.key === welcomeAddress) && !$rooms.thisRoom.chat}
                <div>
                    <Loader/>
                </div>
            {/if}
            {#each fixedRooms as message (message.hash)}
                <GroupMessage
                    on:reactTo="{(e) => sendRoomMsg(e)}"
                    on:replyTo="{(e) => replyToMessage(message.hash, message.name)}"
                    on:deleteMsg="{(e) => deleteMessage(message.hash)}"
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
                />
            {/each}
            {#if (fixedRooms.length + filterEmojis.length) > 49 && loadMore } 
                <Button text={"Load more"} disabled={false} on:click={() => loadMoreMessages()} />
            {/if}
            
        </div>
        {#if replyTrue}
            <div class="reply_to_exit" class:reply_to="{replyTrue}" on:click="{() => replyExit()}">
                {reply_exit_icon} Reply to {$rooms.replyTo.nick}
            </div>
        {/if}
        <ChatInput on:message="{(e) => sendRoomMsg(e)}" />
    </div>
    <RoomHugins />
</main>
</Dropzone>

<style lang="scss">
h3 {
    font-size: 16px;
    color: white;
}

h1 {
    color: white;
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
    color: white;
}

.reply_to_exit {
    width: 50px;
    padding-right: 5px;
    display: none;
}

.reply_to {
    display: inline-flex;
    font-size: 10px;
    font-family: 'Roboto Mono';
    font-weight: 100;
    position: absolute;
    left: 10%;
    justify-content: center;
    color: white;
    padding: 4px;
    width: fit-content;
    z-index: 9;
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
    padding-top: 22px;
    position: initial !important;
    // &::-webkit-scrollbar {
    //     display: none;
    // }
}

.fade {
    position: absolute;
    top: 0;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, #121212, #12121200);
    z-index: 100;
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