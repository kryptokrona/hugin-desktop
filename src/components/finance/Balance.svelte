<script>
    import {onMount, onDestroy} from "svelte";
    import {fade} from "svelte/transition";
    import {user} from "$lib/stores/user.js";

    //Variables that holds the amounts
    let unlockedAmount
    let lockedAmount

    //Handle state of sync and clicks
    let showFunds = true
    let sync = false
    $: sync = $user.syncState

    //Get balance and then look every 15 seconds
    onMount( () => {
        getBalance()
        setInterval(getBalance, 1000*15)
    })

    //Get balance function
    async function getBalance() {
        let balance = await window.api.getBalance()
        unlockedAmount = (balance[0] / 100000).toFixed(3)
        lockedAmount = (balance[1] / 100000).toFixed(3)
    }

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
            <p in:fade>Syncing..</p>
        {/if}
        {#if (showFunds && sync)}
            <p in:fade>{unlockedAmount !== 0 ? `💰 ${unlockedAmount} XKR` : 'No unlocked funds 😭'}</p>
        {/if}
        {#if (!showFunds && sync)}
            <p in:fade>{lockedAmount = 0 ? `🔐 ${lockedAmount} XKR` : 'No locked funds 🥳'}</p>
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

</style>
