<script>
  import { misc, user } from "$lib/stores/user.js";
  import { prettyNumbers } from "$lib/utils/utils.js";
  import { onDestroy, onMount } from "svelte";
  import { layoutState } from "$lib/stores/layout-state.js";

  let showFaucet
  let interval;
  onMount(async () => {
    await getBalance();

    interval = setInterval(getBalance, 1000 * 15);
  });

  onDestroy(() => {
    clearInterval(interval);
  });

  //Get balance function
  async function getBalance() {
    $misc.balance = await window.api.getBalance()

    if ($misc.balance[0] > 0) {
      window.localStorage.setItem('faucet', 'false')
      $layoutState.showFaucetButton = false
    }
  }

</script>

<div class="cards">
  <div class="card">
    <h4>Balance</h4>
    <p>{prettyNumbers($misc.balance[0])}</p>
  </div>
  <div class="card">
    <h4>Locked</h4>
    <p>{prettyNumbers($misc.balance[1])}</p>
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
    width: 100%;
    grid-template-columns: repeat(12, minmax(0, 1fr));

    .card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      padding: 1rem;
      background-color: var(--card-background);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      grid-column: span 6 / span 6;

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