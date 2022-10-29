<script>
    // Copyright (c) 2022, The Kryptokrona Developers
    import { fade, fly } from 'svelte/transition'
    import Close from '/src/components/icons/Close.svelte'
    import { misc } from '$lib/stores/user.js'

    let progress

    $: {
        progress = ($misc.walletBlockCount / $misc.networkBlockCount) * 100
    }
</script>

<div in:fade={{ duration: 100 }} out:fade={{ duration: 100 }} class="popup">
    <div
        in:fly={{ y: 50 }}
        out:fly={{ y: -50 }}
        class="popup-card layered-shadow"
    >
        <div
            style="margin-bottom: 10px; display: flex; justify-content: space-between"
        >
            <h3 style="color: var(--title-color)">Node status</h3>
            <Close on:click />
        </div>
        <div>
            <h5 style="margin-bottom: 10px">Connected to</h5>
            <input
                disabled
                type="text"
                placeholder="No node"
                bind:value={$misc.node}
            />
        </div>
        <div>
            <h5 style="margin-bottom: 10px">Status</h5>
            <input
                disabled
                type="text"
                placeholder="No status"
                bind:value={$misc.syncState}
            />
        </div>
        <div>
            <div
                style="display: flex; justify-content: space-between; align-items: center; padding: 0 5px"
            >
                <h5 style="margin-bottom: 10px">Sync</h5>
            </div>
            <div class="goal">
                <h4>
                    {progress === 100
                        ? progress.toFixed(0)
                        : progress.toFixed(2)}%
                </h4>
                <div
                    class="progress"
                    class:stripes={progress !== 100}
                    class:synced={progress === 100}
                    style="width: {progress}%;"
                />
            </div>
        </div>
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
        background-color: var(--backdrop-color);
        z-index: 103;

        .popup-card {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            background-color: var(--backgound-color);
            border: 1px solid var(--border-color);
            border-radius: 0.4rem;
            box-sizing: border-box;
            padding: 30px 30px 40px 30px;
            width: 300px;
        }
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

    .synced {
        background-color: var(--border-color);
    }

    input {
        height: 40px;
        box-sizing: border-box;
        background-color: var(--input-background);
        border: 1px solid var(--input-border);
        padding: 10px;
        border-radius: var(--border-radius);
        color: var(--title-color);
        transition: 200ms ease-in-out;
        width: 100%;

        &::placeholder {
            color: var(--input-placeholder);
            font-family: 'Roboto Mono', monospace;
        }

        &:focus {
            outline: none;
            border: 1px solid var(--primary-color);
        }
    }
</style>
