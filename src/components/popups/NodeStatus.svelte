<script>
    // Copyright (c) 2022, The Kryptokrona Developers
    import {user} from "$lib/stores/user.js";
    import {fade, fly} from "svelte/transition";
    import Close from "$components/buttons/Close.svelte";
    import Button from "$components/buttons/Button.svelte";
    import {goto} from "$app/navigation";

    let progress

    $: {
        progress = (($user.walletBlockCount / $user.localDaemonBlockCount) * 100)
        progress > 99.99 ? progress = 100 : progress
    }

</script>

<div in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" class="popup">
    <div in:fly="{{y: 50}}" out:fly="{{y: -50}}" class="popup-card">
        <div style="margin-bottom: 10px; display: flex; justify-content: space-between">
            <h3 style="color: var(--title-color)">Vault Status</h3>
            <Close on:click/>
        </div>
        <div>
            <h5 style="margin: 0 0 5px 5px;">Node</h5>
            <input disabled type="text" placeholder="Nickname" bind:value={$user.node}>
        </div>
        <div>
            <h5 style="margin: 0 0 5px 5px;">Status</h5>
            <input disabled type="text" placeholder="Node Status" bind:value={$user.nodeStatus}>
        </div>
        <div>
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0 5px">
                <h5 style="margin: 0">Sync</h5>
                <p style="margin: 0">{progress = 100 ? progress.toFixed() : progress.toFixed(2)}%</p>
            </div>
            <div class="goal">
                <div class="progress"
                     style="background-color: var(--success-color); width: {progress}%; height: 22px; border-radius: 3px;">
                </div>
            </div>
        </div>
        <Button disabled={false} on:click={() => {goto('/settings')}} text="Settings"/>
    </div>
</div>

<style lang="scss">
  .popup {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: rgba(18, 18, 18, 0.80);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 103;

    .popup-card {
        display: flex;
        box-sizing: border-box;
        flex-direction: column;
        justify-content: space-between;
        height: 360px;
        width: 320px;
        padding: 30px;
        background-color: #202020;
        border-radius: 8px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255,255,255, 0.1);
    }
  }

  .goal {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    height: 30px;
    padding: 0 3px;
    background-color: var(--input-background);
    border: 1px solid var(--input-border);
    border-radius: 0.4rem;
    margin: 5px 0;
  }

  input {
      box-sizing: border-box;
      background-color: var(--input-background);
      border: 1px solid var(--input-border);
      padding: 10px;
      border-radius: 5px;
      color: var(--title-color);
      transition: 200ms ease-in-out;
      width: 100%;

      &::placeholder, ::-ms-input-placeholder, ::-webkit-input-placeholder {
          color: var(--input-placeholder);
          font-family: "Roboto Mono", monospace;
      }

      &:focus {
          outline: none;
          border: 1px solid var(--primary-color);
      }
  }
</style>