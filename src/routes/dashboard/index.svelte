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
    console.log("respone?", myBoards);

    boards.update(data => {
      return {
        ...data,
        boardsArray: myBoards
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

</script>

<main in:fade>

  <div class="status">
    <Balance />
    <div style="display: flex; align-items: center; justify-content: center; gap: 15px">
      <Globe
        yellow={$misc.nodeStatus === 'Syncing 📡'}
        red={$misc.nodeStatus === 'Not Synced' || $misc.nodeStatus === 'Disconnected 🚨' || $misc.nodeStatus === 'Dead node 🚨'}
        blink={$misc.nodeStatus !== 'Synced ✅'}
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

    <div class="user">
      <div>
        <h4>Payment address</h4>
        <p class="address" on:click={() => copyThis(address)}>{address.substring(0, 10) + "..." + address.substring(89, address.length)}</p>
        <h4>Message key</h4>
        <p class="myMsgKey" on:click={() => copyThis(messageKey)}>{messageKey.substring(0, 10) + "..." + address.substring(54, messageKey.length)}</p>
        <button on:click={() => copyThis(huginAddress)}> Copy Both</button>
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

  .status {
    display: flex;
    justify-content: space-between;
    width: 100%;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
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

    div {
      column-span: spam 6/ span 6;
    }

    h4 {
      opacity: 60%;
      letter-spacing: 5px;
    }
  }

  button {
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
</style>
