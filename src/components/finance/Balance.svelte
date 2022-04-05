<script>
    import {onMount, onDestroy} from "svelte";
    import {fade} from "svelte/transition";
    let unlockedAmount
    let lockedAmount
    let showFunds = true

    onMount( () => {
        getBalance()
        setInterval(getBalance, 1000*15)
    })

    //Get bala
    async function getBalance() {
        let balance = await window.api.getBalance()
        unlockedAmount = (balance[0] / 100000).toFixed(3)
        lockedAmount = (balance[1] / 100000).toFixed(3)
        return await balance
    }

    const handleClick = () => {
        showFunds = !showFunds
    }

    setInterval(handleClick,6000)

    onDestroy(() => {
        clearInterval()
    })

</script>

<div class="wrapper" on:click={handleClick}>
    <div>
        {#if (showFunds)}
            <p in:fade>{unlockedAmount !== 0 ? `💰 ${unlockedAmount} XKR` : 'No unlocked funds 😭'}</p>
        {/if}
        {#if (!showFunds)}
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