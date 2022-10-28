<script>
  import { fade, fly } from "svelte/transition";
  import { appUpdateState } from "$lib/stores/updater-state.js";
  import FillButton from "$components/buttons/FillButton.svelte";
  import { formatBytes } from "$lib/utils/utils";
</script>

<div class="backdrop" in:fade="{{duration: 100}}" out:fade="{{duration: 100}}">
  <div class="card layered-shadow" in:fly="{{y: 20}}" out:fly="{{y: -50}}">
    <div class="header">
      <img src="/icon.png" height="48px" width="48px" alt="">
      <h2>Hugin updater</h2>
    </div>

    {#if ($appUpdateState.step === 1)}

      <div class="content">
        <h4>There's a new update available! Get it now to stay up to date with new features and improvements.</h4>
        <div class="buttons">
          <FillButton text="Download" enabled={true} on:click={() => window.api.send('download-update')} />
          <FillButton text="Later" on:click={() => $appUpdateState.updateAvailable = false} />
        </div>
      </div>

    {:else if ($appUpdateState.step === 2)}

      <div class="content">
        <div></div>
        <div>
          <div class="goal">
            <div class="progress" style="width: {$appUpdateState.percentageDownloaded}%"></div>
          </div>
          <h5>Downloaded: {formatBytes(parseInt($appUpdateState.dataDownloaded))} of {formatBytes(parseInt($appUpdateState.downloadSize))}</h5>
          <h5>{formatBytes(parseInt($appUpdateState.downloadSpeed))}/s</h5>
        </div>
        <div></div>
      </div>

    {:else if ($appUpdateState.step === 3)}

      <div class="content">
        <h4>Your update is ready, please press install to restart.</h4>
        <div class="buttons">
          <FillButton text="install" enabled={true} on:click={() => window.api.send('install-update')} />
        </div>
      </div>

    {/if}

  </div>
</div>

<style lang="scss">

  .card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    justify-content: space-between;
    gap: 0.5rem;
    border-radius: 8px;
    width: 361px;
    height: 240px;
    padding: 2rem;
    background-color: var(--card-background);
    border: 1px solid var(--border-color)
  }

  .header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .content {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;
    height: 100%;

    p {
      margin-bottom: 1rem;
    }
  }

  .buttons {
    display: inline-flex;
    gap: 1rem;
    width: 100%;
  }

  .goal {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: 10px;
    border-radius: 10px;
    margin-bottom: 1rem;
    background-color: var(--border-color);
    width: 100%;
    padding: 1px;

    .progress {
      animation: load 500ms normal forwards;
      box-shadow: 0 10px 40px -10px #ffffff;
      background-color: var(--info-color);
      height: 8px;
      border-radius: 10em;
      width: 8%;
      transition: all 3s;
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