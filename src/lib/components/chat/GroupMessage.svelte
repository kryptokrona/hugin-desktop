<script>
import { fade } from 'svelte/transition'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import { createEventDispatcher, onMount } from 'svelte'
import { groups, rtc_groups, webRTC, user, swarm } from '$lib/stores/user.js'
import Reaction from '$lib/components/chat/Reaction.svelte'
import EmojiSelector from 'svelte-emoji-selector'
import Time from 'svelte-time'
import ReplyArrow from '$lib/components/icons/ReplyArrow.svelte'
import RepliedArrow from '$lib/components/icons/RepliedArrow.svelte'
import DeleteButton from '$lib/components/icons/Delete.svelte'
import { rtcgroupMessages } from '$lib/stores/rtcgroupmsgs.js'
import Dots from '$lib/components/icons/Dots.svelte'
import Button from '$lib/components/buttons/Button.svelte'
import Youtube from "svelte-youtube-embed";
import { containsOnlyEmojis, openURL } from '$lib/utils/utils'
import { groupMessages } from '$lib/stores/groupmsgs.js'
import FillButton from '../buttons/FillButton.svelte'
import { remoteFiles } from '$lib/stores/files'
import DownloadFile from './DownloadFile.svelte'
import UploadFile from './UploadFile.svelte'

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

let thisreply = ''
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

let geturl = new RegExp(
            "(^|[ \t\r\n])((ftp|http|https|mailto|file|):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){3,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
            ,"g"
        );

const dispatch = createEventDispatcher()

let page
let offchain = false
let thisReply = false
let replyError = false

let in_swarm

onMount( async () => {
        if (reply.length === 64) 
        {
        thisReply = await checkreply(reply)
        replyMessage = true
        if (thisReply) return
        replyError = true
        }
        checkMessage()
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

    // if (containsOnlyEmojis(msg)) {
    //     emojiMessage = true
    //     return
    // }

}

//Add extra number to avoid collision for keys in Svelte each loop
const svelteHashPadding = Date.now().toString() + Math.floor(Math.random() * 1000).toString()

async function checkreply(reply) {
    let group_reply
    
    if (offchain) {
        //Search in rtc messages
        group_reply = $rtcgroupMessages.find((a) => a.hash == reply)
        group_reply.hash + svelteHashPadding
        if (group_reply) return group_reply
    }
    //Check in db if we can find it
    let thisreply = await window.api.getGroupReply(reply)
    if (!thisreply) return false
    thisreply.hash = thisreply.hash + svelteHashPadding
    return thisreply
}

const replyTo = () => {
    reply_to_this = true
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
        text: e.detail,
        reply: hash,
    })
}

const toggleActions = () => {
    showUserActions = !showUserActions
    $user.block = {
        address: msgFrom,
        name: nickname
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


</script>

<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->

<div class="message" class:yt={rtc && youtube} id="{hash}" class:reply_active="{reply_to_this}" in:fade="{{ duration: 150 }}">
    <div>
        {#if replyMessage}
            {#if thisReply}
                <div class="reply">
                    <div style="display: flex; gap: 10px; align-items: center">
                        <RepliedArrow />
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <p class="reply_nickname">{thisReply.name}</p>
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
                    <img src="data:image/png;base64,{get_avatar(msgFrom)}" alt="" />
                    <h5 class="nickname" class:share={file} class:blink_me={file}>
                        {nickname}<span class="time" class:min="{rtc}"
                            >| <Time live={30 * 1_000} relative timestamp="{parseInt(message.time)}" /></span
                        >
                    </h5>
                </div>
                <div class="actions">
                    <EmojiSelector on:emoji="{reactTo}" />
                    <ReplyArrow on:click="{replyTo}" />
                    {#if !rtc}
                    <DeleteButton on:click="{deleteMsg}"/>
                    <Dots on:click="{toggleActions}"/>
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
            {:else if rtc && file && !myMsg}
                <DownloadFile file={file} group={true}/>
            {:else if rtc && file && myMsg}
                <UploadFile file={file} group={true}/>
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

.nickname {
    font-size: 13px;
    font-weight: bold;
    display: contents;
    line-height: 20px;
}

p {
    margin: 0 0 0 30px;
    word-break: break-word;
    font-family: 'Montserrat', sans-serif !important;
}

.actions {
    display: flex;
    gap: 0.5rem;
    transition: 100ms ease-in-out;
    cursor: pointer;
    opacity: 0;
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
    font-size: 12px;
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

.emoji {
    // font-size: 21px !important;
    user-select: text;
}

.joined {
    font-style: italic;
    color: var(--info-color)
}

.share {
    color: var(--alert-color)
}

.yt {
    max-width: 350px;
}
</style>
