<script>
  import { fade } from "svelte/transition";
  import Balance from "/src/components/finance/Balance.svelte";
  import { user, userAvatar, misc, boards } from "$lib/stores/user.js";
  import { onMount } from "svelte";
  import { capitalizeFirstLetter } from "$lib/utils/utils";
  import Globe from "$components/buttons/Globe.svelte";
  import Warning from "$components/buttons/Warning.svelte";
  import NodeStatus from "$components/popups/NodeStatus.svelte";
  import FundsStatus from "$components/popups/FundsStatus.svelte";
  import {prettyNumbers} from "$lib/utils/utils.js";
  import Transactions from "$components/finance/Transactions.svelte";

  let huginAddress;
  let address;
  let messageKey;
  let avatar;
  let myBoards = [];
  let date = new Date();
  let hrs = date.getHours();
  let greet;
  let nodePopup;
  let fundsPopup;
  let dc;

  onMount(async () => {

    //Set boardsarray to store
    myBoards = await window.api.getMyBoards();
    let sortedBoards = myBoards.filter(a=> a !== 'Home')
    sortedBoards.unshift('Home')
    boards.update(data => {
      return {
        ...data,
        boardsArray: sortedBoards
      };
    });

    misc.update(oldData => {
				return {
						...oldData,
						loading: false,
				}
		})

    if (hrs < 12)
      greet = "Good Morning";
    else if (hrs >= 12 && hrs <= 17)
      greet = "Good Afternoon";
    else if (hrs >= 17 && hrs <= 24)
      greet = "Good Evening";
  });

  $: {
    huginAddress = $user.huginAddress;
    myBoards = $boards.boardsArray;
    address = huginAddress.substring(0, 99);
    messageKey = huginAddress.substring(99, 163);
    avatar = $userAvatar;
  }

  //Copy address, msgkey or both
  function copyThis(copy) {
    navigator.clipboard.writeText(copy);
  }

  
  let locked
    let unlocked
    let total

    $: {
        locked = prettyNumbers($misc.balance[1])
        unlocked = prettyNumbers($misc.balance[0])
        total = prettyNumbers($misc.balance[0] + $misc.balance[1])
    }

</script>

<main in:fade>

  <div class="status">
    <Balance />
    <div style="display: flex; align-items: center; justify-content: center; gap: 15px">
      <Globe
        yellow={$misc.syncState === 'Syncing'}
        red={$misc.syncState === 'Not Synced' || $misc.syncState === 'Disconnected' || $misc.syncState === 'Dead node'}
        blink={$misc.syncState !== 'Synced'}
        on:click={() => nodePopup = !nodePopup}
      />
      <Warning
        blink={($misc.balance[1] !== 0)}
        grey={($misc.balance[1] === 0)}
        yellow={($misc.balance[1] !== 0)}
        red={dc} on:click={() => fundsPopup = !fundsPopup}
      />
    </div>
  </div>

  {#if nodePopup}
    <NodeStatus on:click={() => nodePopup = !nodePopup}/>
  {:else if fundsPopup}
    <FundsStatus on:click={() => fundsPopup = !fundsPopup}/>
  {/if}

<div class="dashboard">

    <h2>{greet}, {capitalizeFirstLetter($user.username)}!</h2>
    
  <div id="profile" in:fade>
    <div class="inner">
    <h3>Profile</h3>
    <button on:click={() => copyThis(huginAddress)}> Copy Hugin Address</button>
    <div class="user">
      <div>
        <h4>Payment address</h4>
        <p class="address" on:click={() => copyThis(address)}>{address.substring(0, 10) + "..." + address.substring(89, address.length)}</p>
        <h4>Message key</h4>
        <p class="myMsgKey" on:click={() => copyThis(messageKey)}>{messageKey.substring(0, 10) + "..." + messageKey.substring(54, messageKey.length)}</p>
      
      </div>
    </div>



  </div>

    <div class="inner">
      <div class="nodestatus">
          <h3>Balance</h3>
          <div class="popup-card">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between">
            </div>
            <div style="margin-bottom: 10px">
                <h5 style="color: var(--warn-color); margin: 0 0 5px 5px;">Locked funds</h5>
                <p>{locked}</p>
            </div>
            <div style="margin-bottom: 10px">
                <h5 style="color: var(--alert-color); margin: 0 0 5px 5px;">Unlocked funds</h5>
                <p>{unlocked}</p>
            </div>
            <div style="margin-bottom: 10px">
                <h5 style="color: var(--success-color); margin: 0 0 5px 5px;">Total Funds</h5>
                <p>{total}</p>
            </div>
        </div>
      </div>
    </div>

    <div class="transactions">
      <Transactions/>
    </div>
  </div>
 <!-- End of dashboard window -->
</div>

</main>

<style lang="scss">

  main {
    margin: 0 85px;
    z-index: 3;
  }

  .popup-card {
    margin-top: 10px;
  }

  .status {
    display: flex;
    justify-content: space-between;
    width: 100%;
    border-bottom: 1px solid var(--border-color);
    padding: 15px 20px 15px 20px;
    box-sizing: border-box;
  }

  .dashboard {
    padding: 15px 20px;
    border-radius: 10px;
  }

  .user {
    display: grid;
    gap: 3rem;
    grid-template-columns: repeat(12, minmax(0, 1fr));
    margin-top: 10px;

    div {
      column-span: spam 6/ span 6;
    }

    h4 {
      opacity: 80%;
      font-family: "Montserrat";
      font-size: 12px;
      font-weight: bold;
      width: 250px;
    }
  }

  button {
    font-family: 'Roboto Mono', sans-serif;
    background: #181818;
    padding: 10px;
    color: var(--title-color);
    cursor: pointer;
    box-shadow: none;
    border-radius: 5px;
    margin: 10px;
    margin-left: -5px;
    border: 1px solid transparent;

    &:hover {
      outline: none;
      border: 1px solid var(--title-color);
    }
  }

  
  #profile .inner {
      padding: 3rem;
      border-radius: 0.4rem;
      height: 220px;
      transition: 0.25s ease-in-out all;
      height: 250px;
      overflow: hidden;
    }

    #profile {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
    }

    p {
      font-size: 15px;
    margin-top: 0px;
    }

    button {
          margin: 10px;
    margin-left: -5px;
    border: 1px solid transparent;
    }

    .transactions {
      width: 200%;
    }

</style>
