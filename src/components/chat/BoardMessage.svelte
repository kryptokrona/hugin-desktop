
<script>
    import {fade} from 'svelte/transition'
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    export let message
    export let handleType
    export let msgFrom
    export let board
    export let reply
    export let myMsg
    export let signature
    export let timestamp
    export let nickname = "Anonymous"
</script>

<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->

  {#if message.r}
  <div class="reply">     <img class="reply_avatar"
           src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">
           <p class="reply_nickname">{nickname.r}</p> <br>
      <p>{message.r}</p>
      </div>

  <div class:type={handleType} class="boardMessage reply">
      <img class="avatar"
           src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">
           <p class="nickname">{nickname}</p><br>
      <p>{message}</p>
  </div>

  {:else}

    <div class:type={handleType} class="boardMessage">
        <img class="avatar"
             src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">
             <p class="nickname">{nickname}</p><br>
        <p>{message}</p><br>
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
        display: contents;
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

    .nickname {
      color: white;
      font-size: 17px;
      font-family: "Montserrat";
    }
</style>
