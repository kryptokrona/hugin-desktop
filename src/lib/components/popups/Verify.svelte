<script>
import { fly } from "svelte/transition"
import Backdrop from "../layouts/Backdrop.svelte"
import { createEventDispatcher } from 'svelte'
import FillButton from '$lib/components/buttons/FillButton.svelte'

const dispatch = createEventDispatcher()
let password = ""
let enableButton = false

$: if (password.length > 1) enableButton = true
else enableButton = false

const verify = async () => {
    const result = await window.api.verifyPass(password)
    if (!result) {
        window.api.errorMessage('Wrong password')
        return
    }
    dispatch('ok')
}

const keyDown = (e) => {
    if (e.key === 'Enter' && password.length > 0) {
        verify()
    } else if (e.key === 'Escape') {
        close()
    }
}

const close = () => {
    dispatch('close')
}

</script>
<svelte:window on:keydown="{keyDown}"/>
<Backdrop on:close={close}>
    <div in:fly="{{ y: 20 }}" out:fly="{{ y: -50 }}" class="field">
        <input
            placeholder="Enter password"
            spellcheck="false"
            type="password"
            autocomplete="false"
            bind:value="{password}"
        />
        <FillButton
            on:click="{verify}"
            enabled="{enableButton}"
            disabled="{!enableButton}"
            text="Confirm"
        />
    </div>
</Backdrop>

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
        width: 50%;
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

</style>