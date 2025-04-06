<!-- @migration-task Error while migrating Svelte code: Event attribute must be a JavaScript expression, not a string -->
<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import { rooms, transactions } from '$lib/stores/user.js'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import { page } from '$app/stores'
	import { run } from 'svelte/legacy';
	import Backdrop from '../layouts/Backdrop.svelte';

let inRoom = $derived($page.url.pathname === '/rooms')

let {
    onSendTx
} = $props()


const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
}

let enableButton = $state(false)
let addr = $transactions.send.to
let amount = $state()
let paymentId = $state('')
let pass = $state()
let verify = $state(false)

run(() => {
    if (amount > 0) {
        enableButton = true
    }
})


const keyDown = async (e) => {
    if (e.key === 'Enter' && amount.length > 0 && !verify) {
        verify = true
    } else if(e.key === 'Enter' && amount.length > 0 && verify) {
        await confirmTx()
    } else if (e.key === 'Escape') {
        close()
    }
}

const close = () => {
    $transactions.tip = false
    amount = 0
}

// Dispatch the inputted data
const sendTransaction = () => {
    onSendTx( {
        to: addr,
        amount: parseInt(amount) * 100000,
        paymentId: undefined,
    })
}

const confirmTx = async () => {
    const confirm = await window.api.verifyPass(pass)
    if (!confirm) {
        window.api.errorMessage('Wrong password')
        close()
        return
    }
    sendTransaction()
}
</script>

<svelte:window on:keyup|preventDefault="{keyDown}" />

<Backdrop onClose={close}
>
    {#if !verify}
    <div in:fly|global="{{ y: 20 }}" out:fly|global="{{ y: -50 }}" class="field">
        {#await check_avatar(addr)}
        {:then avatar}
        {#if avatar}
            <img
                class="custom-avatar"
                src="{avatar}"
                alt=""
            />
        {:else}
            <img
            class="avatar"
            src="data:image/png;base64,{get_avatar(addr)}"
            alt=""
            />
        {/if}
        {/await}
        <input
            placeholder="{inRoom ? "Tip amount" : "Enter amount"}"
            type="text"
            spellcheck="false"
            autocomplete="false"
            bind:value="{amount}"
            oninput="{amount.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1')}"
        />
        <FillButton
            on:click="{() => verify = true}"
            enabled="{amount > 0}"
            disabled="{!enableButton}"
            text="{inRoom ? 'Tip' : 'Send'}"
        />
    </div>
    {:else}
    <div in:fly|global="{{ y: 20 }}" out:fly|global="{{ y: -50 }}" class="field">
        <input
            placeholder="Enter password"
            spellcheck="false"
            type="password"
            autocomplete="false"
            bind:value="{pass}"
        />
        <FillButton
            on:click="{confirmTx}"
            enabled="{amount > 0}"
            disabled="{!enableButton}"
            text="Confirm"
        />
    </div>
    {/if}
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

.custom-avatar {
    height: 30px;
    width: 30px;
    padding: 5px;
    object-fit: cover;
}
</style>
