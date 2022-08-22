<script>
  import { fade } from "svelte/transition";
  import { get_avatar } from "$lib/utils/hugin-utils.js";
  import { user } from "$lib/stores/user.js";
  import Button from "/src/components/buttons/Button.svelte";
  import {createEventDispatcher, onMount} from "svelte";
  
  export let message;
  export let handleType;
  export let msgFrom;
  export let ownMsg;
  export let torrent
  export let file

  const dispatch = createEventDispatcher()
  let address = $user.huginAddress.substring(0, 99);
  
  $: {
    switch (message.substring(0, 1)) {
      case "Δ":
      // Fall through
      case "Λ":
        // Call offer
        message = `${message.substring(0, 1) == "Δ" ? "Video" : "Audio"} call started`;
        break;
    }
  }

  const downloadTorrent = () => {
    console.log('downloading torrent')
    dispatch('download')
  }

  $: console.log(
    'file', message.file
  )

</script>

{#if torrent}
<div class="peer">
  <div class="header peer">
    <img class="avatar " in:fade="{{duration: 150}}"
         src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">
    <h5>{$user.activeChat.name}</h5>
  </div>
  <div class="bubble from" in:fade="{{duration: 150}}">
    <Button text="Download" disabled={false} on:click={downloadTorrent}/>
  </div>
</div>



{:else}


<!-- Takes incoming data and turns it into a bubble that we then use in {#each} methods. -->
{#if ownMsg}


  <div class="own">
    <div class="header own">
      <img class="avatar" in:fade="{{duration: 150}}"
           src="data:image/png;base64,{get_avatar(address)}" alt="">
    </div>
  {#if file}

  <div class="bubble own file" in:fade="{{duration: 150}}">
    <p>{file.name}</p>
  </div>
 

  {:else}
    <div class="bubble sent" in:fade="{{duration: 150}}">
      <p>{message}</p>
    </div>
 

  {/if} 
</div>
{:else}

  <div class="peer">
    <div class="header peer">
      <img class="avatar " in:fade="{{duration: 150}}"
           src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">
      <h5>{$user.activeChat.name}</h5>
    </div>
    {#if file}

    <div class="bubble from file" in:fade="{{duration: 150}}">
      <p>{file.name}</p>
    </div>
    
    {:else}
    <div class="bubble from" in:fade="{{duration: 150}}">
      <p>{message}</p>
    </div>
  
  {/if}
</div>
{/if}

{/if}

<style>

    .header {
        display: flex;
        align-items: center;
    }

    .own {
        align-self: flex-end;
        justify-content: end;
    }

    .peer {
        align-self: flex-start;
        justify-content: start;
    }

    .avatar {
        height: 25px;
        width: 25px;
    }

    .bubble {
        color: rgba(255, 255, 255, 0.8);
        padding: 15px;
        z-index: 3;
        border-radius: 5px;
    }

    .sent {
        background: cornflowerblue;
    }

    .from {
        background: grey;
    }

    p {
        margin: 0;
        word-break: break-word;
        font-family: "Montserrat", sans-serif;
    }

    .board p {
        font-size: 17px;
    }

    .file {
      background: none !important;
    }

</style>
