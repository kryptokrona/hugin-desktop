<script>
    import {fade} from 'svelte/transition'
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {user} from '$lib/stores/user.js'
    export let message
    export let handleType
    export let msgFrom
    export let ownMsg

    let address = $user.huginAddress.substring(0,99)
    $: {
        switch (message.substring(0,1)) {
            case "Δ":
            // Fall through
            case "Λ":
                // Call offer
                message = `${message.substring(0,1) == "Δ" ? "Video" : "Audio"} call started`;
                break;
        }
    }

</script>

<!-- Takes incoming data and turns it into a bubble that we then use in {#each} methods. -->
{#if ownMsg}

<img class="avatar sent" in:fade="{{duration: 150}}"
     src="data:image/png;base64,{get_avatar(address)}" alt="">
<div class="bubble sent" in:fade="{{duration: 150}}">

        <p>{message}</p>
    </div>
    <br>
{:else}

<img class="avatar from" in:fade="{{duration: 150}}"
         src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">
         <h5 class="from">{$user.activeChat.name}</h5>
<div class="bubble from" in:fade="{{duration: 150}}">

        <p>{message}</p>
    </div>
    <br>
{/if}

<style>

    .bubble {
        color: rgba(255, 255, 255, 0.8);
        padding: 15px 25px 15px 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);;
        z-index: 3;
        margin-bottom: 10px;
        margin-top: 10px;
    }

    .type {
        color: rgba(255, 255, 255, 0.8);
    }

    p {
        margin: 0;
        word-break: break-word;
        font-family: "Montserrat";
        margin-left: 5px;
        margin-right: -5px;
    }

    .sent {
      background: cornflowerblue;
      border-radius: 5px;
      display: inline-flex;
      margin-right: 4%;
      align-items: center;
      flex-direction: unset;
      justify-self: end;
      width: fit-content;
      justify-content: end;
      margin-left: 40%;
    }

    .from {
      background: grey;
      border-radius: 5px;
      display: inline-flex;
      margin-left: 4%;
      margin-right: 40%;
      align-items: center;
      width: fit-content;
    }

    .avatar {
      display: block;
      background: none !important;
      height: 25px;
    }

    .board p {
      font-size: 17px;
    }

    h5 {
      color: white;
      font-weight: bold;
      background: none !important;
      margin-bottom: 0px !important;
      margin-left: 4.5% !important;
    }


</style>
