<script>
  import { run } from 'svelte/legacy';

    import {fade} from 'svelte/transition'
    import {get_avatar, getColorFromHash} from '$lib/utils/hugin-utils.js'
    import {beam, rooms, user} from '$lib/stores/user.js'
    import Button from '$lib/components/buttons/Button.svelte'
    import { onMount} from 'svelte'
    import Time from 'svelte-time'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import Lightning from "$lib/components/icons/Lightning.svelte";
    import { containsOnlyEmojis, isLatin, openURL } from '$lib/utils/utils'
    import Youtube from "svelte-youtube-embed";
    import DownloadFile from '$lib/components/chat/DownloadFile.svelte'
    import UploadFile from '$lib/components/chat/UploadFile.svelte'

  /** @type {{message: any, msgFrom: any, ownMsg: any, files?: boolean, timestamp: any, beamMsg?: boolean, error?: boolean}} */
  let {
    message = $bindable(),
    msgFrom,
    ownMsg,
    files = false,
    timestamp,
    beamMsg = false,
    error = false
  } = $props();
    
    let torrent = false
    let oldInvite = $state(false)
    let beamInvite = $state(false)
    let address = $user.myAddress
    let beamConnected = $state(false)
    let emojiMessage = false
    let lang = $state("js")
    let codeMessage = $state()
    let youtube = $state(false)
    let embed_code = $state()
    let youtubeLink = $state(false)
    let openLink = false
    let link = $state(false)
    let messageText = $state()
    let messageLink = $state()
    let beamFile = $state(false)
    let clicked = $state(false)
    let beam_key = $state("")
    let youtube_shared_link_type = false
    let asian = $state(false)
    let timeformat = $state("HH:mm")
    if ((Date.now() - 40000000) > timestamp) {
        //Show date also for older messages
        timeformat = "D MMM, HH:mm"
    }
    let geturl = new RegExp(
              "(^|[ \t\r\n])((ftp|http|https|mailto|file|):(([A-Za-z0-9$_.+!*(),;/?:@&~=-])|%[A-Fa-f0-9]{2}){3,}(#([a-zA-Z0-9][a-zA-Z0-9$_.+!*(),;/?:@&~=%-]*))?([A-Za-z0-9$_+!*();/?:~-]))"
             ,"g"
           );

    onMount(() => {
        checkMessageType()
    })

    const checkMessageType = () => {

        if (files) return

        if (message.match(geturl)) {
            link = true
            messageLink = message.match(geturl)
            messageText = message.replace(messageLink,'')
            //Todo handle many links in one message? an each loop in the link if block? We need to check if there is any text aswell.
            messageLink = messageLink[0]
        }

        if (link && message.match(/youtube.com/) || message.match(/youtu.be/)) {
            if (message.match(/youtu.be/)) youtube_shared_link_type = true
            youtubeLink = true
            if (ownMsg) checkLink()
            return
        }

        if (message.substring(0,7) === "BEAM://") {
            if (Date.now() - timestamp >= 1000 * 1000) {
                oldInvite = true
            }
            beamInvite = true
            return
        }

        if (message.substring(0,11) === "BEAMFILE://") {
            if (Date.now() - timestamp >= 1000 * 1000) {
                oldInvite = true
            }
            beamInvite = true
            beamFile = true
            return
        }
        
        
        if (ownMsg) {
            if (!isLatin($user.username)) {
                asian = true
            }
        return
        }

        if (!isLatin($user.activeChat.name)) {
            asian = true
        }
    }

    run(() => {
        if (beamInvite) {
         beam_key = beamFile ? message.substring(11,63) : message.substring(7,59)
        }
    });


    const joinBeam = () => {
        clicked = true
        window.api.createBeam($user.activeChat.chat + $user.activeChat.key)
        $beam.active.push({
            chat: $user.activeChat.chat,
            connected: false,
            key: key
        })
        $beam.active = $beam.active
    }

    const openEmbed = () => {
        if (messageLink.includes('&amp;list')) {
            messageLink = messageLink.split('&amp;list')[0]
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
        if (!youtube_shared_link_type) { 
            embed_code = messageLink.split('watch?v=')[1];
        } else {
            embed_code = messageLink.split('youtu.be/')[1]
        }
        youtube = true
    }

    
    run(() => {
    beamConnected = $beam.active.some(a => a.key == beam_key && a.connected)
  });

    //Replace call info with message
    run(() => {
        switch (message.substring(0, 1)) {
            case 'Δ':
            // Fall through
            case 'Λ':
                // Call offer
                message = `${message.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`
                break
        }
    });

    const check_avatar = (address) => {
        const found = $rooms.avatars.find(a => a.address === address)
        if (found) return found.avatar
        else return false
    }


</script>

    <!-- Takes incoming data and turns it into a bubble that we then use in {#each} methods. -->
    {#if ownMsg}
        <div class="wrapper" class:error={error}>
               
            {#await check_avatar(address)}
            {:then avatar}
            {#if avatar}
                <img
                    in:fade|global="{{ duration: 150 }}"
                    class="avatar-box"
                    src="{avatar}"
                    alt=""
                />
            {:else}
            <div class="avatar-box">
                <img
                    in:fade|global="{{ duration: 150 }}"
                    src="data:image/png;base64,{get_avatar(address)}"
                    alt=""
                />
            </div>
            {/if}
            {/await}

            <div class="content">
                <div style="display: flex; gap: 1rem; justify-content: space-between; align-items: center">
                    <p class:asian class="nickname" style="color: {getColorFromHash($user.myAddress)}">
                        {$user.username}
                        <span class="time">
                            | <Time live={30 * 1_000} format={timeformat} timestamp="{parseInt(timestamp)}" /></span
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
                <UploadFile file={files} />
                </div>
                    {:else if beamInvite || oldInvite}
                        <p in:fade|global class="message">Started a beam ⚡️</p>
                    {:else if beamConnected}
                        <p in:fade|global class="message blink_me finish">Beam connected ⚡️</p>
                    {:else if youtube}
                        <p class="message">{messageText}</p>
                        <Youtube id={embed_code} />
                    {:else if link}
                        <p class="message" style="user-select: text; font-weight: bold; cursor: pointer;" onclick={openLinkMessage(messageLink)}>{messageLink}</p>
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

            {#await check_avatar(msgFrom)}
            {:then avatar}
            {#if avatar}
                <img
                    in:fade|global="{{ duration: 150 }}"
                    class="avatar-box"
                    src="{avatar}"
                    alt=""
                />
            {:else}
            <div class="avatar-box">
                <img
                    in:fade|global="{{ duration: 150 }}"
                    src="data:image/png;base64,{get_avatar(msgFrom)}"
                    alt=""
                />
            </div>
            {/if}
            {/await}
        
            <div class="content">
                <div style="display: flex; gap: 1rem; justify-content: space-between; align-items: center">
                    <p class:asian class="nickname" style="color: {getColorFromHash(msgFrom)}">
                        {$user.activeChat.name}
                        <span class="time">
                            | <Time live={30 * 1_000} format={timeformat} timestamp="{parseInt(timestamp)}"/></span
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
                   <DownloadFile file={files}/>
                </div>
                    {:else if beamInvite && !oldInvite && !beamConnected}
                        <div style="margin-top: 1rem">
                            {#if beamFile && !clicked}
                            <p class="message">{$user.activeChat.name} is sharing files with you.</p>
                            <br>
                            <FillButton text="⚡️ Connect" disabled={false} on:click={joinBeam}/>
                            {:else if !beamFile && !clicked}
                            <p class="message">{$user.activeChat.name} has started a p2p chat.</p>
                            <br>
                            <FillButton text="⚡️ Join" disabled={false} on:click={joinBeam}/>
                            {:else if clicked}
                            <p class="message finish" in:fade|global>Connecting</p>
                            {/if}
                        </div>
                    {:else if oldInvite}
                        <p in:fade|global class="message">Started a beam ⚡️</p>
                    {:else if beamConnected}
                        <p class="message blink_me finish" in:fade|global>Beam connected ⚡️</p>
                    {:else if youtube}
                        <p class="message">{messageText}</p>
                        <Youtube id={embed_code} />
                    {:else if youtubeLink}
                        <Button disabled="{false}" text={"Open Youtube"} on:click={() => openEmbed()} />
                    {:else if link}
                        <p class="message" style="user-select: text; font-weight: bold; cursor: pointer;" onclick={openLinkMessage(messageLink)}>{messageLink}</p>
                        <p class="message" style="user-select: text;">{messageText}</p>
                    {:else if emojiMessage}
                        <p class="message emoji">{message}</p>
                    {:else}
                        <p class="message" style="user-select: text;">{message}</p>
                {/if}
            </div>
        </div>
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
    object-fit: cover;

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
        white-space: pre-line;
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
    // font-size: 21px !important;
    user-select: text;
}

.finish {
    color: var(--success-color) !important;
}

.error {
    border: 1px solid;
    border-color: var(--warn-color) !important;
}

.asian {
    font: menu;
    font-size: 15px;
    font-weight: 500 !important;
}


</style>
