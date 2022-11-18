<script>
    import {fade} from 'svelte/transition'
    import {user} from '$lib/stores/user.js'
    import {onMount} from 'svelte'
    import Share from './components/Share.svelte'
    import Funds from './components/Funds.svelte'
    import EditName from './components/EditName.svelte'
    import CreateRoom from './components/CreateRoom.svelte'
    import {layoutState} from '$lib/stores/layout-state.js'
    import FillButton from '$components/buttons/FillButton.svelte'
    import {openURL} from '$lib/utils/utils.js'

    let date = new Date()
    let hrs = date.getHours()
    let greet

onMount(async () => {
    if (hrs < 12) greet = 'Good Morning'
    else if (hrs >= 12 && hrs <= 17) greet = 'Good Afternoon'
    else if (hrs >= 17 && hrs <= 24) greet = 'Good Evening'
})

</script>

<main in:fade>
    <div class="dashboard">
        <div class="header">
            <div style="display: flex; align-items: center; gap: 0.5rem">
                <h1>{greet}, {$user.username}!</h1>
                <EditName />
            </div>
            <div class="button_wrapper">
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
                            )}"
                    />
                {/if}
                <Share />
            </div>
        </div>

        <div class="content">
            <CreateRoom />
            <Funds />
        </div>
    </div>
</main>

<style lang="scss">
main {
    margin: 0 20px 0 95px;
    z-index: 3;
    height: 100vh;
}

.dashboard {
    padding: 15px 20px;
    border-radius: 10px;
}

.header {
    padding-top: 1rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.button_wrapper {
    display: flex;
    gap: 1rem;
}

.content {
    display: flex;
    width: 100%;
}
</style>
