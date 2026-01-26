<script>
    import { run } from 'svelte/legacy';

import { fade } from 'svelte/transition'
import { get_avatar, getColorFromHash } from '$lib/utils/hugin-utils.js'
import {  onMount, onDestroy } from 'svelte'
import { groups, rtc_groups, webRTC, user, rooms, transactions, swarm } from '$lib/stores/user.js'
import Reaction from '$lib/components/chat/Reaction.svelte'
import Time from 'svelte-time'
import ReplyArrow from '$lib/components/icons/ReplyArrow.svelte'
import RepliedArrow from '$lib/components/icons/RepliedArrow.svelte'
import DeleteButton from '$lib/components/icons/Delete.svelte'
import { rtcgroupMessages } from '$lib/stores/rtcgroupmsgs.js'
import Dots from '$lib/components/icons/Dots.svelte'
import Button from '$lib/components/buttons/Button.svelte'
import Youtube from "svelte-youtube-embed";
import { extractHuginLinkAndClean, hashPadding, isLatin, openURL } from '$lib/utils/utils'
import DownloadFile from './DownloadFile.svelte'
import UploadFile from './UploadFile.svelte'
import Emoji from "$lib/components/icons/Emoji.svelte";
import 'emoji-picker-element';
import { roomMessages } from '$lib/stores/roommsgs'
import { groupMessages } from '$lib/stores/groupmsgs'
import UserOptions from '/src/routes/rooms/components/UserOptions.svelte'
import PayIcon from '../icons/PayIcon.svelte'
import Tip from './Tip.svelte'
import CodeBlock from './CodeBlock.svelte'
import { t } from '$lib/utils/translation.js'

    /** @type {{msg: any, msgFrom: any, group: any, reply?: string, myMsg: any, timestamp: any, nickname?: string, hash: any, message: any, reply_to_this?: boolean, rtc?: boolean, joined?: boolean, file?: boolean, room?: boolean, admin?: boolean, tip?: booleanm, ReactTo: any, DeleteMessage: any, ReplyTo: any}} */
    let {
        msg,
        msgFrom,
        group,
        reply = '',
        myMsg,
        timestamp,
        nickname = 'Anonymous',
        hash,
        message,
        reply_to_this = $bindable(false),
        rtc = false,
        joined = false,
        file = false,
        room = false,
        admin = false,
        tip = false,
        ReplyTo,
        ReactTo,
        DeleteMessage,
        JoinRoom,
    } = $props();
let tipMessage = $state("");
    


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
let isInvite = $state(false)
let inviteName = $state('')
let inviteKey = $state('')

let geturl = new RegExp(
            "(^|[ \t\r\n])((ftp|http|https|mailto|file|):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){3,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
            ,"g"
        );

let offchain = $state(false)
let thisReply = $state(false)
let replyError = $state(false)
let timeformat = $state("HH:mm")
let codeBlock = $state(false)

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

    if (tip) return

    if (!isLatin(nickname)) {
        asian = true
    }
    
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

    const {huginLink, cleanedMessage} = extractHuginLinkAndClean(msg)

    if (huginLink.length) {
        msg = cleanedMessage
        inviteKey = huginLink.slice(-128)
        const parse = huginLink.split('hugin://')[1]
        const roomName = parse.slice(0, (parse.length - 1) - inviteKey.length)
        inviteName = roomName.replace(/-/g, ' ');
        isInvite = true
    } else return


    // if (msg.startsWith("```") && msg.endsWith("```")) { 
    //     msg = msg.slice(3,-3) 
    //     codeBlock = true 
    //     return
    // }
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
        reply: hash,
    })
}

const reactTo = (e) => {
    console.log('reactto', e)
    ReactTo({
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
    DeleteMessage({
        hash: hash
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
        to: msgFrom,
        name: nickname
    }
}

function joinInvite () {
    if (inviteKey.length !== 128) return
    if (inviteName.length === 0) return

    JoinRoom({
        name: inviteName,
        key: inviteKey,
        admin: false
    })
}

const reactThumbsUp = () => {
    return;
  ReactTo({
    text: '👍',
    reply: hash,
  })
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
    } else if ($groups.replyTo.to == hash) {
        reply_to_this = true
    }
    });
run(() => {
        if ($rooms.replyTo.to !== hash) {
        reply_to_this = false
    } else if ($rooms.replyTo.to == hash) {
        reply_to_this = true
    }
    });
run(() => {
        if ($rtc_groups.replyTo.reply == false) {
        reply_to_this = false
    } else if ($rtc_groups.replyTo.to == hash) {
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
run(() => {
        if ($webRTC.groupCall || rtc) {
        offchain = true
    } else {
        offchain = false
    }
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

<div 
    bind:this={messageContainer} 
    class="message" 
    class:yt={rtc && youtube} 
    id="{hash}" 
    class:reply_active="{reply_to_this}" 
    in:fade|global="{{ duration: 150 }}" 
    onmouseleave={() => { openEmoji = false;  showMenu = false}}
    ondblclick={reactThumbsUp}
    >
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
                <div in:fade|global="{{ duration: 100 }}" class="reply">
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
                         {#if !rtc}
                        <button alt="React with emoji" class="emoji-button" onclick={() => { openEmoji = !openEmoji }}>
                            <Emoji size="16px" stroke={"var(--text-color)"}/>
                        </button>
                        {/if}
                    </div>
                    {#if !rtc}
                        {#if room && !myMsg}
                        <PayIcon size={18} on:click={sendMoney}/>
                        {/if}
                        <ReplyArrow on:click="{replyTo}" />
                        {#if !rtc}
                        {#if !myMsg}
                        <Dots on:click="{() => showMenu = true}"/>
                        {/if}
                        {#if showMenu && !myMsg}
                            <UserOptions admin={admin} info={{address: msgFrom, name: nickname}}/>
                        {/if}
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
                <p class:rtc style="user-select: text; font-weight: bold; cursor: pointer;" onclick={openLinkMessage(messageLink)}>{messageLink}</p>
                <p class:rtc style="user-select: text;">{messageText}</p>
            {:else if emojiMessage}
                <p class:rtc class="emoji">{msg}</p>
            {:else if file && !myMsg && !rtc}
                <DownloadFile file={file} group={true} rtc={rtc}/>
            {:else if file && myMsg && !rtc}
                <UploadFile file={file} group={true} rtc={rtc}/>
            {:else if tip && tipMessage}
                <Tip tip={tipMessage}/>
            <!-- {:else if codeBlock}
                <CodeBlock code={msg} /> -->
            {:else}
                <p class:rtc class:joined={joined} style="user-select: text;">{msg}</p>
                {#if isInvite}
                <div class="inviteRoom">
                    <br>
                    <h4>{inviteName}</h4>
                    {#if !$swarm.active.some(a => a.key === inviteKey)}
                        <Button text={t('join') || 'Join'} disabled={false} on:click={() => joinInvite()} />
                    {/if}
                </div>
                {/if}
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
    max-width: 500px;
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
    object-fit: cover;
}

.inviteRoom {
    border-radius: 5px;
    display: flex;
    border: 1px solid var(--success-color);
    padding: 10px;
    align-items: center;
    margin-right: 50px;
    margin-left: 30px;
    justify-content: center;
    gap: 20px;
}
</style>
