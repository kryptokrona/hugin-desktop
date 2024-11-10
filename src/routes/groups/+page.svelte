<script>
import {fade, fly} from 'svelte/transition'
import ChatInput from '$lib/components/chat/ChatInput.svelte'
import {groupMessages} from '$lib/stores/groupmsgs.js'
import GroupMessage from '$lib/components/chat/GroupMessage.svelte'
import GroupList from '$lib/components/chat/GroupList.svelte'
import {groups, notify, user, swarm} from '$lib/stores/user.js'
import {onDestroy, onMount} from 'svelte'
import AddGroup from '$lib/components/chat/AddGroup.svelte'
import {page} from '$app/stores'
import InfiniteScroll from "svelte-infinite-scroll";
import BlockContact from '$lib/components/chat/BlockContact.svelte'
import { containsOnlyEmojis, hashPadding, sleep } from '$lib/utils/utils'
import Loader from '$lib/components/popups/Loader.svelte'
import GroupHugins from '$lib/components/chat/GroupHugins.svelte'
import { getBestApi, nodelist } from '$lib/stores/nodes.js'
import Button from '$lib/components/buttons/Button.svelte'
import Dropzone from "svelte-file-dropzone";
import DropFile from '$lib/components/popups/DropFile.svelte'
import { localFiles } from '$lib/stores/files'

let replyto = ''
let reply_exit_icon = 'x'
let noMsgs = false
let filterGroups = []
let filterEmojis = []
let fixedGroups = []
let replyTrue = false
let scrollGroups = []
let windowHeight
let windowChat
let channelMessages = []
let pageNum = 0;
let loadMore = true
const welcomeAddress = "SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1"


onMount(async () => {
    scrollDown()

    //Listens for new messages from backend
    window.api.receive('groupMsg', (data) => {
        const thisgroup = data.group === $groups.thisGroup.key
        const ingroups = $page.url.pathname === '/groups'
        if (data.address === $user.myAddress) return
        if (thisgroup && ingroups) {
            //Push new message to store
            printGroupMessage(data)
        } else {
            console.log('Another group', data)
        }
    })
    
})

onDestroy(() => {
    window.api.removeAllListeners('groupMsg')
    window.api.removeAllListeners('sent_group')
    window.api.removeAllListeners('set-channels')
})

