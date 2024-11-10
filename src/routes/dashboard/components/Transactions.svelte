<script>
    import {user} from '$lib/stores/user.js'
    import {fade} from 'svelte/transition'
    import {onMount} from 'svelte'
    import Forward from '$lib/components/icons/Forward.svelte'
    import Backward from '$lib/components/icons/Backward.svelte'
    import Time from 'svelte-time'

    let pageNum = 0
    let pages
    let txList = []
    onMount(() => {
        getTransactions(pageNum)
    })

    async function getTransactions(num) {
      let startIndex = num * 10;
      pageNum = num
      if (num === 0) startIndex = num;

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

<div in:fade class="wrapper">
    <div class="header">
        <h3 style="font-weight: 800">Transactions</h3>

        <div style="display: flex; align-items: center; gap: 1rem">
            <p>{page}/{pages}</p>
            <div>
                {#if pageNum > 0}
                    <Backward on:click="{() => getTransactions(pageNum - 1)}"/>
                {/if}
                {#if pages >= page + 1}
                    <Forward on:click="{() => getTransactions(pageNum + 1)}"/>
                {/if}
            </div>
        </div>
    </div>
    {#if $user.transactions.length > 0}
        <div class="transactions">
            {#each txList as tx}
                <div class="row">
                    <p style="opacity: 80%;">
                        <Time live={30 * 1_000} format={"D MMM, HH:mm"} timestamp="{parseInt(tx.time * 1000)}" />
                    </p>
                    <p
                            class="tx"
                            style="background: none"
                            class:sent="{tx.amount.substring(0, 1) != '-'}"
                    >
                        {tx.amount}
                    </p>
                </div>
            {/each}
        </div>
    {:else}
        <div class="notx">
            <h3>No transactions</h3>
        </div>
    {/if}
</div>

<style lang="scss">
  .wrapper {
    grid-column: span 6 / span 6;
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

  .notx {
    display: flex;
    height: 80vh;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .sent {
    color: var(--success-color) !important;
  }

  .tx {
    color: var(--warn-color);
    display: flex;
  }
</style>
