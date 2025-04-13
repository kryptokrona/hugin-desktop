<script>
    import { run } from 'svelte/legacy';

import { fade } from 'svelte/transition'
import { get_avatar, getColorFromHash } from '$lib/utils/hugin-utils.js'
import {  onMount, onDestroy } from 'svelte'
import { groups, rtc_groups, webRTC, user, rooms, transactions, feed } from '$lib/stores/user.js'
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

// message,
//   replies,
//   timestamp,
//   nickname,
//   userAddress,
//   reactions,
//   replyHash,
//   file,
//   onReplyToMessagePress,
//   onEmojiReactionPress,
//   onShowImagePress,
//   onTipPress,
//   replyto,
//   tip,
//   hash,
//   dm = false,

    /** @type {{msg: any, msgFrom: any, group: any, reply?: string, myMsg: any, timestamp: any, nickname?: string, hash: any, message: any, reply_to_this?: boolean, rtc?: boolean, joined?: boolean, file?: boolean, room?: boolean, admin?: boolean, tip?: booleanm, ReactTo: any, DeleteMessage: any, ReplyTo: any}} */
    let {
        message,
        ReplyTo,
        ReactTo,
        DeleteMsg,
        reply_to_this = $bindable(false),
        onPress,
        isReply = false
    } = $props();
let tipMessage = $state("");

console.log(message)

let file = false;
let tip = false;
let thisreply = ''
let openEmoji  = $state(false)
let messageContainer = $state()
let emojiPicker = $state()
let has_reaction = $state(false)
let reactions = $state([])
let react = false
let replyMessage = $state(false)
let showUserActions = false
let emojiMessage = false
let youtube = $state(false)
let embed_code = $state()
let youtubeLink = $state(false)
let openLink = $state(false)
let link = $state(false)
let messageText = $state()
let messageLink = $state("")
let youtube_shared_link_type = false
let asian = $state(false)
let showMenu = $state(false)
let geturl = new RegExp(
            "(^|[ \t\r\n])((ftp|http|https|mailto|file|):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){3,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
            ,"g"
        );

let offchain = $state(false)
let thisReply = $state(false)
let replyError = $state(false)
let timeformat = $state("HH:mm")
if ((Date.now() - 40000000) > message.timestamp) {
    //Show date also for older messages
    timeformat = "D MMM, HH:mm"
}

const nameColor = getColorFromHash(message.address)


