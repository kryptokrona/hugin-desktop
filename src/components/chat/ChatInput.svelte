<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import SendIcon from '/src/components/icons/SendIcon.svelte'
    import {boards, webRTC} from '$lib/stores/user.js'
    import {page} from '$app/stores'
    import {user} from '$lib/stores/user'
    import 'emoji-picker-element';
    import Emoji from "$components/icons/Emoji.svelte";

    let off_chain
    const dispatch = createEventDispatcher()
    export let rtc = false

    let openEmoji;
    onMount(() => {
        let emojiPicker = document.querySelector('emoji-picker')
        emojiPicker.addEventListener('emoji-click', (e) => onEmoji(e.detail.unicode))
    })

    const enter = (e) => {
        if (messageInput && e.keyCode === 13) {
            sendMsg()
        }
    }

    //This handles the emojis, lets fork the repo and make a darker theme.
    function onEmoji(emoji) {
        if (messageInput) {
            messageInput += emoji
        } else messageInput = emoji
        openEmoji = false
    }

    //Input data to dispatch
    let messageInput

    //To handle button disabled enabled
    let enableSend = false

    //Dispatches the input data to parent and resets input.
    const sendMsg = () => {
        dispatch('message', {
            text: messageInput,
            offChain: off_chain,
        })
        //Reset input field
        messageInput = ''
    }

    //Checks if input is empty
    $: {
        enableSend = !!messageInput
    }

    $: console.log('offchain', off_chain)

    $: {
        if ($user.activeChat) {
            off_chain = $webRTC.call.some((a) => a.chat == $user.activeChat.chat && a.connected)
            console.log('offchain', off_chain)
        }
    }

</script>

<svelte:window on:keyup|preventDefault="{enter}"/>

<div class="wrapper" class:rtc class:border-bottom="{$page.url.pathname === '/boards'}"
     class:hide="{$boards.thisBoard == 'Home' && $page.url.pathname === '/boards'}"
     class:border-top="{$page.url.pathname !== '/boards'}">
    <input type="text" placeholder="Message.." bind:value="{messageInput}" on:click={() => openEmoji = false}/>
    <!--<EmojiSelector on:emoji={onEmoji} />-->
    <div style="position: relative; display: flex:">
        <div class:openEmoji={openEmoji} style="position: absolute; bottom: 3.45rem; right: 0; display: none">
            <emoji-picker></emoji-picker>
        </div>
        <div class="emoji-button" on:click={() => openEmoji = !openEmoji}>
            <Emoji/>
        </div>
    </div>
    <div class="button" disabled="{!enableSend}" class:enableSend on:click="{sendMsg}">
        <SendIcon/>
    </div>
</div>

<style lang="scss">
  .wrapper {
    height: 73px;
    padding: 1rem;
    width: 100%;
    display: flex;
    z-index: 3;
  }

  .border-top {
    border-bottom: 1px solid transparent;
    border-top: 1px solid var(--border-color);
  }

  .border-bottom {
    border-bottom: 1px solid var(--border-color);
    border-top: 1px solid transparent;
  }

  input {
    width: inherit;
    background-color: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px 0 0 8px;
    color: #ffffff;
    padding: 10px 15px;
    margin: 0;

    &:focus {
      outline: none;
    }
  }

  .button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    background-color: rgba(255, 255, 255, 0.1);
    border-radius: 0 9px 9px 0;
    height: 100%;
    color: white;
    margin: 0;
    cursor: pointer;

    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
  }

  .emoji-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    background-color: rgba(255, 255, 255, 0.1);
    height: 100%;
    cursor: pointer;

    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
    }
  }

  .enableSend {
    background-color: var(--success-color);
    color: #fff;
    font-weight: 600;
  }

  .hide {
    display: none;
  }

  .rtc {
    max-width: 350px;
  }

  .openEmoji {
    display: flex!important;
  }
</style>
