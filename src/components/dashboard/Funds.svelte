<script>
  import { misc } from "$lib/stores/user.js";
  import { prettyNumbers } from "$lib/utils/utils.js";
  import { onDestroy, onMount } from "svelte";

  let locked;
  let unlocked;
  let total;

  $: {
    unlocked = prettyNumbers($misc.balance[0]);
    locked = prettyNumbers($misc.balance[1]);
    total = prettyNumbers($misc.balance[0] + $misc.balance[1]);
    console.log($misc.balance[0], $misc.balance[1]);
  }

  //Get balance and then look every 15 seconds
  let interval;
  onMount(() => {
    getBalance();
    interval = setInterval(getBalance, 1000 * 15);
  });

  onDestroy(() => {
    clearInterval(interval);
  });

  //Get balance function
  async function getBalance() {
    let balance = await window.api.getBalance();
    misc.update(current => {
      return {
        ...current,
        balance: balance
      };
    });
  }
</script>

<div class="cards">
  <div class="card">
    <h4>Balance</h4>
    <p>{unlocked}</p>
  </div>
  <div class="card">
    <h4>Locked</h4>
    <p>{locked}</p>
  </div>
  <div class="card">
    <h4>Funds ratio</h4>
    <div class="ratio">
      <div class="unlocked" style="width: {($misc.balance[0] / ($misc.balance[1] + $misc.balance[0])) * 100}%"></div>
      <div class="locked" style="width: {($misc.balance[1] / ($misc.balance[0] + $misc.balance[1])) * 100}%"></div>
    </div>
  </div>
  <div class="card">
    <h4>Node status</h4>
    <p>{$misc.syncState}</p>
  </div>
</div>

<style lang="scss">

  .cards {
    margin-top: 3rem;
    display: grid;
    grid-gap: 1rem;
    grid-template-columns: repeat(12, minmax(0, 1fr));

    .card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background-color: var(--card-background);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      grid-column: span 3 / span 3;

      p {
        margin: 0;
      }
    }
  }

  .ratio {
    display: flex;
    border-radius: 10px;
    overflow: hidden;

    .locked {
      background-color: #f25f61;
      height: 20px;
    }

    .unlocked {
      background-color: #5ff281;
      height: 20px;
    }
  }

</style>