<script>
    import { fade } from 'svelte/transition';
    import Balance from "/src/components/finance/Balance.svelte";
    import {user, userAvatar} from "$lib/stores/user.js";
    import {messages} from "$lib/stores/messages.js";
    import {onMount} from "svelte";
    import {boardMessages} from "$lib/stores/boardmsgs.js";

    let huginAddress
    let address
    let messageKey
    let avatar
    let huginAddr

    onMount(async () => {

      //Set boardsarray to store
        let myBoards = await window.api.getMyBoards()
            console.log('respone?', myBoards);

            user.update(data => {
              return {
                ...data,
                boardsArray: myBoards,
              }

            })

  })


  user.update(oldData => {
     return {
         ...oldData,
         loggedIn: true
     }
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
