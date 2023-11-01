<script>
import { fade } from 'svelte/transition'
import { webRTC, swarm } from '$lib/stores/user.js'
import { mediaSettings, videoSettings } from '$lib/stores/mediasettings'
export let conference = false
let open
let changed
let add = false
let videoDevices = $mediaSettings.devices.filter((a) => a.kind == 'videoinput')


function pickSource(src) {
    let add = false
    if (!$videoSettings.myVideo && conference) add = true
    
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

$: activeDevice = $mediaSettings.cameraId

</script>

<div style="display: flex; flex-direction: column">
    {#if open}
        <div in:fade class="list layered-shadow">
            {#each videoDevices as src}
                <div on:click="{() => pickSource(src)}">
                    <h5 class:picked={activeDevice === src.deviceId}>{src.label}</h5>
                </div>
            {/each}
        </div>
    {/if}
    <div class="share" class:border_rgb="{changed}" class:open on:click="{() => (open = !open)}">
        <h5>{$videoSettings.screenshare ? 'Screen' : 'Camera'}</h5>
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

.picked {
    color: var(--success-color);
}
</style>
