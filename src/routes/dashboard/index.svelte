<script>
  import { fade } from "svelte/transition";
  import { user, userAvatar, misc, boards } from "$lib/stores/user.js";
  import { onMount } from "svelte";
  import { capitalizeFirstLetter } from "$lib/utils/utils";
  import Share from "/src/components/dashboard/Share.svelte";
  import Funds from "/src/components/dashboard/Funds.svelte";

  let avatar;
  let myBoards = [];
  let date = new Date();
  let hrs = date.getHours();
  let greet;

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

</script>

<main in:fade>
  <div class="dashboard">

    <div class="header">
      <h1>{greet}, {capitalizeFirstLetter($user.username)}!</h1>
      <Share />
    </div>

    <Funds/>

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


</style>
