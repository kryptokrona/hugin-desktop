<script>
    import { run } from 'svelte/legacy';

    import {user} from '$lib/stores/user.js'
    import {fade} from 'svelte/transition'
    import {onMount} from 'svelte'
    import Forward from '$lib/components/icons/Forward.svelte'
    import Backward from '$lib/components/icons/Backward.svelte'
    import Time from 'svelte-time'
    import { t } from '$lib/utils/translation.js'

    let pageNum = $state(0)
    let pages = $state()
    let txList = $state([])
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

    run(() => {
        pageNum
    });
    run(() => {
        txList
    });
    let page = $derived(pageNum + 1)
</script>

<div in:fade|global class="wrapper">
    <div class="header">
        <h3 style="font-weight: 800">{t('transactions') || 'Transactions'}</h3>

        <div style="display: flex; align-items: center; gap: 1rem">
            <p>{page}/{pages}</p>
            <div>
                <span style="{pageNum === 0 ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <Backward on:click="{() => getTransactions(pageNum - 1)}"/>
                </span>
                <span style="{pages < page + 1 ? 'opacity: 0.5; pointer-events: none;' : ''}">
                    <Forward on:click="{() => getTransactions(pageNum + 1)}"/>
                </span>
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
            <h3>{t('noTransactions') || 'No transactions'}</h3>
        </div>
    {/if}
</div>

<style lang="scss">
  .wrapper {
    grid-column: span 6 / span 6;
    height: 100%; /* Changed to fill container */
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 2rem;
      height: 50px;
      flex-shrink: 0;
    }

    .transactions {
      flex: 1; /* Fill remaining space */
      width: 100%;
      overflow-y: auto; /* Scroll internally */
      box-sizing: border-box;
      --scrollbarBG: transparent;
      --thumbBG: #3337;
      scrollbar-width: thin;
      scrollbar-color: var(--thumbBG) var(--scrollbarBG);
      padding-bottom: 10px;
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
    flex: 1; /* Fill remaining space */
    height: 100%;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .sent {
    color: var(--text-color) !important;
  }

  .tx {
    color: var(--warn-color);
    display: flex;
  }
</style>
