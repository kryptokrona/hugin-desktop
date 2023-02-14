<script>
    import {fade} from 'svelte/transition'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import {beam, user} from '$lib/stores/user.js'
    import Button from '$lib/components/buttons/Button.svelte'
    import {createEventDispatcher, onMount} from 'svelte'
    import Time from 'svelte-time'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import Lightning from "$lib/components/icons/Lightning.svelte";
    import { containsOnlyEmojis, openURL } from '$lib/utils/utils'
    import CodeBlock from './CodeBlock.svelte'
    import Youtube from "svelte-youtube-embed";
    import DownloadFile from '$lib/components/chat/DownloadFile.svelte'
    import UploadFile from '$lib/components/chat/UploadFile.svelte'

    export let message
    export let msgFrom
    export let ownMsg
    export let files = false
    export let timestamp
    export let beamMsg = false
    
    let torrent = false
    let oldInvite = false
    let beamInvite = false
    let address = $user.huginAddress.substring(0, 99)
    let beamConnected = false
    let codeBlock = false
    let emojiMessage = false
    let lang = "js"
    let codeMessage
    let youtube = false
    let embed_code
    let youtubeLink = false
    let openLink = false
    let link = false
    let messageText
    let messageLink
    let beamFile = false
    let geturl = new RegExp(
              "(^|[ \t\r\n])((ftp|http|https|mailto|file|):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){3,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
             ,"g"
           );

    onMount(() => {
        checkMessageType()
    })

    const checkMessageType = () => {

        if (message.match(geturl)) {
            link = true
            messageLink = message.match(geturl)
            messageText = message.replace(messageLink,'')
            //Todo handle many links in one message? an each loop in the link if block? We need to check if there is any text aswell.
            messageLink = messageLink[0]
        }

        if (link && message.match(/youtu/) || message.match(/y2u.be/)) {
            youtubeLink = true
            if (ownMsg) checkLink()
        }

        if (message.substring(0,7) === "BEAM://") {
            if (Date.now() - timestamp >= 1000 * 1000) {
                oldInvite = true
            }
            beamInvite = true
        }

        if (message.substring(0,11) === "BEAMFILE://") {
            if (Date.now() - timestamp >= 1000 * 1000) {
                oldInvite = true
            }
            beamInvite = true
            beamFile = true
        }
        
        if (message.startsWith("```") && message.endsWith("```")) {
            checkCodeLang(message)
        }

        if (containsOnlyEmojis(message)) {
            emojiMessage = true
        }
    }

    const checkCodeLang = (msg) => {
        let codeMsg = msg.slice(3,-3)
        //The first two letters after ``` indicates code lang
        if (codeMsg.startsWith("ts") || codeMsg.startsWith("js") ) {
            codeMessage = codeMsg.slice(2).trim()
            lang = codeMsg.slice(0,2)
        } else {
            lang = "js"
            codeMessage = codeMsg
        }
        codeBlock = true
    }

    const joinBeam = () => {
        let key = message.substring(7,59)
        if (beamFile) key = message.substring(11,63)
        if (key === "new") return
        window.api.createBeam(key, $user.activeChat.chat + $user.activeChat.key)
        $beam.active.push({
            chat: $user.activeChat.chat,
            connected: false,
            key: key
        })
        $beam.active = $beam.active
    }

    const openEmbed = () => {
        if (message.includes('&amp;list')) {
            message = message.split('&amp;list')[0]
        }
        setEmbedCode()
    }

    const openLinkMessage = (url) =>{
        openURL(url)
    }

  
    const checkLink = () => {
        if (messageLink.includes('&list')) {
            messageLink = messageLink.split('&list')[0]
        }
        setEmbedCode()
    }

    const setEmbedCode = () => {
        embed_code = messageLink.split('/').slice(-1)[0].split('=').slice(-1)[0];
        youtube = true
    }

    
    $: beamConnected = $beam.active.some(a => a.key == message.substring(7,59) && a.connected)

    //Replace call info with message
    $: {
        switch (message.substring(0, 1)) {
            case 'Δ':
            // Fall through
            case 'Λ':
                // Call offer
                message = `${message.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`
                break
        }
    }



</script>

