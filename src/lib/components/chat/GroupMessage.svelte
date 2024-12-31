<script>
import { fade } from 'svelte/transition'
import { get_avatar, getColorFromHash } from '$lib/utils/hugin-utils.js'
import { createEventDispatcher, onMount, onDestroy } from 'svelte'
import { groups, rtc_groups, webRTC, user, rooms, transactions } from '$lib/stores/user.js'
import Reaction from '$lib/components/chat/Reaction.svelte'
import Time from 'svelte-time'
import ReplyArrow from '$lib/components/icons/ReplyArrow.svelte'
import RepliedArrow from '$lib/components/icons/RepliedArrow.svelte'
import DeleteButton from '$lib/components/icons/Delete.svelte'
import { rtcgroupMessages } from '$lib/stores/rtcgroupmsgs.js'
import Dots from '$lib/components/icons/Dots.svelte'
import Button from '$lib/components/buttons/Button.svelte'
import Youtube from "svelte-youtube-embed";
import { hashPadding, isLatin, openURL } from '$lib/utils/utils'
import DownloadFile from './DownloadFile.svelte'
import UploadFile from './UploadFile.svelte'
import Emoji from "$lib/components/icons/Emoji.svelte";
import 'emoji-picker-element';
import { roomMessages } from '$lib/stores/roommsgs'
import { groupMessages } from '$lib/stores/groupmsgs'
import UserOptions from '/src/routes/rooms/components/UserOptions.svelte'
import PayIcon from '../icons/PayIcon.svelte'
import Tip from './Tip.svelte'

export let msg
export let msgFrom
export let group
export let reply = ''
export let myMsg
export let timestamp
export let nickname = 'Anonymous'
export let hash
export let message
export let reply_to_this = false
export let rtc = false
export let joined = false
export let file = false
export let room = false
export let admin = false
export let tip = false

$: tipMessage = ""
$: if (tip !== "") {
    try {
        tipMessage = JSON.parse(tip)
    } catch(e) {
        tipMessage = tip
    }
}

$: positionEmojiContainer(openEmoji);

let thisreply = ''
let openEmoji  = false
let messageContainer
let emojiPicker
let has_reaction = false
let reactions = []
let react = false
let replyMessage = false
let showUserActions = false
let emojiMessage = false
let youtube = false
let embed_code
let youtubeLink = false
let openLink = false
let link = false
let messageText
let messageLink = ""
let youtube_shared_link_type = false
let asian = false
let showMenu = false
let geturl = new RegExp(
            "(^|[ \t\r\n])((ftp|http|https|mailto|file|):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){3,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
            ,"g"
        );

const dispatch = createEventDispatcher()

let offchain = false
let thisReply = false
let replyError = false
let timeformat = "HH:mm"
if ((Date.now() - 40000000) > timestamp) {
    //Show date also for older messages
    timeformat = "D MMM, HH:mm"
}

const nameColor = getColorFromHash(msgFrom)


onMount( async () => {
    emojiPicker.addEventListener('emoji-click', (e) => {
            openEmoji = false
            reactTo(e)
        })
        if (reply.length === 64) 
        {
        thisReply = await checkreply(reply)
        replyMessage = true
        if (thisReply) return
        replyError = true
        }
        checkMessage()

    
})

onDestroy(() => {
    window.api.removeAllListeners("emoji-click")
})

function checkMessage() {
    
    if (msg.match(geturl)) {
        link = true
        messageLink = msg.match(geturl)
        messageText = msg.replace(messageLink,'')
        //Todo handle many links in one message? an each loop in the link if block? We need to check if there is any text aswell.
        messageLink = messageLink[0]
    }

    if (link && msg.match(/youtube.com/) || msg.match(/youtu.be/)) {
        if (msg.match(/youtu.be/)) youtube_shared_link_type = true
        youtubeLink = true
        if (myMsg) checkLink()
        return
    }
    
    if (!isLatin(nickname)) {
        asian = true
    }
}

async function checkreply(reply) {
    let group_reply
    
    if (offchain) {
        //Search in rtc messages
        group_reply = $rtcgroupMessages.find((a) => a.hash == reply)
        group_reply.hash + hashPadding()
        if (group_reply) return group_reply
    }
    //Check in local chat if we can find it
    let local = $roomMessages.find(a => a.hash === reply)
    if (local) return local

    let group_local = $groupMessages.find((a) => a.hash == reply)
    if (group_local) return group_local
    
    //Otherwise check in db
    let thisreply = await window.api.getGroupReply(reply)
    if (!thisreply) return false

    thisreply.hash = thisreply.hash + hashPadding()
    return thisreply
}

const replyTo = () => {
    // reply_to_this = true
    // Dispatch the inputted data
    dispatch('replyTo', {
        reply: 'reply',
    })
}

const sendReactMsg = (e) => {
    console.log('wanna send', e.detail)
    dispatch('reactTo', {
        text: e.detail.msg,
        reply: hash,
    })
}

const reactTo = (e) => {
    console.log('reactto', e)
    dispatch('reactTo', {
        text: e.detail.unicode,
        reply: hash,
    })
}

