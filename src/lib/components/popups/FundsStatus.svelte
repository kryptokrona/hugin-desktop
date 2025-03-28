<script>
    import { run } from 'svelte/legacy';

// Copyright (c) 2022, The Kryptokrona Developers
import { misc } from '$lib/stores/user.js'
import { fade, fly } from 'svelte/transition'
import Close from '$lib/components/buttons/Close.svelte'
import { prettyNumbers } from '$lib/utils/utils.js'

let locked = $state()
let unlocked = $state()
let total = $state()

run(() => {
    locked = prettyNumbers($misc.balance[1])
    unlocked = prettyNumbers($misc.balance[0])
    total = prettyNumbers($misc.balance[0] + $misc.balance[1])
});
</script>

<div in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 100 }}" class="popup">
    <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="popup-card">
        <div style="margin-bottom: 10px; display: flex; justify-content: space-between">
            <h3 style="color: var(--title-color)">Funds Status</h3>
            <Close on:click />
        </div>
        <div style="margin-bottom: 10px">
            <h5 style="color: var(--warn-color); margin: 0 0 5px 5px;">Locked funds</h5>
            <input disabled type="text" placeholder="Nickname" bind:value="{locked}" />
        </div>
        <div style="margin-bottom: 10px">
            <h5 style="color: var(--alert-color); margin: 0 0 5px 5px;">Unlocked funds</h5>
            <input disabled type="text" placeholder="Nickname" bind:value="{unlocked}" />
        </div>
        <div style="margin-bottom: 10px">
            <h5 style="color: var(--success-color); margin: 0 0 5px 5px;">Total Funds</h5>
            <input disabled type="text" placeholder="Nickname" bind:value="{total}" />
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
        box-sizing: border-box;
        flex-direction: column;
        justify-content: space-between;
        height: 360px;
        width: 320px;
        padding: 30px;
        background-color: var(--backgound-color);
        border-radius: 8px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.1);
    }
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

    &::placeholder,
    ::-ms-input-placeholder,
    ::-webkit-input-placeholder {
        color: var(--input-placeholder);
        font-family: 'Roboto Mono', monospace;
    }

    &:focus {
        outline: none;
        border: 1px solid var(--primary-color);
    }
}
</style>
