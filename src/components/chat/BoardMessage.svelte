
<script>
    import {fade} from 'svelte/transition'
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {createEventDispatcher, onMount} from "svelte";
    import {user, boards} from '$lib/stores/user.js'
    import Reaction from "/src/components/chat/Reaction.svelte";
    import EmojiSelector from 'svelte-emoji-selector'
    import Time, { svelteTime } from "svelte-time";
    export let msg
    export let msgFrom
    export let board
    export let reply = ''
    export let myMsg
    export let signature
    export let timestamp
    export let nickname = "Anonymous"
    export let hash
    export let message
    export let reply_to_this = false

    let active
    let replyicon = '<'
    let thisreply = ''
    let has_reaction = false
    let reactionslist = []
    let hoverReactions = false
    let reactions = []
    let reactors = []
    let react = false
    let reactIcon = '😊'
    let replyMessage = false
    let reactionCount
    let time
    const dispatch = createEventDispatcher()

      //Hover functions
    	function enter() {
    		active = true;
    	}

    	function leave() {
        if (active && reply_to_this) return
    		active = false;
    	}

      async function checkreply(reply) {

        thisreply = await window.api.getReply(reply)
        //Add extra number to avoid collision for keys in Svelte each loop
        thisreply.hash = thisreply.hash + '1337'
        return thisreply
      }

      const replyTo = () => {
        reply_to_this = true
        // Dispatch the inputted data
            dispatch('replyTo', {
                reply: 'reply',
            })
      }


      const sendReactMsg = (e) => {
        console.log('wanna send', e.detail);
        dispatch('reactTo', {
          text: e.detail.msg,
          reply: hash
        })
        //window.api.sendBoardMsg()
      }

      const reactTo = (e) => {
        console.log('reactto', e);
        dispatch('reactTo', {
          text: e.detail,
          reply: hash
        })

      }

      $ : if ($boards.replyTo.reply == false) {
        reply_to_this = false
      } else if ( $boards.replyTo.to == hash) {
        reply_to_this = true
      }

      $: reactions

      $: if (reply.length === 64) {
        replyMessage = true
      }

      $: if (message.react) {
        let thisemoji = {}
        reactions = message.react.filter(a => !thisemoji[a.m] && (thisemoji[a.m] = true))
        has_reaction = true
      }

</script>
<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->
  {#if replyMessage}
    {#await checkreply(reply)}
      {:then thisreply}

  <div in:fade="{{duration: 150}}" class="reply">     <img class="reply_avatar"
           src="data:image/png;base64,{get_avatar(thisreply.k)}" alt="">
           <p class="reply_nickname">{thisreply.n}</p> <br>
      <p>{thisreply.m}</p>
      </div>


  {:catch error}
  <div  in:fade="{{duration: 150}}" class="reply">     <img class="reply_avatar"
  src="data:image/png;base64,{get_avatar('SEKReU6UELRfBmKNUuo5mP58LVQcQqEKwZgfC7hMd5puRjMLJ5cJcLbFLkJCh6CpsB9WD2z4kqKWQGVABJxRAG5z9Hc1Esg1KV4')}" alt="">
  <p class="reply_nickname">Can't find reply</p> <br>
    	<p style="color: red">{error.message}</p>
      </div>

  <div class="replyline"> </div>
    {/await}

  {/if}
    <div class:reply_active={reply_to_this} class:replyline={replyMessage} in:fade="{{duration: 150}}" on:mouseenter={enter} on:mouseleave={leave} class="boardMessage">

        <img class="avatar"
             src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">
             <br>
             <p class="nickname">{nickname}</p>
             <br>
        <p>{msg}</p>
        <br>
        <br>
        <Time class="time" relative timestamp="{parseInt(message.t * 1000)}" />
        {#if active}
          <div class="options"  in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" on:click={replyTo} on:mouseenter={enter} on:mouseleave={leave} class:active>

          <p class="reply_button" on:click={replyTo}>{replyicon}</p>
          <EmojiSelector on:emoji={reactTo}/>

          </div>
        {:else}
          <p></p>
        {/if}
  </div>
      {#if has_reaction}
      
      <div class="reactions">
        {#each reactions as reaction}
          <Reaction
          on:sendReaction={(e) => sendReactMsg(e)}
           thisReaction={reaction}
           reacts={message.react}
           emoji={reaction.m}
           react={react}/>
        {/each}
      </div>
      {/if}


<style>
    .boardMessage {
      display: flex;
      align-items: center;
      color: rgba(255, 255, 255, 0.8);
      padding: 10px;
      z-index: 3;
      font-size: 12px;
      margin-left: 2%;
      width: 92%;
      background: rgba(0,0,0,0.2);
      border-radius: 15px;
      margin-bottom: 5px;
      border: 1px solid transparent;
      padding-right: 2%;
      position: relative;
    }

    .nickname {
      font-size: 13px;
      font-weight: bold;
      display: contents;
      line-height: 20px;
    }

    .type {
        color: rgba(255, 255, 255, 0.8);
    }

    p {
        margin: 0;
        word-break: break-word;
        font-family: "Montserrat" !important;
        display: contents;
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
    }

    .options {
      font-family: 'Roboto Mono';
      color: white;
      opacity: 0.9;
      width: 15px;
      align-items: unset;
      width: 50px;
      position: absolute;
      right: 0%;
      top: 10%;
      display: flex;
      flex: auto;
    }

    .reply_button:hover {
      opacity: 1
    }

    .reply_button p {
      cursor: pointer;
      display: contents;

    }

    .active {
		color: white;
	}

  .reply_active {
    border-color: #5f86f2;
    border: 1px solid #5f86f2;
    -webkit-animation: border_rgb 10s ease infinite;
    -moz-animation: border_rgb 10s ease infinite;
    animation: border_rgb 10s ease infinite;
  }

  .reactions {
    font-family: 'Roboto Mono';
    color: black;
    opacity: 0.9;
    width: 25px;
    display: inline;
    flex: auto;
    border-radius: 5px;
    position: relative;
    height: 25px;
    margin-left: 25px;
    margin-top: -20px;
  }
    .reactions p {
      position: relative;
      color: black;
      display: inline-block;
    }

    :global(time) {
      color: white;
      font-size: 8px;
      display: flex;
      letter-spacing: 1px;
      display: contents;
      align-self: unset;
      font-family: "Roboto Mono" !important;
    }

    .react_button {
      cursor: pointer;
    }

    .reply_button {
    cursor: pointer;
    }

    .avatar {
      align-self: baseline;
      margin-top: 7px;
    }


</style>
