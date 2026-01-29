<script>
    import { run, preventDefault, createBubbler, self } from 'svelte/legacy';

    const bubble = createBubbler();
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import { user } from '$lib/stores/user.js'
import { t } from '$lib/utils/translation.js'
import { onDestroy, onMount, tick } from 'svelte'
import {layoutState} from '$lib/stores/layout-state.js'

let nicknameField
let enableAddButton = $state(false)
let text = $state('')
let name = t('change') || 'Change'
let rename = $state(false)
    /** @type {{this_contact: any, onRename:any, OpenRename: any}} */
    let { this_contact, onRename, OpenRename,  } = $props();

const enter = (e) => {
    if (enableAddButton && $user.rename && e.keyCode === 13) {
        renameContact(text)
        enableAddButton = false
    }
}

async function focusField() {
  await tick()
  nicknameField?.focus()
}

onMount(() => {
    layoutState.update(v => ({ ...v, modalOpen: true }))
})

onDestroy(() => {
  layoutState.update(v => ({ ...v, modalOpen: false }))
})

run(() => {
    if (text.length > 0) {
        //Enable add button
        enableAddButton = true
    } else {
        enableAddButton = false
    }
});

run(() => {
  if (rename) {
    focusField()
  }
})

// Dispatch the inputted data
const renameContact = (board) => {
    // Dispatch the inputted data
     onRename({
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
    OpenRename()
    closeRename()
}
</script>

<svelte:window onkeyup={preventDefault(enter)} />

<div onclick={self(bubble('click'))} in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 100 }}" class="backdrop">
    {#if rename}
    <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="field">
        <input
            placeholder={t('renameContact', { name: $user.rename.name }) || `Rename ${$user.rename.name}`}
            type="text"
            spellcheck="false"
            autocomplete="false"
            bind:value="{text}"
            bind:this={nicknameField}
        />
        <FillButton
            text="{name}"
            disabled="{!enableAddButton}"
            enabled="{enableAddButton}"
            on:click="{() => renameContact(text)}"
        />
    </div>
    {:else}
    <div in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 80 }}" class="backdrop" onclick={self(bubble('click'))}>
        <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="card">
            <FillButton
                disabled="{false}"
                text={t('rename') || 'Rename'}
                on:click="{() => rename = true}" />
            <FillButton
                disabled="{false}"
                red="{true}"
                text={t('remove') || 'Remove'}
                on:click|once="{remove}" />
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
