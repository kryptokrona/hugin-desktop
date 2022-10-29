<script>
    import { fade } from 'svelte/transition'
    import { webRTC } from '$lib/stores/user.js'

    let open
    let changed
    let audioDevices = $webRTC.devices.filter((a) => a.kind == 'audioinput')
    $: console.log('devices', $webRTC.devices)

    function pickSource(src) {
        console.log('pick', src)
        console.log('deviceid', src.deviceId)
        console.log('change this', src.id)
        $webRTC.audioId = src.deviceId
        window.api.changeAudioSource(src.deviceId)
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
            {#each audioDevices as src}
                <div on:click={() => pickSource(src)}>
                    <h5>{src.label}</h5>
                </div>
            {/each}
        </div>
    {/if}
    <div
        class="share"
        class:border_rgb={changed}
        class:open
        on:click={() => (open = !open)}
    >
        <h5>{changed ? 'Changed' : 'Change'}</h5>
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
        width: 120px;
        padding: 5px;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        border-radius: 0.4rem;

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
