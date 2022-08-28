<script>
  import { createEventDispatcher } from "svelte";
  import sendIcon from "/static/images/send.png";
  import EmojiSelector from "svelte-emoji-selector";
  import {webRTC} from "$lib/stores/user.js";
  import {fade} from 'svelte/transition'
  let off_chain
  const dispatch = createEventDispatcher();

  //This handles the emojis, lets fork the repo and make a darker theme.
  function onEmoji(event) {
    console.log("event", event);
    if (messageInput) {
      messageInput += event.detail;
    } else messageInput = event.detail;
  }

  //Input data to dispatch
  let messageInput;

  //To handle button disabled enabled
  let enableSend = false;

  //Check if enter is pressed and call sendMsg function
  window.addEventListener("keyup", e => {
    if (messageInput && e.keyCode === 13) {
      sendMsg();
    }
  });

  //Dispatches the input data to parent and resets input.
  const sendMsg = () => {
    dispatch("message", {
      text: messageInput,
      offChain: off_chain,
    });
    //Reset input field
    messageInput = "";
  };

  //Checks if input is empty
  $: {
    enableSend = !!messageInput;
  }

  $: {
    off_chain = $webRTC.connected
    console.log('offchain', off_chain)
  }
</script>

<div class="wrapper" in:fade="{{duration: 400}}" out:fade="{{duration: 100}}">
  <input type="text" placeholder="Message.." bind:value={messageInput}>
  <EmojiSelector on:emoji={onEmoji} />
  <button disabled={!enableSend} class:enableSend={enableSend} on:click={sendMsg}><img src={sendIcon} height="15px"
  alt=""></button>
</div>

<style lang="scss">

  .wrapper {
    height: 77px;
    box-sizing: border-box;
    padding: 20px 20px 20px 20px;
    width: 100%;
    display: flex;
    z-index: 3;
    border-bottom-right-radius: 5px;
    border-bottom-left-radius: 5px;
    border-top: 1px solid var(--card-border);
    border-bottom: 1px solid var(--card-border);
  }


  input {
    width: inherit;
    background-color: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px 0 0 8px;
    color: #ffffff;
    padding: 10px 15px;
    margin: 0;
  }

  input:focus {
    outline: none;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 40px;
    box-sizing: border-box;
    background-color: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 0 9px 9px 0;
    padding: 10px 15px 10px 10px;
    color: white;
    margin: 0;
    cursor: pointer;
  }

  button:focus {
    outline: none;
  }

  .enableSend {
    background-color: #3FD782;
    border-color: #63e79f;
    color: #fff;
    font-weight: 600;

    &:hover {
      background-color: #63e79f;
    }
  }

</style>