window.api.receive('sent_group', (data) => {
    addHash(data)
})


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
const sendGroupMsg = async (e) => {
    const error = checkErr(e)
    if (error) return
    let msg = e.detail.text
    let myaddr = $user.myAddress
    let time = Date.now()
    let myName = $user.username
    let group = thisGroup
    let in_swarm = $swarm.active.some(a => a.key === thisGroup && $swarm.showVideoGrid)
    let in_channel = $swarm.activeChannel.name
    let offchain = in_swarm
    //Reaction switch
    if (e.detail.reply) {
        replyto = e.detail.reply
    }
    
    //Construct a new json object (myGroupMessage) to be able to print our message instant.
    let myGroupMessage = {
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

    if (in_channel && in_swarm) {
        sendMsg.c = in_channel
        myGroupMessage.channel = in_channel
        channelMessages.unshift(myGroupMessage)
        //Doin this global store for better use in future
        $swarm.activeChannelMessages.unshift(myGroupMessage)
    }
    
    window.api.sendGroupMessage(sendMsg, offchain, in_swarm)
    printGroupMessage(myGroupMessage)
    replyExit()
    scrollDown()
}


const scrollDown = () => {
    windowChat.scrollTop = windowChat.scrollTopMax
}

//Prints any single group message. 
const printGroupMessage = (groupMsg) => {

    if (
        groupMsg.reply.length === 64 &&
        groupMsg.message.length < 9 &&
        containsOnlyEmojis(groupMsg.message)
    ) {
        updateReactions(groupMsg)
    } else {
        fixedGroups.unshift(groupMsg)
    }
    groupMessages.update((current) => {
        return [groupMsg, ...current]
    })
    fixedGroups = fixedGroups
}

//Reactive, updates thisGroup.
$: thisGroup = $groups.thisGroup.key

//Exit reply mode
const replyExit = () => {
    replyto = false
    groups.update((data) => {
        return {
            ...data,
            replyTo: { reply: false },
        }
    })
}

//Enter reply mode
async function replyToMessage(hash, nickname, emoji = false) {
    if (replyto != false) {
        await replyExit()
    }
    replyto = hash

    groups.update((data) => {
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
const openAddGroup = () => {
    wantToAdd = !wantToAdd

    if (!wantToAdd) {
        groups.update((data) => {
            return {
                ...data,
                addGroup: false,
            }
        })
    }
}
//Adds new Group to groArray and prints that Group, its probably empty.
const addNewGroup = async (e) => {
    let group = e.detail
    if (group.length < 32) return
    openAddGroup()
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
    $groupMessages = []
    window.api.addGroup(add)
    await sleep(100)
    // let settings = {}
    // settings.recommended_api = await getBestApi()
    // settings.timeframe = 14
    // settings.key = group.key
    //await sleep(200)
    printGroup(group)
    //if (settings.recommended_api) window.api.fetchGroupHistory(settings)
}

//Svelte reactive. Sets noMsgs boolean for welcome message.
$: if ($groupMessages.length == 0) {
    noMsgs = true
} else {
    noMsgs = false
}

//Print chosen group. SQL query to backend and then set result in Svelte store, then updates thisGroup.
async function printGroup(group) {
    loadMore = true
    pageNum = 0
    fixedGroups = []
    filterEmojis = []
    scrollGroups = []
    channelMessages = []
    filterGroups = []
    noMsgs = false

    groups.update((data) => {
        return {
            ...data,
            thisGroup: { key: group.key, name: group.name, chat: true},
        }
    })
    
    //Return the latest messages
    const messages = await getMessages(group)
    groupMessages.set(messages)
    //Only mempool messages
    const chain_messages = messages.filter(a => !a.channel)
    //Setting active channelmessages if they we need them
    //$swarm.activeChannelMessages = messages.filter(a => a.channel)
    //printChannel($swarm.activeChannel.name)
    //Reset active channel if we toggle from Room view
    $swarm.activeChannel = {name: "", key: ""}

    checkReactions(chain_messages, false)
    replyExit()
    scrollDown()
}

function addFileMessage(array) {
    for (const msg of array) {
        const [file, found] = isTorrent(msg)
        if (!file && !found) continue
        if (file && !found) {
            msg.message = "Torrent shared ⚡️"
            continue
        }
        if (file && found) {
            if (file.time === parseInt(msg.time) || file.hash === msg.hash) {
            const i = array.indexOf(msg)
            array[i].file = file
        }
        }
    }
    return array
}

//Checks messages for reactions in chosen Group from printGroup() function
function checkReactions(array, scroll) {
    
    //Add any pending file message
    // array = addFileMessage(array)
    //Only reactions
    filterEmojis = [...array.filter(
        (e) => e.reply.length === 64 && e.message.length < 9 && containsOnlyEmojis(e.message)
    ), ...filterEmojis]
    
       //All group messages all messages except reactions
       filterGroups = array.filter(
        (m) => m.message.length > 0 && !(m.reply.length === 64 && filterEmojis.includes(m))
    )
    
    if (filterEmojis.length) {
        //Adding emojis to the correct message.
        addEmoji(scroll)
    } else {
        if (scroll) fixedGroups = [...fixedGroups, ...array]
        else fixedGroups = filterGroups
    }
}


function addEmoji(scroll) {
    let emojis = filterEmojis
    let array = scroll ? [...fixedGroups, ...filterGroups] : filterGroups
    const already = (a) => {
        return fixedGroups.some(e => e === a)
    }
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
        
        if (already(a)) continue
        fixedGroups.push(a)
        }
    }
    fixedGroups = fixedGroups
    }

   


function setChannels() {
    let in_swarm = $swarm.active.find(a => a.key === thisGroup)
    if (in_swarm) {
        let uniq = {}
        // if (!channelMessages.some(a => a.channel && a.grp === thisGroup)) return
        const channels = channelMessages.filter((obj) => !uniq[obj.channel] && (uniq[obj.channel] = true))
        // if (!channels) return
        const mapped = [{name: "Chat room"}]
        in_swarm.channels = mapped
        $swarm.active = $swarm.active
    }
}

async function updateReactions(msg) {

    fixedGroups.some(function (r) {
        if (r.hash == msg.reply && !r.react) {
            r.react = []
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        } else if (r.hash == msg.reply && r.react) {
            msg.hash = msg.hash + hashPadding
            r.react.push(msg)
        }
    })
    fixedGroups = fixedGroups
}

//Reactive depending on user.addGroup boolean, displays AddGroup component.
$: wantToAdd = $groups.addGroup

$: replyTrue = $groups.replyTo.reply

function addHash(data) {
    fixedGroups.some(function (a) {
        if (a.hash === data.time) {
            a.hash = data.hash
        }
    })

    fixedGroups = fixedGroups
}

const printChannel = async (name) => {
    let filter = $notify.unread.filter((a) => a.channel !== name)
    $notify.unread = filter
    fixedGroups = []
    filterEmojis = []
    let channel = channelMessages.filter(a => a.channel === name)
    $swarm.activeChannelMessages = channel
    //await checkReactions(channel)
}
const deleteMessage = async (hash) => {
    window.api.deleteMessage(hash)
    fixedGroups = fixedGroups.filter(a => a.hash !== hash)
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
    return await window.api.printGroup(group.key, 0)
}

async function getMoreMessages() {
    return await window.api.printGroup(thisGroup, pageNum)
}

async function sendTorrent(e) {
    return

    const { acceptedFiles, fileRejections } = e.detail
    if (fileRejections.length) {
        return
    }
    dragover = false
    const fileName = acceptedFiles[0].name
    const path = acceptedFiles[0].path
    const size = acceptedFiles[0].size
    const time = Date.now()
    const chat = thisGroup
    acceptedFiles[0].time = time
    acceptedFiles[0].chat = $user.activeChat.chat

    console.log("acceptedFiles[0]", acceptedFiles[0])
    const hash = await window.api.createGroup()
    const message = {
        message: 'File shared',
        grp: chat,
        name: $user.username,
        address: $user.myAddress,
        reply: "",
        timestamp: time,
        file: acceptedFiles[0],
        sent: true,
        channel: "",
        hash: hash,
        time: time
    }
    const file = {fileName, chat, time, size, hash}
    $localFiles.push(file)
    $localFiles = $localFiles
    $groups.fileList.push(message)
    $groups.fileList = $groups.fileList
    printGroupMessage(message)
    window.api.send('upload-torrent', [fileName, path, size, time, chat, hash])
}

let dragover = false

function drag() {
    dragover = true
}

function nodrag() {
    dragover = false
}

    
</script>


{#if dragover}
    <DropFile />
{/if}

{#if $swarm.newChannel === true}
 <!-- <NewChannel/> -->
{/if}

{#if wantToAdd}
    <AddGroup on:click="{openAddGroup}" on:addGroup="{(e) => addNewGroup(e)}" />
{/if}

{#if $user.block}
    <BlockContact />
{/if}
<!-- <Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> drag()} on:dragleave={()=> nodrag()} on:drop={(e) => sendTorrent(e)}> -->
<main in:fade="{{ duration: 350 }}">
    <GroupList
        on:printGroup="{(e) => printGroup(e.detail)}"
        on:removeGroup="{() => printGroup($groups.groupArray[0])}"
        on:printChannel="{(e) => printChannel(e.detail)}"
    />
    
    <div class="right_side" in:fade="{{ duration: 350 }}" out:fade="{{ duration: 100 }}">
       
        <div class="fade"></div>
        <div class="outer" id="group_chat_window" bind:this={windowChat} bind:clientHeight={windowHeight} in:fly="{{ y: 50 }}">
            {#if fixedGroups.length === 0 && !$groups.groupArray.some(a => a.key === welcomeAddress) && !$groups.thisGroup.chat}
                <div>
                    <Loader/>
                </div>
            {/if}
            {#each fixedGroups as message (message.hash)}
                <GroupMessage
                    on:reactTo="{(e) => sendGroupMsg(e)}"
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
            {#if (fixedGroups.length + filterEmojis.length) > 49 && loadMore } 
                <Button text={"Load more"} disabled={false} on:click={() => loadMoreMessages()} />
            {/if}
            
        </div>
        {#if replyTrue}
            <div class="reply_to_exit" class:reply_to="{replyTrue}" on:click="{() => replyExit()}">
                {reply_exit_icon} Reply to {$groups.replyTo.nick}
            </div>
        {/if}
        <ChatInput on:message="{(e) => sendGroupMsg(e)}" />
    </div>
    <GroupHugins />
</main>
<!-- </Dropzone> -->

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
