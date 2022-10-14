<script>
  import Pen from "/src/components/buttons/Pen.svelte";
  import { user } from "$lib/stores/user.js";
  import { fade, fly } from "svelte/transition";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";

  let open;
  let username;

  const keyDown = (e) => {
    if (e.key === "Enter" && username.length > 0) {
      save();
    } else if (e.key === "Escape") {
      close()
    }
  };

  const save = () => {
    if (username) {
      window.localStorage.setItem("userName", username);
      $user.username = username;
      close();
    }
  };

  const close = () => {
    open = false;
    username = "";
  };

  $user.username = window.localStorage.getItem("userName");

</script>

<svelte:window on:keyup|preventDefault={keyDown} />
<div style="display: flex; align-items: center">
  <Pen on:click={() => open = true} />
</div>
{#if open}
  <div on:click|self={close} in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" class="backdrop">
    <div in:fly="{{y: 20}}" out:fly="{{y: -50}}" class="field">
      <input placeholder="Enter nickname" type="text" spellcheck="false" autocomplete="false" bind:value={username}>
      <GreenButton on:click={save} enabled={username} disabled={false} text="Change" />
    </div>
  </div>
{/if}


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
    z-index: 103;
    border-radius: 15px;
  }
</style>