const positionEmojiContainer = (open) => {
    let emojiContainer = messageContainer?.querySelector(".emojiContainer");

    if(!open) {
        if(emojiContainer) emojiContainer.style.display = "none";
        return;
    } 
    
    emojiContainer.style.display = "block";
    let emojiButton = messageContainer.querySelector(".emoji-button");
    let buttonRect = emojiButton.getBoundingClientRect();
    let popupRect = emojiContainer.getBoundingClientRect();
    let initialTop = buttonRect.top + buttonRect.height;

    if (initialTop + popupRect.height > window.innerHeight && buttonRect.top - popupRect.height < 0) {
        // If any part of the popup would be out of sight both above and below the button, position it in the middle vertically
        emojiContainer.style.top = (window.innerHeight - popupRect.height) / 2 + 'px';
    } else if (initialTop + popupRect.height > window.innerHeight) {
        // If the popup would be out of sight below the button, position it above the button
        emojiContainer.style.top = (buttonRect.top - popupRect.height) + 'px';
    } else {
        // Otherwise, position it below the button
        emojiContainer.style.top = initialTop + 'px';
    }
}


const deleteMsg = (e) => {
    console.log('delete', e)
    dispatch('deleteMsg', {
        hash: hash
    })
}


$: if ($groups.replyTo.reply == false) {
    reply_to_this = false
} else if ($groups.replyTo.to == hash) {
    reply_to_this = true
}

$: if ($rooms.replyTo.to !== hash) {
    reply_to_this = false
} else if ($rooms.replyTo.to == hash) {
    reply_to_this = true
}

$: if ($rtc_groups.replyTo.reply == false) {
    reply_to_this = false
} else if ($rtc_groups.replyTo.to == hash) {
    reply_to_this = true
}

$: reactions

$: if (message.react) {
    let thisemoji = {}
    reactions = message.react.filter((a) => !thisemoji[a.message] && (thisemoji[a.message] = true))
    has_reaction = true
}


$: if ($webRTC.groupCall || rtc) {
    offchain = true
} else {
    offchain = false
}

//Open youtube links and check embed code
$: if (openLink) {
    if (messageLink.includes('&amp;list')) {
        messageLink = messageLink.split('&amp;list')[0]
    }
    setEmbedCode()
}

const checkLink = () => {
        if (messageLink.includes('&list')) {
            messageLink = messageLink.split('&list')[0]
        }
        setEmbedCode()
}

const setEmbedCode = () => {
    if (!youtube_shared_link_type) { 
            embed_code = messageLink.split('watch?v=')[1];
        } else {
            embed_code = messageLink.split('youtu.be/')[1]
        }
    youtube = true
}

const openEmbed = () => {
    openLink = true
}

const openLinkMessage = (url) => {
    openURL(url)
}

 
const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
}

const sendMoney = () => {
    $rooms.replyTo.reply = false
    $transactions.tip = true
    $transactions.send = {
        to: msgFrom,
        name: nickname
    }
}

</script>


<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->

