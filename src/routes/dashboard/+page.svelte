<script>
    import {user} from '$lib/stores/user.js'
    import {onMount} from 'svelte'
    import Share from './components/Share.svelte'
    import Funds from './components/Funds.svelte'
    import EditName from './components/EditName.svelte'
    import {layoutState} from '$lib/stores/layout-state.js'
    import FillButton from '$components/buttons/FillButton.svelte'
    import {openURL} from '$lib/utils/utils.js'
    import StandardGroups from "./components/StandardGroups.svelte";
    import CreateRoom from './components/CreateRoom.svelte'

    let date = new Date()
    let hrs = date.getHours()
    let greet

    onMount(async () => {
        if (hrs < 12) greet = 'Good Morning'
        else if (hrs >= 12 && hrs <= 17) greet = 'Good Afternoon'
        else if (hrs >= 17 && hrs <= 24) greet = 'Good Evening'
    })

</script>

    <div class="header">
        <div style="display: flex; align-items: center; gap: 0.5rem">
            <h1>{greet}, {$user.username}!</h1>
            <EditName/>
        </div>
        <div class="button_wrapper">
            {#if $layoutState.showFaucetButton === null}
                <FillButton
                        text="Faucet"
                        enabled="{true}"
                        disabled="{false}"
                        on:click="{() => openURL(`https:faucet.kryptokrona.org/?address=${$user.huginAddress.substring(0,99)}`)}"
                />
            {/if}
            <Share/>
        </div>
    </div>

<div style="display: flex;">
    <Funds/>
</div>
<div class="grid" style="margin-top: 20px">
    <StandardGroups/>
    <CreateRoom />
</div>


<style lang="scss">

  .grid {
    height: 100%;
    width: 100%;
    display: grid;
    grid-gap: 1rem;
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 80px;
    margin-bottom: 2rem;
  }

  .button_wrapper {
    display: flex;
    gap: 1rem;
  }

</style>
