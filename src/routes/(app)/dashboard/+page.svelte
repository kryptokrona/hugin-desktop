<script>
import { misc, user } from '$lib/stores/user.js'
import { onMount } from 'svelte'
import { fade } from 'svelte/transition'
import Share from '$routes/(app)/dashboard/components/Share.svelte'
import Funds from '$routes/(app)/dashboard/components/Funds.svelte'
import EditName from '$routes/(app)/dashboard/components/EditName.svelte'
import { layoutState } from '$lib/stores/layout-state.js'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import { openURL } from '$lib/utils/utils.js'
import StandardGroups from '$routes/(app)/dashboard/components/StandardGroups.svelte'
import Transactions from '$routes/(app)/dashboard/components/Transactions.svelte'
import { messages } from '$lib/stores/messages.js'

let date = new Date()
let hrs = date.getHours()
let greet

onMount(async () => {
    if (!$user.loggedIn) messages.set(await window.api.getMessages((res) => {}))
    if (hrs < 12) greet = 'Good Morning'
    else if (hrs >= 12 && hrs <= 17) greet = 'Good Afternoon'
    else if (hrs >= 17 && hrs <= 24) greet = 'Good Evening'
    $layoutState.showFaucetButton = window.localStorage.getItem('faucet')
    $misc.loading = false
})
</script>

<div class="flex flex-col w-full h-full" in:fade>
    <div class="flex justify-between border-b border-neutral-800 p-4">
        <div class="flex gap-1 items-center">
            <h1 class="text-2xl">{greet}, {$user.username}!</h1>
            <EditName />
        </div>
        <div class="flex gap-2">
            {#if $layoutState.showFaucetButton === null}
                <FillButton
                    text="Faucet"
                    enabled="{true}"
                    disabled="{false}"
                    on:click="{() =>
                        openURL(
                            `https:faucet.kryptokrona.org/?address=${$user.huginAddress.substring(
                                0,
                                99
                            )}`
                        )}" />
            {/if}
            <Share />
        </div>
    </div>

    <Funds />

    <div class="grid grid-cols-2 h-full overflow-hidden no-scrollbar">
        <StandardGroups />
        <Transactions />
    </div>
</div>

