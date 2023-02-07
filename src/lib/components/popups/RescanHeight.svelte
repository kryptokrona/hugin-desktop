<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { createEventDispatcher } from 'svelte'
import { js_wallet } from '$lib/stores/wallet.js'
import FillButton from '$lib/components/buttons/FillButton.svelte'

const dispatch = createEventDispatcher()

let enableButton = false
let height

$: {
    if (height > 0) {
        enableButton = true
    }
}

const keyDown = (e) => {
    if (e.key === 'Enter' && height.length > 0) {
        reScan()
    } else if (e.key === 'Escape') {
        close()
    }
}

const close = () => {
    $js_wallet.rescan = false
    amount = ""
}

const reScan = () => {
    window.api.send('rescan', height)
    close()
}


</script>

<svelte:window on:keyup|preventDefault="{keyDown}" />

<div
    on:click|self="{close}"
    in:fade="{{ duration: 100 }}"
    out:fade="{{ duration: 100 }}"
    class="backdrop"
>
    <div in:fly="{{ y: 20 }}" out:fly="{{ y: -50 }}" class="field">
        <input
            placeholder="Enter block height"
            type="text"
            spellcheck="false"
            autocomplete="false"
            bind:value="{height}"
        />
        <FillButton
            on:click="{reScan}"
            enabled="{height > 0}"
            disabled="{!enableButton}"
            text="Rescan"
        />
    </div>
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
            background-color: var(--card-border);
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
    backdrop-filter: blur(8px);
    z-index: 103;
    border-radius: 15px;
}
</style>
