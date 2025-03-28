<script>
import { fade } from 'svelte/transition'
import { webRTC, swarm } from '$lib/stores/user.js'
import { mediaSettings, videoSettings } from '$lib/stores/mediasettings'
    /** @type {{conference?: boolean}} */
    let { conference = false } = $props();
let open = $state()
let changed = $state()
let add = false
let videoDevices = $mediaSettings.devices.filter((a) => a.kind == 'videoinput')


function pickSource(src) {
    let add = false
    if ($mediaSettings.cameraId === src.deviceId && !$videoSettings.screenshare) return
    if (!$videoSettings.myVideo && conference) add = true
    
    $videoSettings.loading = true
    window.api.changeSource(src.deviceId, conference, add)
    if ($videoSettings.screenshare) {
        $videoSettings.screenshare = false
    }
    buttonGlow()
}

const buttonGlow = () => {
    changed = true
    let timer = setTimeout(function () {
        changed = false
        open = false
    }, 1000)
}

let activeDevice = $derived($mediaSettings.cameraId)

</script>

<div style="display: flex; flex-direction: column">
    {#if open}
        <div in:fade|global class="list layered-shadow">
            {#each videoDevices as src}
                <div onclick={() => pickSource(src)}>
                    <h5 class:picked={activeDevice === src.deviceId}>{src.label}</h5>
                </div>
            {/each}
        </div>
    {/if}
    <div class="share" class:border_rgb="{changed}" class:open onclick={() => (open = !open)}>
        <h5>Camera</h5>
    </div>
</div>

<style lang="scss">
.share {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    width: 120px;
    height: 38px;
    cursor: pointer;
    transition: 200ms;

    &:hover {
        background-color: var(--card-border);
    }
}

.open {
    border-color: var(--success-color);
}

.list {
    position: absolute;
    bottom: 85px;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 300px;
    padding: 5px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    z-index: 999;
    max-height: 400px;
    div {
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;

        &:hover {
            background-color: var(--card-border);
        }
    }
}

.list {
    --scrollbarBG: transparent;
    --thumbBG: #3337;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--thumbBG) var(--scrollbarBG);
}

.list::-webkit-scrollbar {
    width: 8px;
}

.list::-webkit-scrollbar-track {
    background: var(--scrollbarBG);
}

.list::-webkit-scrollbar-thumb {
    background-color: var(--thumbBG);
    border-radius: 3px;
    border: 3px solid var(--scrollbarBG);
}

.picked {
    color: var(--success-color);
}
</style>
