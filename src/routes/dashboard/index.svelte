<script>
    import { fade } from 'svelte/transition';
    import Balance from "/src/components/finance/Balance.svelte";
    import {user, userAvatar} from "$lib/stores/user.js";
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {messages} from "$lib/stores/messages.js";
    import {onMount} from "svelte";
    import {boardMessages} from "$lib/stores/boardmsgs.js";

    let huginAddress
    let address
    let messageKey
    let avatar

    onMount(async () => {
    //Get messages and save to a variable.
    messages.set(await window.api.getMessages(res => {
      console.log('response', res)
    }))

    boardMessages.set(await window.api.getBoardMsgs(data => {
      console.log('response', data)
    }))
  })

    user.subscribe(user => {
        huginAddress = user.huginAddress
        address = huginAddress.substring(0,99);
        messageKey = huginAddress.substring(99,163);
    })

    userAvatar.subscribe(output => {
        avatar = output
    })

    //Copy address, msgkey or both
    function copyThis(copy) {

      navigator.clipboard.writeText(copy)

      }

</script>

<main in:fade>
    <div class="top">
        <h1>Dashboard</h1>
        <Balance/>
    </div>
    <h1>Welcome back! {$user.username}</h1>

     <div id="profile">

       <h2>Profile</h2>
       <div class="inner">
          <div class="dashboard_avatar">
          <img class="avatar" src="data:image/png;base64,{avatar}" alt="avatar">
          </div>
       </div>
           <br>
                 <div id="contactInfo" class="inline">

                 <span class="description">Payment address</span>
                 <br>
                 <span id="address" on:click={() => copyThis(address)}>{address}</span>
                 <br>

                 <span class="description">Message key</span>
                 <br>
                 <span id="myMsgKey" on:click={() => copyThis(messageKey)}>{messageKey}</span>

               </div>

               <button on:click={() => copyThis(huginAddress)}> Copy Both </button>

       </div>


</main>

<style>
    h1, h2 {
        color: white;
        margin: 0
    }

    main {
        margin: 0 85px;
        z-index: 3;
    }

    .top {
        display: flex;
        justify-content: space-between;
        width: 100%;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 15px 20px 15px 20px;
        box-sizing: border-box;
    }

    h1 {
        font-weight: 400;
    }

    .huginAddress {
        color: white;
    }

    .description {
        color: white;
        font-weight: bold;
        font-size: 12px;
    }

    #address, #myMsgKey {
        text-overflow: ellipsis;
        color: white;
        display: block;
        padding: 5px;
        font-size: 14px;
        font-family: 'Roboto Mono';
        overflow: hidden;

    }

    #contactInfo {
        width: 25%;
        text-overflow: ellipsis;
    }

</style>