onMount( async () => {
    emojiPicker.addEventListener('emoji-click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            openEmoji = false
            reactTo(e)
        })
        if (message.reply.length === 64) 
        {
        thisReply = await checkreply(message.reply)
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
    
    if (message.message.match(geturl)) {
        link = true
        messageLink = message.message.match(geturl)
        messageText = message.message.replace(messageLink,'')
        //Todo handle many links in one message? an each loop in the link if block? We need to check if there is any text aswell.
        messageLink = messageLink[0]
    }

    if (link && message.message.match(/youtube.com/) || message.message.match(/youtu.be/)) {
        if (message.message.match(/youtu.be/)) youtube_shared_link_type = true
        youtubeLink = true
        //if (myMsg) checkLink()
        return
    }
    
    if (!isLatin(message.nickname)) {
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
    ReplyTo({
        reply: 'reply',
    })
}

const sendReactMsg = (e) => {
    console.log('wanna send', e)
    ReactTo({
        text: e.msg,
        reply: message.hash,
    })
}

const reactTo = (e) => {
    console.log('reactto', e)
    ReactTo({
        text: e.detail.unicode,
        reply: message.hash,
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

    if (!$feed.expanded) {
        emojiContainer.style.left = '550px'
    } else {
        emojiContainer.style.left = '150px'
    }
}


const deleteMsg = (e) => {
    console.log('delete', e)
    DeleteMessage({
        hash: message.hash
    })
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
        to: message.address,
        name: message.nickname
    }
}

const messagePressed = () => {
    if (openEmoji) return;
    onPress();
}


run(() => {
        if (tip !== "") {
        try {
            tipMessage = JSON.parse(tip)
        } catch(e) {
            tipMessage = tip
        }
    }
    });
run(() => {
        positionEmojiContainer(openEmoji);
    });
run(() => {
        if ($groups.replyTo.reply == false) {
        reply_to_this = false
    } else if ($groups.replyTo.to == message.hash) {
        reply_to_this = true
    }
    });
run(() => {
        if ($rooms.replyTo.to !== message.hash) {
        reply_to_this = false
    } else if ($rooms.replyTo.to == message.hash) {
        reply_to_this = true
    }
    });
run(() => {
        if ($rtc_groups.replyTo.reply == false) {
        reply_to_this = false
    } else if ($rtc_groups.replyTo.to == message.hash) {
        reply_to_this = true
    }
    });
run(() => {
        if (message.react) {
        let thisemoji = {}
        reactions = message.react.filter((a) => !thisemoji[a.message] && (thisemoji[a.message] = true))
        has_reaction = true
    }
    });
run(() => {
        reactions
    });
//Open youtube links and check embed code
run(() => {
        if (openLink) {
        if (messageLink.includes('&amp;list')) {
            messageLink = messageLink.split('&amp;list')[0]
        }
        setEmbedCode()
    }
    });
</script>


<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->

<div bind:this={messageContainer} class="message feedmessage" class:yt={youtube} id="{message.hash}" class:reply_active="{reply_to_this}" in:fade|global="{{ duration: 150 }}" onmouseleave={() => { openEmoji = false;  showMenu = false}} onclick={messagePressed}>
    <div>
        <div>
            <div class="header">
                <div style="display: flex; align-items: center; margin-left: -10px">
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
                        class="avatar"
                        src="data:image/png;base64,{get_avatar(message.address)}"
                        alt=""
                    />
                    {/if}
                    {/await}
                    <h5 class:asian class="nickname" style="color: {nameColor}" class:blink_me={file}>
                        {message.nickname}<span class="time" style="font-family: 'Montserrat'"
                        >| <Time live={30 * 1_000} format={timeformat} timestamp="{parseInt(message.timestamp)}" /></span
                        >
                    </h5>
                </div>
                <div class="actions">
                    <div style="display: flex;">
                        <div class="emojiContainer" onclick={(e) => {e.stopPropagation}}>
                            <emoji-picker bind:this={emojiPicker}></emoji-picker>
                        </div>
                        <button alt="React with emoji" class="emoji-button" onclick={(e) => { e.stopPropagation(); openEmoji = !openEmoji }}>
                            <Emoji size="20px" stroke={"var(--text-color)"}/>
                        </button>
                    </div>
                    <PayIcon size={22} on:click={sendMoney}/>
                </div>
            </div>
            {#if youtube}
                <Youtube id={embed_code} />
                <p style="user-select: text;">{messageText}</p>
            {:else if youtubeLink}
                <Button disabled="{false}" text={"Open Youtube"} on:click={() => openEmbed()} />
            {:else if link}
                <p style="user-select: text; font-weight: bold; cursor: pointer;" onclick={openLinkMessage(messageLink)}>{messageLink}</p>
                <p style="user-select: text;">{messageText}</p>
            {:else if emojiMessage}
                <p class="emoji">{message.message}</p>
            {:else if file}
                <DownloadFile file={file} group={true}/>
            {:else if file}
                <UploadFile file={file} group={true} />
            {:else if tip && tipMessage}
                <Tip tip={tipMessage}/>
            {:else}
                <p style="user-select: text;">{message.message}</p>
            {/if}
        </div>

        <div class="reactions">
            {#if has_reaction}
                {#each reactions as reaction}
                    <Reaction
                        onSendReaction="{(e) => sendReactMsg(e)}"
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
    color: var(--text-color);
    padding: 10px 10px 10px 20px;
    border: 1px solid transparent;
    white-space: pre-line;
    width: 100%;
    border-bottom: 1px solid rgba(255,255,255,0.1);
    cursor: pointer;

    
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
   left: 150px;
   display: none;
   z-index: 3;
   pointer-events: all !important;
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
    object-fit: cover;
}
</style>
