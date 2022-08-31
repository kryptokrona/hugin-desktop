<script>
import { user } from "$lib/stores/user";
import {fade} from "svelte/transition";
import {onMount} from "svelte";
import Forward from "/src/components/buttons/Forward.svelte";
import Backward from "/src/components/buttons/Backward.svelte";

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

    let transactions = await window.api.getTransactions(startIndex);
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
    <h3>Transactions</h3>
  
    <div>
        {#if (pageNum > 0)}
            <Backward on:click={() => getTransactions(pageNum--)}/>
        {/if}
        {#if (pages >= page + 1)}
            <Forward on:click={() => getTransactions(pageNum++)}/>
        {/if}
      
    </div>
    
    <p>{page}/{pages}</p>
</div>
{#if $user.transactions.length > 0}
    <div class="transactions">
        {#each txList as tx}
            <div class="tx">
                <p>{tx.hash.substring(0, 8) + "..." + tx.hash.substring(56, tx.hash.length)}</p>
                <p class="tx" class:sent={tx.amount.substring(0,1) != "-"}>{tx.amount}</p>
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
height: 75.5%;

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  height: 50px;
  padding: 0 30px;

  p {
    margin: 0;
  }
}

.transactions {
    height: 100%;
    width: 100%;
    overflow: scroll;
    box-sizing: border-box;
    --scrollbarBG: transparent;
    --thumbBG: #3337;
    overflow: auto;
    scrollbar-width: thin;
     scrollbar-color: var(--thumbBG) var(--scrollbarBG);
     height: 300px;
}

 .transactions::-webkit-scrollbar {
  width: 8px;
}
.transactions::-webkit-scrollbar-track {
  background: var(--scrollbarBG);
}
.transactions::-webkit-scrollbar-thumb {
  background-color: var(--thumbBG) ;
  border-radius: 3px;
  border: 3px solid var(--scrollbarBG);
}

.tx {
  display: flex;
  box-sizing: border-box;
  justify-content: end;
  padding: 0 30px;
  width: 100%;

  &:hover {
    background-color: var(--border-color);
    cursor: pointer;
  }

  &:active {
    background-color: var(--primary-color);
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
  color: green !important;
}

.tx {
  color: red;
  display: flex;
}
</style>