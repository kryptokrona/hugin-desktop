<script>
    import {user} from '$lib/stores/user.js'
    import {onMount} from 'svelte'
    import Share from '/src/routes/dashboard/components/Share.svelte'
    import Funds from '/src/routes/dashboard/components/Funds.svelte'
    import EditName from '$routes/dashboard/components/EditName.svelte'
    import {layoutState} from '$lib/stores/layout-state.js'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import {openURL} from '$lib/utils/utils.js'
    import StandardGroups from '$routes/dashboard/components/StandardGroups.svelte'
    import Transactions from "$routes/dashboard/components/Transactions.svelte";
    import {messages} from '$lib/stores/messages.js'
    import { fly } from 'svelte/transition'
    import Welcome from './components/Welcome.svelte'
	import Upgrade from './components/Upgrade.svelte';
	import Notifications from './components/Notifications.svelte';
    
    let date = new Date()
    let hrs = date.getHours()
    let greet = $state()
    let welcome = $state(false)

    const upgraded = `${localStorage.getItem('hugin+') ? 'Hugin+' : 'Upgrade to Hugin +'}`
    onMount(async () => {
        $user.started = true
        if (!localStorage.getItem('guide')) {
            //Set welcome = true to enable guide popup
            //welcome = true
        }
        if (hrs < 12) greet = 'Good Morning'
        else if (hrs >= 12 && hrs <= 17) greet = 'Good Afternoon'
        else if (hrs >= 17 && hrs <= 24) greet = 'Good Evening'
    })

    let upgrade = $state(false)

</script>

{#if welcome} 
    <Welcome onClose={() => (welcome = false)}/>
{/if}


{#if upgrade} 
    <Upgrade onClose={() => (upgrade = false)}/>
{/if}

<div class="header" in:fly|global="{{ y: 100 }}">
    <div style="display: flex; align-items: center; gap: 0.5rem">
        <h1>{greet}, {$user.username}!</h1>
        <EditName/>
    </div>
    <div class="button_wrapper">
            <FillButton
                text="{upgraded}"
                    enabled="{true}"
                    disabled="{false}"
                    on:click="{() => upgrade = true}"/>
                
        <Share/>
    </div>
</div>

<Funds/>
<div class="grid"  in:fly|global="{{ y: 100 }}">
    <Notifications/> 
    <Transactions/>
    <!-- <CreateRoom/> -->
</div>

<style lang="scss">
  .grid {
    height: 100%;
    width: 100%;
    display: grid;
    grid-template-columns: repeat(12, minmax(0, 1fr));
  }

  .header {
    display: flex;
    border-bottom: 1px solid var(--border-color);
    justify-content: space-between;
    align-items: center;
    height: 80px;
    padding: 1rem 2rem;
  }

  .button_wrapper {
    display: flex;
    gap: 1rem;
  }
  
</style>
