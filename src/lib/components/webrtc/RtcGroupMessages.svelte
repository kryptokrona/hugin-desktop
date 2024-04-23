<script>
import { rtcgroupMessages } from '$lib/stores/rtcgroupmsgs.js'
import GroupMessage from '$lib/components/chat/GroupMessage.svelte'
import { onDestroy, onMount } from 'svelte'
import { rtc_groups, user, webRTC, swarm } from '$lib/stores/user.js'
import ChatInput from '$lib/components/chat/ChatInput.svelte'
//Use for filesharing later
import { videoGrid } from '$lib/stores/layout-state.js'
import { containsOnlyEmojis } from '$lib/utils/utils'
import Dropzone from "svelte-file-dropzone";
import { remoteFiles } from '$lib/stores/files'
import DropFile from '$lib/components/popups/DropFile.svelte'

let replyto = ''
let filterRtcGroup = []
let filterEmojis = []
let fixedRtcGroups = []
let chatWindow
let noMsgs

onMount(async () => {
    chatWindow = document.getElementById('chat_window')
})

onDestroy(() => {
    // window.api.removeAllListeners('groupRtcMsg')
})

window.api.receive('swarm-connected', () => { 
    clearMessages()
})

window.api.receive('start-call', () => { 
    if ($webRTC.groupCall) return
    clearMessages()
})
window.api.receive('answer-call', () => { 
    if ($webRTC.groupCall) return
    clearMessages()
})

const clearMessages = () => {
    $rtcgroupMessages = []
    fixedRtcGroups = []
}

window.api.receive('peer-connected', (data) => { 
    if ($swarm.active.length) {
            let joinedMessage = {
            message: "Joined the lobby",
            grp: $swarm.activeSwarm.key,
            reply: false,
            address: data.address,
            time: parseInt(data.time),
            name: data.name,
            hash: data.time,
            joined: true,
            channel: "Chat room"
        }
        
    fixedRtcGroups.push(joinedMessage)
    fixedRtcGroups = fixedRtcGroups
    }
})

//Listens for new messages from backend
window.api.receive('groupRtcMsg', (data) => {
    if (!$videoGrid.showChat) {
        $rtc_groups.unread.push(data)
        $rtc_groups.unread = $rtc_groups.unread
    }
    if (data.address === $user.myAddress) return
    //Push new message to store
    if (data.file) {
        data.file = $remoteFiles.find(a => a.fileName === data.message && data.time === a.time)
    }
    printGroupRtcMessage(data)
})

//Send message to store and DB
function sendGroupRtCMsg(e) {
    let msg = e.detail.text
    let myaddr = $user.myAddress
    let time = Date.now()
    let myName = $user.username
    let group
    let offchain = true
    const is_swarm = $swarm.showVideoGrid
    let channel = ""
    if ($webRTC.groupCall) {
         group = $webRTC.groupCall
    } else if(is_swarm) {
        group = $swarm.activeSwarm.key
        channel = "Chat room"
    }
    //Reaction switch
    if (e.detail.reply) {
        replyto = e.detail.reply
    }

    //Construct a new json object (myBoardMessage) to be able to print our message instant.
    let myGroupRtCMessage = {
        message: msg,
        grp: group,
        reply: replyto,
        address: myaddr,
        time: time,
        name: myName,
        hash: time,
        channel: channel
    }
    let sendMsg = {
        m: msg,
        g: group,
        r: replyto,
        k: myaddr,
        t: time,
        n: myName,
        hash: time,
        c: channel
    }

    console.log('wanna send this', sendMsg)
    printGroupRtcMessage(myGroupRtCMessage)
    if (!offchain) return
    window.api.sendGroupMessage(sendMsg, true, is_swarm)
    replyExit()
    scrollDown()
}

const scrollDown = () => {
    chatWindow.scrollTop = chatWindow.scrollHeight
}

//Prints any single board message. Takes boardmessage and updates to store.
const printGroupRtcMessage = (groupMsg) => {
    if (
        groupMsg?.reply.length === 64 &&
        groupMsg?.message.length < 9 &&
        containsOnlyEmojis(groupMsg.message)
    ) {
        updateReactions(groupMsg)
    } else {
        fixedRtcGroups.push(groupMsg)
    }
    rtcgroupMessages.update((current) => {
        return [...current, groupMsg]
    })
    fixedRtcGroups = fixedRtcGroups
}

