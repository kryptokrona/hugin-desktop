<script>
    import {misc} from '$lib/stores/user.js'
    import {prettyNumbers} from '$lib/utils/utils.js'
    import {onDestroy, onMount} from 'svelte'
    import {layoutState} from '$lib/stores/layout-state.js'

    let interval
    onMount(async () => {
        await getBalance()

        interval = setInterval(getBalance, 1000 * 15)
    })

    onDestroy(() => {
        clearInterval(interval)
    })

    //Get balance function
    async function getBalance() {
        $misc.balance = await window.api.getBalance()

        if ($misc.balance[0] > 0) {
            window.localStorage.setItem('faucet', 'false')
            $layoutState.showFaucetButton = false
        }
    }
</script>

<div class="cards grid grid-cols-2 w-full">
    <div class="flex flex-col gap-1 px-4 py-6  border-b border-r border-neutral-800">
        <h4 class="text-lg">Balance</h4>
        <p class="text-2xl">{prettyNumbers($misc.balance[0])}</p>
    </div>
    <div class="flex flex-col gap-1 px-4 py-6 border-b border-neutral-800">
        <h4 class="text-lg">Locked</h4>
        <p class="text-2xl">{prettyNumbers($misc.balance[1])}</p>
    </div>
    <div class="flex flex-col gap-1 px-4 py-6 border-r border-neutral-800">
        <h4 class="text-lg">Funds ratio</h4>
        <div class="flex rounded-full overflow-hidden mt-1">
            <div
                    class="bg-green-400 h-2"
                    style="width: {($misc.balance[0] / ($misc.balance[1] + $misc.balance[0])) * 100}%"
            ></div>
            <div
                    class="bg-red-400 h-2"
                    style="width: {($misc.balance[1] / ($misc.balance[0] + $misc.balance[1])) * 100}%"
            ></div>
        </div>
    </div>
    <div class="flex flex-col gap-1 px-4 py-6 ">
        <h4 class="text-lg">Node status</h4>
        <p class="text-amber-400 text-2xl" class:text-green-400={$misc.syncState}>{$misc.syncState ? $misc.syncState : 'Loading'} </p>
    </div>
</div>

