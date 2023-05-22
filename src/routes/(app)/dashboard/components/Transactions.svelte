<script>
  import {user} from '$lib/stores/user.js'
  import {onMount} from 'svelte'
  import Forward from '$lib/components/icons/Forward.svelte'
  import Backward from '$lib/components/icons/Backward.svelte'

  let pageNum = 0
  let pages
  let txList = []
  onMount(() => {
    getTransactions(pageNum)
  })

  async function getTransactions() {
    let startIndex = pageNum * 10

    if (pageNum === 0) {
      startIndex = 0
    }

    let transactions = await window.api.getTransactions(startIndex)
    $user.transactions = transactions.pageTx
    pages = transactions.pages
    txList = $user.transactions
    console.log(transactions)
  }

  $: pageNum
  $: txList
  $: page = pageNum + 1
</script>

<div class="relative overflow-hidden pt-12">
  <div class="absolute top-0 w-full flex items-center border-y border-neutral-800 h-12 px-4 gap-4">
    <h3 class="text-lg">Transactions</h3>
    <div class="flex gap-2 items-center">
      <p>{page}/{pages}</p>
      <div>
        {#if pageNum > 0}
          <Backward on:click="{() => getTransactions(pageNum--)}"/>
        {/if}
        {#if pages >= page + 1}
          <Forward on:click="{() => getTransactions(pageNum++)}"/>
        {/if}
      </div>
    </div>
  </div>
  {#if $user.transactions.length > 0}
    <div class="w-full h-full overflow-scroll no-scrollbar">
      <div class="h-full list divide-y divide-neutral-800">
        {#each txList as tx}
          <div class="flex justify-between items-center h-12 px-4">
            <p style="opacity: 80%;">
              {tx.hash.substring(0, 5) + '…' + tx.hash.substring(59, tx.hash.length)}
            </p>
            <p
              class="tx"
              class:sent="{tx.amount.substring(0, 1) != '-'}"
            >
              {tx.amount}
            </p>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <div class="flex w-full h-full items-center justify-center">
      <h3>No transactions</h3>
    </div>
  {/if}
</div>

<style lang="scss">
  .wrapper {
    height: calc(60% - 70px);

    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 2rem;
      height: 50px;
    }

    .transactions {
      height: 100%;
      width: 100%;
      overflow: scroll;
      box-sizing: border-box;
      --scrollbarBG: transparent;
      --thumbBG: #3337;
      scrollbar-width: thin;
      scrollbar-color: var(--thumbBG) var(--scrollbarBG);
    }

    .transactions::-webkit-scrollbar {
      width: 8px;
    }

    .transactions::-webkit-scrollbar-track {
      background: var(--scrollbarBG);
    }

    .transactions::-webkit-scrollbar-thumb {
      background-color: var(--thumbBG);
      border-radius: 3px;
      border: 3px solid var(--scrollbarBG);
    }

    .row {
      display: flex;
      box-sizing: border-box;
      justify-content: space-between;
      width: 100%;
      height: 50px;
      padding: 0 2rem;
      border-bottom: 1px solid var(--border-color);

      &:hover {
        background-color: var(--border-color);
        cursor: pointer;
      }

      &:active {
        color: #121212;
      }
    }
  }

  .sent {
    color: var(--success-color) !important;
  }

  .tx {
    color: var(--warn-color);
    display: flex;
  }
</style>
