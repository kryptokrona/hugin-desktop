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
    let boards_nickname
    let myBoards = []
    onMount(async () => {

      //Set boardsarray to store
         myBoards = await window.api.getMyBoards()
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
        myBoards = user.boardsArray
    })

    userAvatar.subscribe(output => {
        avatar = output
    })

    //Copy address, msgkey or both
    function copyThis(copy) {

      navigator.clipboard.writeText(copy)

      }

      $: console.log('test ', boards_nickname)

</script>

<main in:fade>
    <div class="top">
        <h1>Dashboard</h1>
        <Balance/>
    </div>

    <!-- <h1>Welcome back! {boards_nickname}</h1> -->
    <div id="dashboard">



       <div id="recent">

         <div class="inner">
          <h3>My boards</h3>
            <br>
             {#each myBoards as board}
             <h2>{board}</h2>
             {/each}
         </div>

       </div>

       <div id="profile">
         <div class="inner">
             <br>
                   <div id="contactInfo" class="inline">
                   <h3>Profile</h3>
                    <br>
                   <input placeholder={$user.username} type="text" bind:value={boards_nickname}>
                   <span class="description">Payment address</span>
                   <span id="address" on:click={() => copyThis(address)}>{address}</span>
                   <span class="description">Message key</span>
                   <span id="myMsgKey" on:click={() => copyThis(messageKey)}>{messageKey}</span>
                    <br>
                   <button on:click={() => copyThis(huginAddress)}> Copy Both </button>

                 </div>


          </div>
       </div>

       <!-- End of dashboard window -->
       </div>


</main>

<style lang="scss">
    h1, h2, h3 {
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

    .avatar {
      width: 55px;
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
        text-overflow: ellipsis;
        margin-left: 13%;
        width: 75%;
        display: grid;
        margin-top: -5%;
    }

    #contactInfo button {
      font-family: 'Roboto Mono';
      background: #181818;
      padding: 10px;
      color: white;
      cursor: pointer;
      box-shadow: none;
      border-radius: 5px;
      border: 1px solid transparent;
      &:hover {
        outline: none;
        border: 1px solid var(--title-color);
        }
    }

    #dashboard {
      background: rgba(0,0,0,0.1);
      border-radius: 10px;
      display: grid;
      transition: .25s ease-in-out all;
      grid-template-columns: repeat(2,1fr);
    }

    #dashboard .inner {
      padding: 2rem;
      border-radius: 0.4rem;
      height: 220px;
      transition: 0.25s ease-in-out all;
      width: 400px;
      height: 700px;
    }

    input {
      box-sizing: border-box;
      background-color: var(--backgound-color);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      color: var(--title-color);
      padding: 0 10px;
      margin-bottom: 20px;
      position: fixed;
      font-size: 22px !important;
      width: 100%;
      font-size: 16px;
      height: 50px;
      display: inline-flex;
      position: relative;
      font-family: 'Roboto Mono';
      padding-left: 15px;
      &:focus {
        outline: none;
        border: 1px solid var(--title-color);
        }
      }

      .recent {
        margin-top: 4%;
        margin-left: 10%;
      }
</style>