//Exit reply mode
const replyExit = () => {
    replyto = false
    rtc_groups.update((data) => {
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

    rtc_groups.update((data) => {
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

//Default value should be false to hide the AddBoard form.
let wantToAdd = false

//Svelte reactive. Sets noMsgs boolean for welcome message.
$: if ($rtcgroupMessages.length == 0) {
    noMsgs = true
} else {
    noMsgs = false
}

//Checks messages for reactions
async function checkReactions() {
    //All boardmessages all messages except reactions
    filterRtcGroup = await $rtcgroupMessages.filter(
        (m) => m.message.length > 0 && !(m.reply.length === 64 && containsOnlyEmojis(m.message))
    )
    //Only reactions
    filterEmojis = await $rtcgroupMessages.filter(
        (e) => e.reply.length === 64 && e.message.length < 9 && containsOnlyEmojis(e.message)
    )
    if (filterEmojis.length) {
        //Adding emojis to the correct message.
        await addEmoji()
    } else {
        fixedRtcGroups = filterRtcGroup
    }
}

async function updateReactions(msg) {
    let reactionsFixed
    reactionsFixed = fixedRtcGroups.map(function (r) {
        if (r.hash == msg.reply && !r.react) {
            r.react = []
            r.react.push(msg)
        } else if (r.hash == msg.reply && r.react) {
            r.react.push(msg)
        }
        return r
    })
    fixedRtcGroups = reactionsFixed
}

async function addEmoji() {
    //Check for replies and message hash that match and then adds reactions to the messages.
    filterRtcGroup.forEach(async function (a) {
        await filterEmojis.forEach(function (b) {
            if (!a.react && b.reply == a.hash) {
                a.react = []
                a.react.push(b)
            } else if (b.reply == a.hash) {
                a.react.push(b)
            }
        })
        fixedRtcGroups.push(a)
    })
    fixedRtcGroups = fixedRtcGroups
}

function addHash(data) {
    fixedRtcGroups.some(function (a) {
        if (a.hash === data.time) {
            a.hash = data.hash
        }
    })

    fixedRtcGroups = fixedRtcGroups
}

window.api.receive('sent_rtc_group', (data) => {
    addHash(data)
})

async function dropFile(e) {
    //Disable drop file in private calls until implementation is done.
    if ($webRTC.call.length) return
    dragover = false
    const { acceptedFiles, fileRejections } = e.detail
    let filename = acceptedFiles[0].name
    let path = acceptedFiles[0].path
    let size = acceptedFiles[0].size
    let toHuginAddress = $user.activeChat.chat + $user.activeChat.key
    let time = Date.now()
    
    acceptedFiles[0].time = time
    acceptedFiles[0].chat = $user.activeChat.chat
    
    if (fileRejections.length) {
        console.log('rejected file')
        return
    }

    console.log("acceptedFiles[0]", acceptedFiles[0])
    const hash = await window.api.createGroup()
    const message = {
        message: 'File shared',
        grp: $swarm.activeSwarm.key,
        name: 'File shared',
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

    printGroupRtcMessage(message)
    window.api.groupUpload(filename, path, $swarm.activeSwarm.topic, size, time, hash)
}

let dragover = false

function drag() {
    dragover = true
}

function nodrag() {
    dragover = false
}

</script>

<!-- {#if $webRTC.call.length > 1} -->
<div class="chat layered-shadow" class:show="{$videoGrid.showChat}">
    {#if dragover}
    <DropFile />
    {/if}
    <div class="outer" id="chat_window">
           <div class="fade"></div>
           <Dropzone noClick={true} disableDefaultStyles={true} on:dragover={()=> drag()} on:dragleave={()=> nodrag()} on:drop={dropFile}>
        <div class="inner">
            {#each fixedRtcGroups as message (message.hash)}
                <GroupMessage
                    on:reactTo="{(e) => sendGroupRtCMsg(e)}"
                    on:replyTo="{(e) => replyToMessage(message.hash, message.name)}"
                    message="{message}"
                    reply="{message.reply}"
                    msg="{message.message}"
                    myMsg="{message.sent}"
                    signature="{message.signature}"
                    group="{message.group}"
                    nickname="{message.name}"
                    msgFrom="{message.address}"
                    timestamp="{message.time}"
                    hash="{message.hash}"
                    rtc="{true}"
                    joined={message.joined ? true : false}
                    file={message.file}
                />
            {/each}
        </div>
        </Dropzone>
    </div>
    <ChatInput rtc="{true}" on:message="{sendGroupRtCMsg}" />
</div>

<style lang="scss">
.chat {
    display: flex;
    position: relative;
    flex-direction: column;
    justify-content: flex-end;
    min-width: 355px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    overflow: hidden;
    transition: all 300ms ease-in-out;
    margin-right: -370px;
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
    display: flex;
    flex-direction: column-reverse;
    overflow: scroll;
    padding-bottom: 10px;

    &::-webkit-scrollbar {
        display: none;
    }
}

.inner {
    display: flex;
    flex-direction: column;
    padding-top: 20px;
    width: 100%;
}

.wrapper {
    max-width: 100%;
    display: flex;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
}

.message {
    width: 342px;
}

p {
    max-width: 330px;
}

.show {
    margin-right: 0;
}

</style>
