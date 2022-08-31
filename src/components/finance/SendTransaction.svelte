<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {createEventDispatcher, onMount} from "svelte";
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import { transactions } from "$lib/stores/user.js";
    const dispatch = createEventDispatcher()

    let enableButton = false
    let addr = $transactions.send.to
    let amount
    let paymentId = ""
    let avatar = get_avatar($transactions.send.to)

    $: {
        if (amount > 0) {
            enableButton = true
            
        }
    }

    // Dispatch the inputted data
    const sendTransaction = () => {
        dispatch('send', {
            to: addr,
            amount: parseInt(amount),
            paymentId: undefined
        })
    }

</script>

<div in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" class="backdrop" on:click|self>
    <div in:fly="{{y: 50}}" out:fly="{{y: -50}}" class="card">
            <h4>Send to</h4>
            <div class="nickname-wrapper">
                <img in:fade class="avatar" src="data:image/png;base64,{avatar}" alt="">
                <p>{$transactions.send.name}</p>
            </div>
            <h4>Amount</h4>
            <input placeholder="1" type="text" bind:value={amount}>
            <h4>Payment ID</h4>
            <input disabled="true" class="key" type="text" bind:value={paymentId}>
        <button disabled={!enableButton} class:rgb={enableButton} on:click={sendTransaction}>Send</button>
    </div>
</div>

<style lang="scss">

    .backdrop {
      position: fixed;
      display: flex;
      justify-content: center;
      align-items: center;
      top: 0;
      bottom: 0;
      left: 0;
      width: 100%;
      background-color: var(--backdrop-color);
      z-index: 103;
    }

    .card {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        height: 360px;
        width: 320px;
        padding: 30px;
        background-color: var(--backgound-color);
        border-radius: 8px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-color);
    }

    .nickname-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;

        img {
            margin-bottom: 9px;
            width: 50px;
            height: 50px;
        }
    }

    input {
        background-color: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding-left: 8px;
        height: 35px;
        width: 100%;
        margin-top: 10px;
        margin-bottom: 20px;
        color: white;
        transition: 250ms ease-in-out;

      &:focus {
        outline: none;
        border-color: rgba(255, 255, 255, 0.6);
      }
    }

    .key {
        background-color: rgba(255, 255, 255, 0.2);
    }

    button {
        border: none;
        border-radius: 8px;
        width: 100%;
        height: 36px;
        transition: 250ms ease-in-out;
        background-color: rgb(225, 18, 80);
        color: white;
        cursor: pointer;

      &:hover {
        opacity: 80%;
      }
    }
</style>
