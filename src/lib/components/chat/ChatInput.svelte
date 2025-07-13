<script>
  import { run } from 'svelte/legacy';

  import { onDestroy, onMount} from 'svelte'
  import SendIcon from '$lib/components/icons/SendIcon.svelte'
  import {boards, webRTC, groups, beam, swarm, keyboard} from '$lib/stores/user.js'
  import {page} from '$app/stores'
  import {user} from '$lib/stores/user.js'
  import Emoji from "$lib/components/icons/Emoji.svelte";
  import {layoutState, videoGrid} from '$lib/stores/layout-state.js'
  import 'emoji-picker-element';
  import {sleep} from "$lib/utils/utils.js";

  /** @type {{rtc?: boolean}} */
  let { rtc = false, onMessage, onTyping} = $props();

  let openEmoji = $state();
  let emojiPicker = $state()
  let messageField = $state()
  let off_chain = $state()
  let mount = $state(false)
  let activeBeam = $state(false)
  let to = $state("")
  let inrooms = $state(false)
  let inmessages = $state(false)
  let infeed = $state(false)
  let messageInput = $state($keyboard.input)
  let shiftKey

  run(() => {
    messageInput = $keyboard.input
  })

  onMount(async () => {
    mount = true
    checkPath()
    //Check if we have any active texts in this contact or room chat.
    fieldFocus()
    await sleep(1000)
    //Not sure why it takes so long to find the emoji picker.
    emojiPicker.addEventListener('emoji-click', (e) => onEmoji(e.detail.unicode))
  })

  onDestroy(() => {
    window.api.removeAllListeners("emoji-click");
  })


  function checkPath() {
    //Separating these to avoid collisions between windows.
    switch($page.url.pathname) {

      case '/messages': 
        inmessages = true
        break;
      
      case '/feed': 
        infeed = true
        break;
  
      case '/rooms':
        inrooms = true
        break;
    }
  }

  function saveText() {
    if (infeed) {
      //Wait with feed.
      
    } else if (inrooms) {
      let [inRoom, room] = getActiveRoom()
      if (inRoom) {
        inRoom.text = messageInput
      } else {
        $keyboard.room.set(room, {text: messageInput})
      }

    } else if (inmessages) {
      let [inChat, chat] = getActiveChat()
      if (inChat) {
      inChat.text = messageInput
      } else {
      $keyboard.messages.set(chat, {text: messageInput})
      }
    }

    $keyboard.input = messageInput
    $keyboard = $keyboard
  }


  function clearSavedText() {
    if (inmessages) {
      let [inChat, chat] = getActiveChat()
      if (inChat) {
         $keyboard.messages.delete(chat)
      }
    } else if (inrooms) {
      let [inRoom, room] = getActiveRoom()
      if (inRoom) {
         $keyboard.room.delete(room)
      }
    }
  }

  function getActiveRoom() {
    if (!$swarm.activeSwarm) return [undefined, false]
    const room = $swarm.activeSwarm.key
    return [$keyboard.room.get(room), room]
  }

  function getActiveChat() {
    const chat = $user.activeChat.chat
    return [$keyboard.messages.get(chat), chat]
  }

  const keyup = (e) => {
    if (e.key === 'Shift') shiftKey = false
    if (messageInput && !shiftKey && e.key === 'Enter') {
      e.preventDefault()
      sendMsg()
      onTyping({typing: false})
      return false
    }
    if(shiftKey && e.key ==='Enter') {
      autosize()
    }
    saveText()
  }

  const keydown = (e) => {
    if (e.key === 'PageDown') e.preventDefault()
    if (e.key === 'PageUp') e.preventDefault()
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


  //To handle button disabled enabled
  let enableSend = $state(false)

  //Dispatches the input data to parent and resets input.
  const sendMsg = () => {
    //Trim spaces
    let msg = messageInput.trim()
    onMessage({
      text: msg,
      offChain: off_chain,
      beam: activeBeam,
      swarm: activeSwarm
    })
    resetInputHeight()
    clearSavedText()
    messageInput = ''
  }


  

  const resetInputHeight = () => {
     //Reset input field
    if (!messageField) return
    messageField.style.cssText = 'height:auto';
    messageField.style.cssText = 'height: 40px';
  }




  async function fieldFocus() {
    await sleep(200)
    messageField.focus()
  }


  let activeSwarm = $state(false)


  function autosize() {
    if(messageInput !== '') {
      messageField.style.cssText = 'height:auto';
      messageField.style.cssText = 'height:' + messageField.scrollHeight + 'px';
    }
  }



  //Checks if input is empty
  run(() => {
    enableSend = !!messageInput
    if (enableSend) onTyping({typing: true})
    else onTyping({typing: false})

  });
  run(() => {
    if (messageInput.length < 2) resetInputHeight()
  });
  run(() => {
    if ($user.activeChat) {
      off_chain = $webRTC.call.some((a) => a.chat == $user.activeChat.chat && a.connected)
    }
  });
  run(() => {
    if ($videoGrid.showChat && $videoGrid.showVideoGrid) {
      fieldFocus()
    }
  });
  run(() => {
    if ($swarm.active.length) {
      activeBeam = $swarm.active.some(a => a.chat === $user.activeChat.chat && a.connections.some(a => a.address === $user.activeChat.chat))
    } else {
      activeBeam = false
    }
  });
  run(() => {
    if ($swarm.active.length) {
      activeSwarm = $swarm.active.some(a => a.key == $groups.thisGroup.key && $swarm.showVideoGrid);
    } else {
      activeSwarm = false
    }
  });
  run(() => {
    if (mount) {

      if (inmessages) {
        to = $user.activeChat.name
      }

    }
  });
</script>

<svelte:window onkeyup={keyup} onkeydown={keydown}/>

<div class="wrapper" class:rtc
     class:hide="{$boards.thisBoard == 'Home' && $page.url.pathname === '/boards'}"
     class:border-top="{$page.url.pathname !== '/boards'}">
    <textarea rows="1" placeholder="Message {to}" bind:this="{messageField}" bind:value="{messageInput}" onclick={() => openEmoji = false}></textarea>
    <!--<EmojiSelector on:emoji={onEmoji} />-->
    <div style="display: flex">
        <div class:openEmoji={openEmoji} style="position: absolute; bottom: 3.45rem; right: 0; display: none">
            <emoji-picker bind:this={emojiPicker}></emoji-picker>
        </div>
        <div class="emoji-button" onclick={() => openEmoji = !openEmoji}>
            <Emoji/>
        </div>
    </div>
    <div class="button" disabled="{!enableSend}" class:enableSend onclick={sendMsg}>
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
    background-color: var(--background-color);
    border: none;
    border-radius: 8px 0 0 8px;
    color: var(--text-color);
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
    background-color: var(--background-color);
    border-radius: 0 9px 9px 0;
    height: 100%;
    color: var(--text-color);
    margin: 0;
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }

  .emoji-button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    background-color: var(--background-color);
    height: 100%;
    cursor: pointer;

    &:hover {
      opacity: 0.9;
    }
  }

  .enableSend {
    background-color: var(--success-color);
    color: var(--text-color);
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