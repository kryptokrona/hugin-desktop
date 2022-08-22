<script>
    import {onMount, onDestroy} from "svelte";
    import {fade} from "svelte/transition";
    import {user, misc} from "$lib/stores/user.js";

    //Variables that holds the amounts
    let unlockedAmount
    let lockedAmount

    //Handle state of sync and clicks
    let showFunds = true
    let sync = false
    let interval
    $: sync = $misc.syncState

    //Get balance and then look every 15 seconds
    onMount( () => {
        getBalance()
        interval = setInterval(getBalance, 1000*15)
    })

    onDestroy( () => {
        clearInterval(interval)
    })

    //Get balance function
    async function getBalance() {
        let balance = await window.api.getBalance()
        misc.update(current => {
            return {
                ...current,
                balance: balance
            }
        })
    }

    $: {
        unlockedAmount = ($misc.balance[0] / 100000).toFixed(3)
        lockedAmount = ($misc.balance[1] / 100000).toFixed(3)
    }

    $: console.log($misc.balance);

    //If click we show opposite (locked/unlocked)
    const handleClick = () => {
        showFunds = !showFunds
    }

    //Auto "click" every X seconds
    setInterval(handleClick,6000)

</script>

<div class="wrapper" on:click={handleClick}>
    <div>
        {#if (!sync)}
            <p class="funds" in:fade>Syncing..</p>
        {/if}
        {#if (showFunds && sync)}
            <p class="funds" in:fade>{unlockedAmount !== 0 ? `💰 ${unlockedAmount}` : 'No unlocked funds 😭'}</p>
        {/if}
        {#if (!showFunds && sync)}
            <p class="locked" in:fade>{lockedAmount = 0 ? `🔐 ${lockedAmount} XKR` : 'No locked funds 🥳'}</p>
        {/if}
    </div>
</div>

<style>

    .wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        cursor: pointer;
    }

    p, h2 {
        color: rgba(255, 255, 255, 0.5);
        margin: 0;
    }

    img {
        height: 24px;
        opacity: 80%;
        margin-right: 10px;
    }

    .funds {
      font-family: "Major Mono Display";
      font-size: 16px;

    }


    .funds {
      font-family: "Roboto Mono";
      font-size: 16px;

    }

</style>
