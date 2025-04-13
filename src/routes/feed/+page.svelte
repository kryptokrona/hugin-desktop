<script>
    import { run } from 'svelte/legacy';

import {fade, fly} from 'svelte/transition'
import FeedChatInput from '$lib/components/chat/FeedChatInput.svelte'
import {roomMessages} from '$lib/stores/roommsgs.js'
import FeedMessage from '$lib/components/chat/FeedMessage.svelte'
import {notify, user, swarm, rooms, misc, files, transactions, feed} from '$lib/stores/user.js'
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
import BigImage from "$lib/components/popups/BigImage.svelte"
import FillButton from "$lib/components/buttons/FillButton.svelte"
import Backward from "$lib/components/icons/Backward.svelte"
import SendTransaction from "$lib/components/finance/SendTransaction.svelte"
import AddCircle from '$lib/components/icons/AddCircle.svelte';
import { get_avatar, getColorFromHash } from '$lib/utils/hugin-utils.js'


let replyto = ''
let reply_exit_icon = 'x'
let noMsgs = $state(false)
let loader = $state(false)
let expanded = $state(false)
let textMessages = $state([])
let emojiMessages = $state([])
let feedMessages = $state([])
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
let focusedMessage = $state({});

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
        return arr.find(a => a.hash === data.hash && parseInt(data.time) === parseInt(a.time))
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
}

onMount(async () => {
    $fileViewer.enhanceImage = false
    $fileViewer.focusImage = ""
    printFeed()
    // scrollDown()
    
})

onDestroy(() => {
    window.api.removeAllListeners('roomMsg')
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
    if (e.text.length === 0 && !tip) return true 
    if (e.text === '💬') return true;
    if (e.text.length > 777) error = "Message is too long"
    if ($user.wait) error = 'Please wait a couple of minutes before sending a message.'
    if (!error) return false

    window.api.errorMessage(error)
    return true
}

//Send message to store and DB
const sendFeedMsg = async (e, tipping = false) => {
    const error = checkErr(e, tipping)
    if (error) return
    let message = e.text
    const reply = e.reply || focusedMessage?.hash || '';
    const new_message = await window.api.sendFeedMessage({message, reply});
    new_message.replies = [];
    new_message.react = [];
    printFeedReply(new_message)
    if (new_message.reply == focusedMessage.hash) {
        updateReactionsFocused(new_message)
        feedMessages = [...feedMessages];
    } else {
        printRoomMessage(new_message)
    }
    if(new_message?.reply?.length == 0) focusMessage(new_message);
}

const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
}

const scrollDown = () => {
    return;
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
        if (roomMsg?.reply?.length) return;
        feedMessages.unshift(roomMsg)
    }
    feedMessages = removeDuplicates(feedMessages)
}

