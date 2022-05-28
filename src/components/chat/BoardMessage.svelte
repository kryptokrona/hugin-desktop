
<script>
    import {fade} from 'svelte/transition'
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    export let message
    export let handleType
    export let msgFrom
    export let board
    export let reply = ''
    export let myMsg
    export let signature
    export let timestamp
    export let nickname = "Anonymous"

    let thisreply = ''

      async function checkreply(reply) {
        console.log('checking reply');

          thisreply = await window.api.getReply(reply)
          console.log('thisreply found', thisreply);
          //Add extra number to avoid collision for keys in Svelte each loop
          thisreply.hash = thisreply.hash + '1337'
          return thisreply
      }

</script>
<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->
  {#if reply.length === 64}
  {#await checkreply(reply)}
  {:then thisreply}
  <div class="reply">     <img class="reply_avatar"
           src="data:image/png;base64,{get_avatar(thisreply.k)}" alt="">
           <p class="reply_nickname">{thisreply.n}</p> <br>
      <p>{thisreply.m}</p>
      </div>
  {:catch error}
  <div class="reply">     <img class="reply_avatar"
  src="data:image/png;base64,{get_avatar('SEKReU6UELRfBmKNUuo5mP58LVQcQqEKwZgfC7hMd5puRjMLJ5cJcLbFLkJCh6CpsB9WD2z4kqKWQGVABJxRAG5z9Hc1Esg1KV4')}" alt="">
  <p class="reply_nickname">Can't find reply</p> <br>
    	<p style="color: red">{error.message}</p>
      </div>
  {/await}
  <div class="replyline"> </div>
  <div on:click class:type={handleType} class="boardMessage replyer">
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
    z-index: 3;
    font-size: 12px;
    margin-left: 2%;
    width: 92%;
    background: rgba(0,0,0,0.2);
    border-radius: 15px;
    margin-bottom: 5px;
    }

    .nickname {
      font-size: 13px;
      font-weight: bold;
    }

    .type {
        color: rgba(255, 255, 255, 0.8);
    }

    p {
        margin: 0;
        word-break: break-word;
        display: contents;
        font-family: "Montserrat" !important;
        font-size: 13px;
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
      padding: 5px 12px 5px 5px;
      z-index: 3;
      font-size: 12px;
      width: fit-content;
      opacity: 0.85;
      border-radius: 10px;
      margin-left: 4%;
      background: rgba(0,0,0,0.1);
    }

    .reply p {
      font-size: 11px;
    }
    .replyer {
      border-top: none;
    }
</style>
