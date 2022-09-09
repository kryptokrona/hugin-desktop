<script>
  import { fade } from "svelte/transition";
  import { user, userAvatar, misc, boards } from "$lib/stores/user.js";
  import { onMount } from "svelte";
  import { capitalizeFirstLetter } from "$lib/utils/utils";
  import { prettyNumbers } from "$lib/utils/utils.js";
  import Share from "/src/components/dashboard/Share.svelte";

  let avatar;
  let myBoards = [];
  let date = new Date();
  let hrs = date.getHours();
  let greet;
  let dc;

  onMount(async () => {

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

  let locked;
  let unlocked;
  let total;

  $: {
    locked = prettyNumbers($misc.balance[1]);
    unlocked = prettyNumbers($misc.balance[0]);
    total = prettyNumbers($misc.balance[0] + $misc.balance[1]);
  }

</script>

<main in:fade>
  <div class="dashboard">

    <div class="header">
      <h1>{greet}, {capitalizeFirstLetter($user.username)}!</h1>
      <Share />
    </div>

    <div class="cards">
      <div class="card">
        <h4>Balance</h4>
        <p>{unlocked}</p>
        <div></div>
      </div>
      <div class="card">
        <h4>Locked</h4>
        <p>{locked}</p>
        <div></div>
      </div>
      <div class="card">
        <h4>Node status</h4>
        <p>{$misc.syncState}</p>
        <div></div>
      </div>
    </div>

  </div>
</main>

<style lang="scss">

  main {
    margin: 0 85px;
    z-index: 3;
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

  .cards {
    margin-top: 3rem;
    display: grid;
    grid-gap: 1rem;
    grid-template-columns: repeat(12, minmax(0, 1fr));

    .card {
      padding: 1rem;
      background-color: var(--card-background);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      grid-column: span 4 / span 4;

      p {
        margin: 0;
      }
    }
  }

</style>
