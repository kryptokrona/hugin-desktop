<script>
  //To handle true and false, or in this case show and hide.
  import { fade, fly } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import { get_avatar } from "$lib/utils/hugin-utils.js";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";

  const dispatch = createEventDispatcher();

  let enableButton = false;
  let nickname = "";
  let addr;
  let pubkey;
  let text = "";
  let myAddress;
  let avatar;
  let step = 1;

  $: {
    if (text.length > 98) {
      // spilt input to addr and pubkey
      addr = text.substring(0, 99);
      pubkey = text.substring(99, 163);
      text = addr;

      avatar = get_avatar(addr);

    }
  }

  // Dispatch the inputted data
  const handleAdd = () => {
    dispatch("addChat", {
      name: nickname,
      chat: addr,
      key: pubkey,
      msg: "New friend added!",
      sent: true,
      timestamp: Date.now().toString()
    });
    close();
  };

  const close = () => {
    open = false;
    text = "";
    nickname = "";
    step = 1;
  };

  $: {
    //Handle state of the button, disabled by default, when enabled RGB class will be added.
    enableButton = !!(addr && pubkey);

    ///Empty fields if input is empty
    if (!text) {
      addr = "";
      pubkey = "";
    }
  }

  const next = () => {
    step = 2;
  };

  $: step;

</script>

<div on:click|self in:fade="{{duration: 70}}" out:fade="{{duration: 100}}" class="backdrop">


  <div in:fly="{{y: 20}}" out:fade class="field">
    {#if step === 1}
      {#if (pubkey)}
        <img in:fade class="avatar" src="data:image/png;base64,{avatar}" alt="">
      {/if}
      <input placeholder="Enter Hugin address" type="text" spellcheck="false" autocomplete="false" bind:value={text}>
      <div style="width: 100px">
        <GreenButton disabled={!enableButton} enabled={enableButton && step == 1} on:click={next} text="Next" />
      </div>
    {/if}
  </div>

  {#if pubkey && step === 2 }

    <div in:fade class="field">
      {#if (pubkey)}
        <img in:fade class="avatar" src="data:image/png;base64,{avatar}" alt="">
      {/if}
      <input placeholder="Enter a nickname" type="text" spellcheck="false" autocomplete="false" bind:value={nickname}>
      <div style="width: 100px">
        <GreenButton disabled={!enableButton} enabled={step == 2 && nickname.length} on:click={handleAdd} text="Add" />
      </div>
    </div>
  {/if}
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
    font-size: 0.9rem;

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

  .hide {
    dislay: none;
  }
</style>
