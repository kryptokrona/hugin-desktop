<script>
import { fade, fly } from 'svelte/transition'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import { formatBytes } from '$lib/utils/utils.js'
import {misc} from "$lib/stores/user.js";
import {appUpdateState} from "$lib/components/updater/update-store.js";

const download = () => {

    if ($misc.os === "darwin" && $misc.version === "0.2.3") {
        let link
        if ($misc.arch === "arm64" ) {
            link = "https://github.com/kryptokrona/hugin-desktop/releases/download/v0.3.0/Hugin-Messenger-0.3.0-arm64.dmg"
        }
        if ($misc.arch === "x64") {
            link = "https://github.com/kryptokrona/hugin-desktop/releases/download/v0.3.0/Hugin-Messenger-0.3.0.dmg"
        }
        if (!link) {
            link = "https://github.com/kryptokrona/hugin-desktop/releases/"
        }
        window.api.openLink(link)
        return
    }

    window.api.send('download-update')
}

</script>

<div class="backdrop" in:fade="{{ duration: 100 }}" out:fade="{{ duration: 100 }}">
    <div class="card layered-shadow" in:fly="{{ x: 100 }}" out:fly="{{ x: 100 }}">

        <div class="header">
            <img src="/icon.png" height="48px" width="48px" alt="" />
            <h2>Hugin updater</h2>
        </div>

        {#if $appUpdateState.step === 1}

            <div class="content">
                <div></div>
                <h4>
                    There's a new update available! Get it now to stay up to date with new features
                    and improvements
                </h4>
                <div class="buttons">
                    <FillButton text="Download" on:click|once="{download}"/>
                    <FillButton text="Later" on:click="{() => ($appUpdateState.openPopup = false)}"/>
                </div>
            </div>

        {:else if $appUpdateState.step === 2}

            <div class="content">
                <div></div>
                <div>
                    <h4 style="margin-bottom: 1rem">You can close this window, it will popup again when downloaded.</h4>
                    <div style="max-width: 140px; margin: 0 auto">
                        <FillButton text="Close" on:click={() => {$appUpdateState.openPopup = false}}/>
                    </div>
                </div>
                <div>
                    <div class="goal">
                        <h4>
                            {$appUpdateState.percentageDownloaded === 100 ? $appUpdateState.percentageDownloaded.toFixed(0) : $appUpdateState.percentageDownloaded.toFixed()}%
                        </h4>
                        <div
                                class="progress"
                                class:stripes="{$appUpdateState.percentageDownloaded !== 100}"
                                class:synced="{$appUpdateState.percentageDownloaded === 100}"
                                style="width: {$appUpdateState.percentageDownloaded}%;"
                        ></div>
                    </div>
                    <h5>{formatBytes(parseInt($appUpdateState.dataDownloaded))} of {formatBytes(parseInt($appUpdateState.downloadSize))}</h5>
                    <h5>{formatBytes(parseInt($appUpdateState.downloadSpeed))}/s</h5>
                </div>
            </div>

        {:else if $appUpdateState.step === 3}

            <div class="content">
                <div></div>
                <h4>Your update is ready, please press install to restart.</h4>
                <div class="buttons">
                    <FillButton
                        text="Install"
                        enabled="{true}"
                        on:click="{() => window.api.send('install-update')}"
                    />
                </div>
            </div>

            {:else if $appUpdateState.step === 4}

            <div class="content">
                <div></div>
                <div>
                    <h4>You're on the latest version.</h4>
                    <p>v{$misc.version}</p>
                </div>
                <div class="buttons">
                    <FillButton text="Close" on:click="{() => {$appUpdateState.openPopup = false; $appUpdateState.step = 1;}}"/>
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
    width: 361px;
    height: 100%;
    padding: 2rem;
    background-color: var(--card-background);
    border-left: 1px solid var(--border-color);
}

.close {
  position: absolute;
  top: 1rem;
  right: 1rem;
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
  justify-content: center;
  width: 100%;
  height: 40px;
  background-color: var(--input-background);
  border: 1px solid var(--input-border);
  border-radius: 0.4rem;
  margin: 5px 0;

  h4 {
    color: white;
    position: absolute;
    align-self: center;
    z-index: 9999;
  }
}

.progress {
  background-color: var(--border-color);
  height: 40px;
  margin-right: auto;
  border-radius: 0.4rem;
  transition: 200ms ease-in-out;
}

.backdrop {
    position: fixed;
    display: flex;
    justify-content: end;

    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--backdrop-color);
    backdrop-filter: blur(4px);
    z-index: 103;
    border-radius: 15px;
}
</style>
