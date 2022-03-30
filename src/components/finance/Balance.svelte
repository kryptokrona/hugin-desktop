<script>
    import {onMount, onDestroy} from "svelte";
    let unlockedAmount
    let lockedAmount

    onMount( async () => {
        getBalance()
        setInterval(getBalance, 1000*15)
    })

    async function getBalance() {
        let balance = await window.api.getBalance()
        unlockedAmount = balance[0] / 100000
        lockedAmount = balance[1] / 100000
        return await balance
    }

    onDestroy(() => {
        clearInterval()
    })

</script>

<div class="wrapper">
    <p>Funds</p>
    <p>{unlockedAmount ? `${unlockedAmount} XKR` : 'No unlocked funds'}</p>
    <p>Locked funds</p>
    <p>{lockedAmount ? `${lockedAmount} XKR` : 'No locked funds'}</p>
    {#if !unlockedAmount}
        <button>Faucet</button>
    {/if}
</div>

<style>

    .wrapper {
        background-color: rgba(255, 255, 255, 0.15);
        padding: 10px 20px;
        width: 200px;
        border-radius: 5px;
    }

    p {
        color: white;
        margin: 0;
    }

</style>