
<script>
    import {fade} from 'svelte/transition'
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    export let message
    export let handleType
    export let msgFrom
</script>

<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->

  {#if message.reply}
  <div class="reply">     <img class="reply_avatar"
           src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">

      <p>{message.reply}</p>
      </div>

  <div class:type={handleType} class="boardMessage reply">
      <img class="avatar"
           src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">

      <p>{message}</p>
  </div>

  {:else}

    <div class:type={handleType} class="boardMessage">
        <img class="avatar"
             src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">

        <p>{message}</p>
    </div>
    
  {/if}

<style>
    .boardMessage {
        display: flex;
        align-items: center;
        color: rgba(255, 255, 255, 0.8);
        padding: 15px 25px 15px 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);;
        z-index: 3;
    }
    .type {
        color: rgba(255, 255, 255, 0.8);
    }
    p {
        margin: 0;
        word-break: break-word;
    }

    .reply_avatar {
        height: 14px;
        width: 14px;
    }

    .reply {
      display: flex;
      align-items: center;
      color: rgba(255, 255, 255, 0.8);
      padding: 15px 25px 15px 15px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);;
      z-index: 3;
      font-size: 14px;
    }
</style>
