<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { createEventDispatcher } from 'svelte'
import FillButton from '$components/buttons/FillButton.svelte'
import { user } from '$lib/stores/user.js'
import Button from '../buttons/Button.svelte'

const dispatch = createEventDispatcher()

let enableAddButton = false
let text = ''
let name = 'Change'
let rename = false
export let this_contact

const enter = (e) => {
    if (enableAddButton && $user.rename && e.keyCode === 13) {
        renameContact(text)
        enableAddButton = false
    }
}

$: {
    if (text.length > 0) {
        //Enable add button
        enableAddButton = true
    } else {
        enableAddButton = false
    }
}

// Dispatch the inputted data
const renameContact = (board) => {
    // Dispatch the inputted data
    dispatch('rename', {
        text: text,
    })
    closeRename()
}

const closeRename = () => {
    user.update((a) => {
        return {
            ...a,
            rename: false,
        }
    })
}

const remove = () => {
    window.api.removeContact($user.rename.chat)
    dispatch('openRename')
    closeRename()
}
</script>

<svelte:window on:keyup|preventDefault="{enter}" />

<div on:click|self in:fade="{{ duration: 100 }}" out:fade="{{ duration: 100 }}" class="backdrop">
    {#if rename}
    <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="field">
        <input
            placeholder="Rename {$user.rename.name}"
            type="text"
            spellcheck="false"
            autocomplete="false"
            bind:value="{text}"
        />
        <FillButton
            text="{name}"
            disabled="{!enableAddButton}"
            enabled="{enableAddButton}"
            on:click="{() => renameContact(text)}"
        />
    </div>
    {:else}
    <div in:fade="{{ duration: 100 }}" out:fade="{{ duration: 80 }}" class="backdrop" on:click|self>
        <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
            <FillButton
                disabled="{false}"
                text="Rename"
                on:click="{() => rename = true}" />
            <FillButton
                disabled="{false}"
                red="{true}"
                text="Remove"
                on:click="{remove}" />
        </div>
    </div>
    {/if}
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
    z-index: 103;
    border-radius: 15px;
}

.card {
    background-color: var(--backgound-color);
    border: 1px solid var(--card-border);
    padding: 20px;
    border-radius: 8px;
    width: 250px;
    height: 150px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
}

</style>