const printFeedReply = (reply) => {
    if (reply.reply == '') return;
    if (
        reply.reply.length === 64 &&
        reply.message.length < 9 &&
        containsOnlyEmojis(reply.message)
    ) {
        updateReactionsReply(reply)
    } else {
        focusedMessage.replies.push(reply);
    }
    focusedMessage = focusedMessage;
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

//Print chosen group. SQL query to backend and then set result in Svelte store, then updates thisRoom.
async function printFeed() {
    loadMore = true
    pageNum = 0
    $feed.new = []
    feedMessages = await window.api.getFeedMessages()
    emojiMessages = []
    textMessages = []
    console.log("Get messages", feedMessages)
    replyExit()
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
    emojiMessages = [...array.filter(
        (e) => e.reply.length === 64 && e.message.length < 15 && containsOnlyEmojis(e.message)
    ), ...emojiMessages]
    
       //All group messages all messages except reactions
       textMessages = array.filter(
        (m) => !(m.reply.length === 64 && emojiMessages.includes(m)) && !containsOnlyEmojis(m.message)
    )
    
    if (emojiMessages.length) {
        //Adding emojis to the correct message.
        addEmoji(scroll)
    } else {
        if (scroll) feedMessages = [...feedMessages, ...array]
        else feedMessages = textMessages
    }
}


function addEmoji(scroll) {
    let emojis = emojiMessages
    let array = scroll ? [...feedMessages, ...textMessages] : textMessages
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
    feedMessages = removeDuplicates(newArr)
}

async function updateReactions(msg) {

    feedMessages.some(function (r) {
        if (focusedMessage.hash == msg.hash) return;
        if (r.hash == msg.reply && !r.react) {
            r.react = []
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        } else if (r.hash == msg.reply && r.react) {
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        }
    })
    feedMessages = feedMessages
}

async function updateReactionsReply(msg) {

    focusedMessage.replies.some(function (r) {
        if (r.hash == msg.reply && !r.react) {
            r.react = []
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        } else if (r.hash == msg.reply && r.react) {
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        }
    })
    focusedMessage = focusedMessage

}

async function updateReactionsFocused(msg) {

if (focusedMessage.hash == msg.reply) {

    if (containsOnlyEmojis(msg.message)) {
        focusedMessage.react.push(msg);
    } else {
        focusedMessage.react.push({message:'💬'})
    }
    
}

focusedMessage = focusedMessage

}

const deleteMessage = async (hash) => {
    window.api.deleteMessage(hash)
    feedMessages = feedMessages.filter(a => a.hash !== hash)
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

const setExpanded = () => {
    if (expanded) {
        expanded = false; 
        focusedMessage = {}
        $feed.expanded = false
    } else {
        expanded = true;
        $feed.expanded = true  
    }
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
//     feedMessages = []
//     emojiMessages = []
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
    return;
    if (sent) {
        const e = {
        detail: {
        text: "",
         tip: {
            amount: $transactions.pending.amount,
            receiver: feedMessages.find(a => a.address === $transactions.pending.to).name
        }
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

const focusMessage = async (message) => {
    console.log('Focus message:', message);
    for (const reply of message?.replies) {
        const {replies, reactions} = await window.api.getFeedReplies(reply.hash);
        reply.replies = replies;
        reply.react = reactions;
    }
    focusedMessage = message;
    expanded = true;

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
<main in:fade|global="{{ duration: 350 }}">
    
    <div class="feed_container" in:fade|global="{{ duration: 350 }}" out:fade|global="{{ duration: 100 }}">
        
        <div class="outer" id="group_chat_window" bind:this={windowChat} bind:clientHeight={windowHeight} in:fly|global="{{ y: 50 }}">
            
            <!-- {#if (feedMessages.length === 0 && !$rooms.roomArray.some(a => a.key === welcomeAddress) && !$rooms.thisRoom.chat) || loader}
                <div>
                    <Loader/>
                </div>
            {/if} -->
            {#if $feed.new.length} 
                <div class="unread" onclick={() => printFeed()}>
                        <div class="unread_avatars">
                            {#each $feed.new.slice(-3) as message}
                                {#await check_avatar(message.address)}
                                {:then avatar}
                                {#if avatar}
                                    <img
                                        class="custom-avatar"
                                        src="{avatar}"
                                        alt=""
                                    />
                                {:else}
                                    <img
                                    style="background: {getColorFromHash(message.hash)}"
                                    class="avatar"
                                    src="data:image/png;base64,{get_avatar(message.address)}"
                                    alt=""
                                />
                                {/if}
                                {/await}
                            {/each}
                        </div>
                        <p style="cursor: pointer">{$feed.new.length} new messages</p>
                </div>
            {/if}
            {#each feedMessages as message (message.hash)}
            {#if feedMessages.length === 0}
            <div><p>Placeholder for no messages</p></div>
            {/if}
                <FeedMessage
                    onPress={() => focusMessage(message)}
                    ReactTo="{(e) => sendFeedMsg(e)}"
                    ReplyTo="{(e) => replyToMessage(message.hash, message.name)}"
                    DeleteMsg="{(e) => deleteMessage(message.hash)}"
                    message="{message}"
                />
            {/each}
            {#if (feedMessages.length + emojiMessages.length) > 49 && loadMore } 
                <Button text={"Load more"} disabled={false} on:click={() => loadMoreMessages()} />
            {/if}

        </div>
        <div class:expanded={expanded} class="message_details right_side" in:fly|global="{{ y: 50 }}">
            <span class:expanded={expanded} class="go_back" onclick={setExpanded}>
                {#if (expanded)}
                <Backward />
                {:else}
                <AddCircle />
                {/if}
            </span>
            {#if (focusedMessage?.hash?.length)}
            <div class="focused_message">
                <FeedMessage
                onPress={() => {}}
                ReactTo="{(e) => sendFeedMsg(e)}"
                ReplyTo="{(e) => replyToMessage(message.hash, message.name)}"
                DeleteMsg="{(e) => deleteMessage(message.hash)}"
                message="{focusedMessage}"
            />
            {#each focusedMessage.replies as message (message.hash)}
            <FeedMessage
                onPress={() => focusMessage(message)}
                ReactTo="{(e) => sendFeedMsg(e)}"
                ReplyTo="{(e) => replyToMessage(message.hash, message.name)}"
                DeleteMsg="{(e) => deleteMessage(message.hash)}"
                message="{message}"
            />
            {/each}
            </div>
            {:else if expanded}
            <div in:fade="{{ duration: 1300 }}" class="feed-start"><p>Type a message below to start a new discussion!</p></div>
            {/if}
            <div class:expanded={expanded} class="messageinput">
                <FeedChatInput onMessage="{(e) => sendFeedMsg(e)}" />
            </div>
        </div>
        {#if replyTrue}
            <div class="reply_to_exit" class:reply_to="{replyTrue}" onclick={() => replyExit()}>
                {reply_exit_icon} Reply to {$rooms.replyTo.nick}
            </div>
        {/if}
    </div>
</main>
</Dropzone>

<style lang="scss">

.feed-start {
    width: 50%;
    text-align: center;
    margin: auto;
}

.feed-start p {
    padding: 20px;
    font-family: "Montserrat";
    font-size: 14px;
    opacity: 0.8;
}

.unread_avatars {
  display: flex;
}

.unread img {
    margin-left: -10px;
    border-radius: 50%;
    width: 26px;
    border: 1px solid var(--background-color);
}

.unread_avatars img:first-child {
  margin-left: 0;
}

.go_back {
    border-radius: 50%;
    position: absolute;
    top: calc(50% - 21px);
    left: -21px;
    color: var(--text-color);
    text-align: center;
    vertical-align: middle;
    line-height: 42px;
    height: 42px;
    width: 42px;
    font-size: 24pt;
    background-color: var(--background-color);
    border: 1px solid var(--border-color);
    cursor: pointer;
    z-index: 999;
    rotate: 0deg;
}

.messageinput.expanded {
    display: flex;
}

.messageinput {
    display: none;
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
}

.go_back.expanded {
    rotate: 180deg;
    line-height: 40px;
}

.message_details.expanded {
    width: 100% !important;
    transition: 200ms ease-in-out;
}

.expanded {
    transition: 0.2s all;
}

.new_post:hover {
    background-color: var(--fade-color);
    transition: all 0.2s;
}

.feed_container {
    width: calc(100% - 85px);
    display: flex;
    flex-direction: row;
}

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
    position: relative;
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
    height: 25px;
    font-family: 'Montserrat';
    font-weight: 100;
    position: absolute;
    bottom: 55px;
    left: 17px;
    justify-content: center;
    color: var(--text-color);
    padding: 4px;
    width: fit-content;
    z-index: 9;
    border: 1px solid;
    border-radius: 2px;
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
    flex-direction: column;
    overflow: auto;
    padding-bottom: 5px;
    position: initial !important;
    display: flex;
    width: 100%;
}

.message_details {
    width: 10%;
    display: flex;
    border-left: 1px solid var(--border-color);
    position: relative;
    justify-content: flex-start !important;
    transition: 200ms ease-in-out;
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
.unread p {
    font-size: 12px;
    font-family: "Montserrat";
    margin-left: 7px;
} 

.unread {
    height: 45px;
    display: flex;
    position: relative;
    align-items: center;
    border-bottom: 5px;
    cursor: pointer;
    transition: 200ms ease-in-out;
    justify-content: space-evenly;
    border-radius: 22.5px;
    border: 1px solid var(--border-color);
    position: absolute;
    background: var(--background-color);
    padding: 15px;
    left: 25%;
    top: 15px;
}


</style>