{#if torrent}
    <div class="peer">
        <div class="header peer">
            <img
                class="avatar "
                in:fade="{{ duration: 150 }}"
                src="data:image/png;base64,{get_avatar(msgFrom)}"
                alt=""
            />
            <h5>{$user.activeChat.name}</h5>
        </div>
        <div class="bubble from" in:fade="{{ duration: 150 }}">
            <Button text="Download" disabled="{false}" on:click="{downloadFile}" />
        </div>
    </div>
{:else}
    <!-- Takes incoming data and turns it into a bubble that we then use in {#each} methods. -->
    {#if ownMsg}
        <div class="wrapper">
            <div class="avatar-box">
                <img
                    in:fade="{{ duration: 150 }}"
                    src="data:image/png;base64,{get_avatar(address)}"
                    alt=""
                />
            </div>
            <div class="content">
                <div style="display: flex; gap: 1rem; justify-content: space-between; align-items: center">
                    <p class="nickname">
                        {$user.username}
                        <span class="time">
                            | <Time relative timestamp="{parseInt(timestamp)}" /></span
                        >
                    </p>
                    {#if beamMsg}
                        <div style="opacity: 50%">
                            <Lightning size="16" fill='#f5f5f5'/>
                        </div>
                    {/if}
                </div>
                {#if files}
                <div style="cursor: pointer">
                <UploadFile file={files[0]} />
                </div>
                    {:else if beamInvite || oldInvite}
                        <p in:fade class="message">Started a beam ⚡️</p>
                    {:else if beamConnected}
                        <p in:fade>Beam connected ⚡️</p>
                    {:else if codeBlock}
                        <CodeBlock lang={lang} code={codeMessage} />
                    {:else if youtube}
                        <p class="message">{messageText}</p>
                        <Youtube id={embed_code} />
                    {:else if link}
                        <p class="message" style="user-select: text; font-weight: bold; cursor: pointer;" on:click={openLinkMessage(messageLink)}>{messageLink}</p>
                        <p class="message" style="user-select: text;">{messageText}</p>
                    {:else if emojiMessage}
                    <p class="message emoji">{message}</p>
                    {:else}
                    <p class="message">{message}</p>
                {/if}
            </div>
        </div>
    {:else}
        <div class="wrapper">
            <div class="avatar-box">
                <img
                    in:fade="{{ duration: 150 }}"
                    src="data:image/png;base64,{get_avatar(msgFrom)}"
                    alt=""
                />
            </div>
            <div class="content">
                <div style="display: flex; gap: 1rem; justify-content: space-between; align-items: center">
                    <p class="nickname">
                        {$user.activeChat.name}
                        <span class="time">
                            | <Time relative timestamp="{parseInt(timestamp)}"/></span
                        >
                    </p>
                    {#if beamMsg}
                        <div style="opacity: 50%">
                            <Lightning size="16" fill='#f5f5f5'/>
                        </div>
                    {/if}
                </div>
                {#if files}
                <div style="cursor: pointer">
                   <DownloadFile file={files[0]}/>
                </div>
                    {:else if beamInvite && !oldInvite && !beamConnected}
                        <div style="margin-top: 1rem">
                            {#if beamFile}
                            <p class="message">{$user.activeChat.name} is sharing files with you.</p>
                            <br>
                            <FillButton text="⚡️ Connect" disabled={false} on:click={joinBeam}/>
                            {:else}
                            <p class="message">{$user.activeChat.name} has started a p2p chat.</p>
                            <br>
                            <FillButton text="⚡️ Join" disabled={false} on:click={joinBeam}/>
                            {/if}
                        </div>
                    {:else if oldInvite}
                        <p in:fade class="message">Started a beam ⚡️</p>
                    {:else if beamConnected}
                        <p in:fade>Beam connected ⚡️</p>
                    {:else if codeBlock}
                        <CodeBlock lang={lang} code={codeMessage} />
                    {:else if youtube}
                        <p class="message">{messageText}</p>
                        <Youtube id={embed_code} />
                    {:else if youtubeLink}
                        <Button disabled="{false}" text={"Open Youtube"} on:click={() => openEmbed()} />
                    {:else if link}
                        <p class="message" style="user-select: text; font-weight: bold; cursor: pointer;" on:click={openLinkMessage(messageLink)}>{messageLink}</p>
                        <p class="message" style="user-select: text;">{messageText}</p>
                    {:else if emojiMessage}
                        <p class="message emoji">{message}</p>
                    {:else}
                        <p class="message" style="user-select: text;">{message}</p>
                {/if}
            </div>
        </div>
    {/if}
{/if}

<style lang="scss">

.wrapper {
    padding: 10px 20px;
    display: flex;
    width: 100%;

    &:hover {
        background-color: var(--card-background);
    }
}

.avatar-box {
    height: 48px;
    width: 48px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
        height: 48px;
        width: 48px;
    }
}

.content {
  display: flex;
  flex-direction: column;
  padding-left: 1rem;
  justify-content: center;
  width: 100%;
  gap: 0.25rem;

  .nickname {
    margin: 0;
    word-break: break-word;
    font-family: 'Montserrat', sans-serif;
    font-weight: 600;
  }

    .message {
        margin: 0;
        word-break: break-word;
        font-family: 'Montserrat', sans-serif;
        font-weight: 400;
        color: var(--text-color);
        font-size: 15px;
        user-select: all;
    }
}

.time {
    color: var(--text-color);
    opacity: 80%;
    font-weight: 400;
    font-size: 0.75rem;
}

.beam {
    box-shadow: 0 0 10px white;
}

.emoji {
    font-size: 21px !important;
}

</style>
