<script>
  import {createEventDispatcher, onDestroy, onMount} from 'svelte'
  import SendIcon from '$lib/components/icons/SendIcon.svelte'
  import {boards, webRTC, groups, beam} from '$lib/stores/user.js'
  import {page} from '$app/stores'
  import {user} from '$lib/stores/user.js'
  import Emoji from "$lib/components/icons/Emoji.svelte";
  import {layoutState, videoGrid} from '$lib/stores/layout-state.js'
  import 'emoji-picker-element';
  import {sleep} from "$lib/utils/utils.js";

  const dispatch = createEventDispatcher()
  export let rtc = false

  let openEmoji;
  let emojiPicker
  let messageField
  let off_chain
  let mount = false
  let activeBeam = false
  let to = ""
  let shiftKey
  let messageInput = ""

  onMount(async () => {
    mount = true
    await sleep(1000)
    //Not sure why it takes so long to find the emoji picker.
    emojiPicker = document.querySelector('emoji-picker')
    emojiPicker.addEventListener('emoji-click', (e) => onEmoji(e.detail.unicode))
  })

  onDestroy(() => {
    emojiPicker = ''
    window.api.removeAllListeners("emoji-click");
  })

  const keyup = (e) => {
    if (e.key === 'Shift') shiftKey = false
    if (messageInput && !shiftKey && e.key === 'Enter') {
      e.preventDefault()
      sendMsg()
      return false
    }
    if(shiftKey && e.key ==='Enter') {
      autosize()
    }
  }

  const keydown = (e) => {
    if (e.key === 'Shift') shiftKey = true
    if (messageInput && !shiftKey && e.key === 'Enter') { 
      e.preventDefault()
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
  //To handle button disabled enabled
  let enableSend = false

  //Dispatches the input data to parent and resets input.
  const sendMsg = () => {
    //Trim spaces
    let msg = messageInput.trim()
    dispatch('message', {
      text: msg,
      offChain: off_chain,
      beam: activeBeam
    })
    resetInputHeight()
    messageInput = ''
  }

  //Checks if input is empty
  $: {
    enableSend = !!messageInput
  }

  $: if (messageInput.length < 2) resetInputHeight()
  

  const resetInputHeight = () => {
     //Reset input field
    if (!messageField) return
    messageField.style.cssText = 'height:auto';
    messageField.style.cssText = 'height: 40px';
  }

  $: {
    if ($user.activeChat) {
      off_chain = $webRTC.call.some((a) => a.chat == $user.activeChat.chat && a.connected)
    }
  }

  $: if ($groups.replyTo.reply && $page.url.pathname === '/groups' && mount) {
    fieldFocus()
  }

  $: if ($videoGrid.showChat && $videoGrid.showVideoGrid) {
    fieldFocus()
  }

  async function fieldFocus() {
    await sleep(200)
    messageField.focus()
  }

  $: {
    if ($beam.active.length) {
      activeBeam = $beam.active.some(a => a.chat == $user.activeChat.chat && a.connected);
    } else {
      activeBeam = false
    }
  }

  function autosize() {
    console.log(messageField.scrollHeight)
    if(messageInput !== '') {
      messageField.style.cssText = 'height:auto';
      messageField.style.cssText = 'height:' + messageField.scrollHeight + 'px';
    }
  }

  $:
    if (mount) {
    if ($page.url.pathname === '/groups') {
      to = $groups.thisGroup.name
    }

    if ($page.url.pathname === '/messages') {
      to = $user.activeChat.name
    }

  }




</script>

<svelte:window on:keyup="{keyup}" on:keydown="{keydown}"/>

<div class="wrapper" class:rtc
     class:hide="{$boards.thisBoard == 'Home' && $page.url.pathname === '/boards'}"
     class:border-top="{$page.url.pathname !== '/boards'}">
    <textarea rows="1" placeholder="Message {to}" bind:this="{messageField}" bind:value="{messageInput}" on:click={() => openEmoji = false}></textarea>
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
    padding: 1rem;
    width: 100%;
    display: flex;
    z-index: 3;
  }

  .border-top {
    cursor: grab;
    border-bottom: 1px solid transparent;
    border-top: 1px solid var(--border-color);
  }

  .border-bottom {
    border-bottom: 1px solid var(--border-color);
    border-top: 1px solid transparent;
  }

  textarea {
    overflow: auto;
    box-sizing: padding-box;
    background-color: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px 0 0 8px;
    color: #ffffff;
    display: block;
    width: inherit;
    padding: 10px 15px;
    font-size: 14px;
    min-height: 40px;
    resize: none;
    max-height: 260px;
    font-family: "Montserrat";

    &:focus {
      outline: none;
    }
  }

  textarea::-webkit-scrollbar {
    display: none;
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
    display: flex !important;
  }
</style>
