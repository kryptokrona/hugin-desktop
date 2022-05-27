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
<div class="bubble sent">
<img class="avatar"
     src="data:image/png;base64,{get_avatar(address)}" alt="">


        <p>{message}</p>
    </div>
    <br>
{:else}
<div class="bubble from">
<img class="avatar"
         src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">

        <p>{message}</p>
    </div>
    <br>
{/if}

{#if message.brd}

<div class="bubble board">
<img class="avatar"
         src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">

        <p>{message}</p>
    </div>
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
    }

    .sent {
      background: cornflowerblue;
      border-radius: 5px;
      display: inline-flex;
      margin-left: 5%;
      align-items: center;
    }

    .from {
      background: grey;
      border-radius: 5px;
      display: inline-flex;
      margin-left: 5%;
      margin-right: 40%;
      align-items: center;

    }

    .avatar {
      display: block;
    }

    .board p {
      font-size: 17px;
    }


</style>
