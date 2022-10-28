<script>
  //To handle true and false, or in this case show and hide.
  import { fade, fly } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import { get_avatar } from "$lib/utils/hugin-utils.js";
  import { transactions } from "$lib/stores/user.js";
  import GreenButton from "$components/buttons/FillButton.svelte";

  const dispatch = createEventDispatcher();

  let enableButton = false;
  let addr = $transactions.send.to;
  let amount;
  let paymentId = "";
  let avatar = get_avatar($transactions.send.to);

  $: {
    if (amount > 0) {
      enableButton = true;

    }
  }

  const keyDown = (e) => {
    if (e.key === "Enter" && amount.length > 0) {
      sendTransaction();
    } else if (e.key === "Escape") {
      close();
    }
  };

  const close = () => {
    $transactions.tip = false;
    amount = 0;
  };

  // Dispatch the inputted data
  const sendTransaction = () => {
    dispatch("send", {
      to: addr,
      amount: parseInt(amount) * 100000,
      paymentId: undefined
    });
  };

</script>

<svelte:window on:keyup|preventDefault={keyDown} />

<div on:click|self={close} in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" class="backdrop">
  <div in:fly="{{y: 20}}" out:fly="{{y: -50}}" class="field">
    <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
    <input placeholder="Enter amount" type="text" spellcheck="false" autocomplete="false" bind:value={amount}
           oninput="this.value = this.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');">
    <GreenButton on:click={sendTransaction} enabled={amount > 0} disabled={!enableButton} text="Send" />
  </div>
</div>

<style lang="scss">

  .field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    padding: 0 10px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;

    .btn {
      color: var(--text-color);
      height: 100%;
      border-left: 1px solid var(--card-border);
      cursor: pointer;

      &:hover {
        background-color: var(--card-border);;
      }
    }
  }

  input {
    margin: 0 auto;
    width: 300px;
    height: 50px;
    transition: 200ms ease-in-out;
    color: var(--text-color);
    background-color: transparent;
    border: none;
    font-size: 1.1rem;

    &:focus {
      outline: none;
    }
  }

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
    backdrop-filter: blur(8px);
    z-index: 103;
    border-radius: 15px;
  }
</style>