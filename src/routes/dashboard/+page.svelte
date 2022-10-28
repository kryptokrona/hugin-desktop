<script>
  import { fade } from "svelte/transition";
  import { user, userAvatar, misc, boards } from "$lib/stores/user.js";
  import { onMount } from "svelte";
  import { capitalizeFirstLetter } from "$lib/utils/utils";
  import Share from "/src/components/dashboard/Share.svelte";
  import Funds from "/src/components/dashboard/Funds.svelte";
  import EditName from "/src/components/dashboard/EditName.svelte";
  import Transactions from "/src/components/finance/Transactions.svelte";
  import CreateRoom from "/src/components/dashboard/CreateRoom.svelte";
  import { layoutState } from "$lib/stores/layout-state.js";
  import GreenButton from "$components/buttons/FillButton.svelte";
  import { openURL } from "$lib/utils/utils.js";

  let avatar;
  let myBoards = [];
  let date = new Date();
  let hrs = date.getHours();
  let greet;

  onMount(async () => {

    $layoutState.showFaucetButton = window.localStorage.getItem('faucet')

    console.log('FAUCET BTN', $layoutState.showFaucetButton);
    //Set boardsarray to store
    myBoards = await window.api.getMyBoards();
    let filterBoards = myBoards.filter(a => a !== "Home");
    console.log(filterBoards);
    filterBoards.unshift("Home");

    boards.update(data => {
      return {
        ...data,
        boardsArray: filterBoards
      };
    });

    misc.update(oldData => {
      return {
        ...oldData,
        loading: false
      };
    });

    if (hrs < 12)
      greet = "Good Morning";
    else if (hrs >= 12 && hrs <= 17)
      greet = "Good Afternoon";
    else if (hrs >= 17 && hrs <= 24)
      greet = "Good Evening";
  });

  $: {
    myBoards = $boards.boardsArray;
    avatar = $userAvatar;
  }

</script>

<main in:fade>
  <div class="dashboard">

    <div class="header">
      <div style="display: flex; align-items: center; gap: 0.5rem">
        <h1>{greet}, {$user.username}!</h1>
        <EditName />
      </div>
      <div class="button_wrapper">
        {#if $layoutState.showFaucetButton === null}
          <GreenButton text="Faucet" enabled={true} disabled={false}
                       on:click={() => openURL(`https:faucet.kryptokrona.org/?address=${$user.huginAddress.substring(0, 99)}`)} />
        {/if}
        <Share />
      </div>
    </div>


    <div class="content">
      <CreateRoom/>
      <Funds />
    </div>

  </div>
</main>

<style lang="scss">

  main {
    margin: 0 20px 0 95px;
    z-index: 3;
    height: 100vh;
  }

  .dashboard {
    padding: 15px 20px;
    border-radius: 10px;
  }

  .header {
    padding-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .button_wrapper {
    display: flex;
    gap: 1rem;
  }

  .content {
    display: flex;
    width: 100%;
  }

</style>
