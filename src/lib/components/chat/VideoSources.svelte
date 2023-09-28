<script>
import { fade } from 'svelte/transition'
import { webRTC, swarm } from '$lib/stores/user.js'
export let conference = false
let open
let changed
let add = false
let videoDevices = $webRTC.devices.filter((a) => a.kind == 'videoinput')
$: if (conference) videoDevices = $swarm.devices.filter((a) => a.kind == 'videoinput')


function pickSource(src) {
    console.log('pick', src)
    if ($swarm.call.length === 0 && conference) add = true
    window.api.changeSource(src.deviceId, conference, add)
    if ($webRTC.screenshare || $swarm.screenshare) {
        $webRTC.screenshare = false
        $swarm.screenshare = false
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

$: if (open) window.api.checkSources()

</script>

<div style="display: flex; flex-direction: column">
    {#if open}
        <div in:fade class="list layered-shadow">
            {#each videoDevices as src}
                <div on:click="{() => pickSource(src)}">
                    <h5>{src.label}</h5>
                </div>
            {/each}
        </div>
    {/if}
    <div class="share" class:border_rgb="{changed}" class:open on:click="{() => (open = !open)}">
        <h5>{$webRTC.screenshare ? 'Screen' : 'Camera'}</h5>
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
</style>