<div bind:this={messageContainer} class="message" class:yt={rtc && youtube} id="{hash}" class:reply_active="{reply_to_this}" in:fade="{{ duration: 150 }}" on:mouseleave="{ () => { openEmoji = false;  showMenu = false}}">
    <div>
        {#if replyMessage}
            {#if thisReply}
                <div class="reply">
                    <div style="display: flex; gap: 10px; align-items: center">
                        <RepliedArrow />
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <p class:asian class="reply_nickname">{thisReply.name}</p>
                            <p>{thisReply.message}</p>
                        </div>
                    </div>
                </div>
            {:else if replyError}
                <div in:fade="{{ duration: 150 }}" class="reply">
                    <img
                        class="reply_avatar"
                        src="data:image/png;base64,{get_avatar(
                            'SEKReU6UELRfBmKNUuo5mP58LVQcQqEKwZgfC7hMd5puRjMLJ5cJcLbFLkJCh6CpsB9WD2z4kqKWQGVABJxRAG5z9Hc1Esg1KV4'
                        )}"
                        alt=""
                    />
                    <p class="reply_nickname">Can't find reply</p>
                    <br />
                    <p style="color: red">This reply is not in the mempool</p>
                </div>
            {/if}
        {/if}
    </div>
    <div>
        <div>
            <div class="header">
                <div style="display: flex; align-items: center; margin-left: -10px">
                    {#await check_avatar(msgFrom)}
                    {:then avatar}
                     {#if avatar && room}
                        <img
                            class="custom-avatar"
                            src="{avatar}"
                            alt=""
                        />
                    {:else}
                        
                        <img
                        class="avatar"
                        src="data:image/png;base64,{get_avatar(msgFrom)}"
                        alt=""
                    />
                    {/if}
                    {/await}
                    <h5 class:asian class="nickname" style="color: {nameColor}" class:blink_me={file}>
                        {nickname}<span class="time" style="font-family: 'Montserrat'" class:min="{rtc}"
                            >| <Time live={30 * 1_000} format={timeformat} timestamp="{parseInt(message.time)}" /></span
                        >
                    </h5>
                </div>
                <div class="actions">
                    <div style="display: flex;">
                        <div class="emojiContainer">
                            <emoji-picker bind:this={emojiPicker}></emoji-picker>
                        </div>
                        <button alt="React with emoji" class="emoji-button" on:click={() => { openEmoji = !openEmoji }}>
                            <Emoji size="16px" stroke={"var(--text-color)"}/>
                        </button>
                    </div>
                    {#if room && !myMsg}
                    <PayIcon size={18} on:click={sendMoney}/>
                    {/if}
                    <ReplyArrow on:click="{replyTo}" />
                    {#if !rtc}
                    <DeleteButton on:click="{deleteMsg}"/>
                    {#if !myMsg}
                    <Dots on:click="{() => showMenu = true}"/>
                    {/if}
                    {#if showMenu && !myMsg}
                        <UserOptions admin={admin} info={{address: msgFrom, name: nickname}}/>
                    {/if}
                    {/if}
                </div>
            </div>
            {#if youtube}
                <Youtube id={embed_code} />
                <p class:rtc style="user-select: text;">{messageText}</p>
            {:else if youtubeLink}
                <Button disabled="{false}" text={"Open Youtube"} on:click={() => openEmbed()} />
            {:else if link}
                <p class:rtc style="user-select: text; font-weight: bold; cursor: pointer;" on:click={openLinkMessage(messageLink)}>{messageLink}</p>
                <p class:rtc style="user-select: text;">{messageText}</p>
            {:else if emojiMessage}
                <p class:rtc class="emoji">{msg}</p>
            {:else if file && !myMsg}
                <DownloadFile file={file} group={true} rtc={rtc}/>
            {:else if file && myMsg}
                <UploadFile file={file} group={true} rtc={rtc}/>
            {:else if tip && tipMessage}
                <Tip tip={tipMessage}/>
            {:else}
                <p class:rtc class:joined={joined} style="user-select: text;">{msg}</p>
            {/if}
        </div>

        <div class="reactions">
            {#if has_reaction}
                {#each reactions as reaction}
                    <Reaction
                        on:sendReaction="{(e) => sendReactMsg(e)}"
                        thisReaction="{reaction}"
                        reacts="{message.react}"
                        emoji="{reaction.message}"
                        react="{react}"
                    />
                {/each}
            {/if}
        </div>
    </div>
</div>

<style lang="scss">

.message {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    color: rgba(255, 255, 255, 0.8);
    padding: 10px 10px 10px 20px;
    border: 1px solid transparent;
    white-space: pre-line;
    
    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }


    &:hover {
        background-color: var(--card-background);

        .actions {
                opacity: 100%;
            }
    }
}

.action {
    opacity: 80%;
    color: var(--warn-color);
    transition: 0.2s;
    &:hover {
            opacity: 100%;
    }
}

.nickname {
    font-size: 13px;
    font-weight: bold;
    display: contents;
    line-height: 20px;
}

p {
    margin: 0 0 0 30px;
    word-break: break-word;
    font-family: 'Montserrat', sans-serif;
}

.actions {
    display: flex;
    gap: 0.5rem;
    transition: 100ms ease-in-out;
    cursor: pointer;
    opacity: 0;
}

.emoji-button {
    cursor: pointer;
    transition: 200ms ease-in-out;

    &:hover {
        opacity: 80%;
    }
}

.user_actions {
    display: flex;
    display: none;
    position: absolute;

}

.reply_avatar {
    height: 30px;
    width: 30px;
}

.reply_nickname {
    font-size: 12px !important;
    font-weight: bold;
}

.reply {
    display: flex;
    align-items: center;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    width: fit-content;
    opacity: 0.85;
    border-radius: 10px;

    p {
        font-size: 11px;
        display: contents;
    }
}

.reply_active {
    border: 1px solid #5f86f2;
    -webkit-animation: border_rgb 10s ease infinite;
    -moz-animation: border_rgb 10s ease infinite;
    animation: border_rgb 10s ease infinite;
}

.reactions {
    margin: 0.5rem 0 0 30px;
    display: flex;
    gap: 10px;
    font-size: 15px;
    flex: auto;
    flex-flow: wrap;
}

.time {
    color: var(--text-color);
    opacity: 80%;
    margin-left: 8px;
    font-weight: 400;
    font-size: 0.75rem;
}

.rtc {
    max-width: 240px;
}

.min {
    font-size: 0.65rem;
}

.actions {
    display: flex;
    flex-direction: row;
}

.list {
    position: absolute;
    bottom: 85px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 120px;
    padding: 5px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;

    div {
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;

        &:hover {
            background-color: var(--card-border);
        }
    }
}

.show {
    display: flex;
    position: relative;
    bottom: -120px;
}

.emojiContainer {
   position: absolute;
   right: 7rem;
   display: none;
   z-index: 3;
}

.joined {
    font-style: italic;
    color: var(--info-color)
}

.yt {
    max-width: 350px;
}

.asian {
    font: menu;
    font-size: 15px;
}

button {
    background-color: transparent;
    border: none;
    padding: 0;
    margin: 0;
}

.custom-avatar {
    height: 40px;
    width:  40px;
    border-radius: 15px;
    padding: 10px;
}
</style>
