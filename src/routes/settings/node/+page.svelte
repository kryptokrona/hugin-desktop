<script>
    import { run } from 'svelte/legacy';

    import Button from '$lib/components/buttons/Button.svelte'
    import { misc } from '$lib/stores/user.js'
    import {layoutState} from '$lib/stores/layout-state.js'
    import { onMount } from 'svelte'
    import { fade } from 'svelte/transition'
    import NodeSelector from '$lib/components/popups/NodeSelector.svelte'

    let synced = $state(false)
    let networkHeight = $state()
    let walletHeight = $state()
    let connecting = $state(false)
    
    onMount(() => {
        getHeight();
    })

    let status = $derived(synced ? "Connected" : "Syncing blocks")

    run(() => {
        synced = $misc.syncedStatus
    });

    run(() => {
        networkHeight
        walletHeight
    });

    let activeNode = $derived($misc.node.node ?? "Connecting")

    run(() => {
        if (activeNode === "Connecting") {
            connecting = true
            synced = false
        } else {
            connecting = false
            synced = true
        }
    });

    async function getHeight() {
        let heightStatus = await window.api.getHeight()
        walletHeight = heightStatus.walletHeight
        networkHeight = heightStatus.networkHeight
    }

    const connectToNode = (e) => {
        $layoutState.showNodeSelector = false
        $misc.node = e.node
        changeNode()
        window.api.switchNode($misc.node)
    }

        
    //Change node defaults values and triggers getHeight
    const changeNode = () => {
        console.log('Changed')
        networkHeight = ''
        walletHeight = ''
        synced = false
        getHeight()
    }


</script>

{#if $layoutState.showNodeSelector}
    <div class="backdrop">
        <NodeSelector
            goBack="{() => ($layoutState.showNodeSelector = false)}"
            onConnect="{(e) => connectToNode(e)}"
        />
    </div>
{/if}

<h2>Node</h2>
<div class="change_node">
    <Button
        text="Change Node"
        enabled="{false}"
        disabled="{false}"
        on:click="{() => ($layoutState.showNodeSelector = true)}"
    />
</div>
<div class="settings" in:fade|global>
<div class="nodestatus">

    <div class="node">
        <h4>Address</h4>
            <p class:syncstatus={connecting} class="nodeinfo">{activeNode}</p>
    </div>
        <div class="status">
            <h4>Status</h4>

            {#if synced}
                <p class="nodeinfo syncstatus" class:sync="{synced}">
                    {status}
                </p>
            {:else}
                <p class="nodeinfo syncstatus" class:sync="{synced}">Syncing blocks</p>
            {/if}
        </div>
        <div class="height">
            <h4>Height</h4>

            {#if synced}
                <p class="nodeinfo">{networkHeight}</p>
            {:else}
                <p class="nodeinfo"> {walletHeight}</p>
            {/if}
        </div>
    </div>
    <br>

</div>

<style lang="scss">

h2 {
    margin-bottom: 10px;
}

.settings {

    margin-top: 2rem;
    border-radius: 10px;
    display: grid;
    transition: 0.25s ease-in-out all;
    grid-template-columns: repeat(1, 1fr);
}

.sync {
    color: var(--success-color) !important;
}

.syncstatus {
    color: var(--alert-color);
}

.nodeinfo {
    font-size: 17px !important;
}

.button {
    margin-left: -5px;
    margin-bottom: 10px;
}

.networkheight {
    font-size: 15px;

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
    background-color: var(--backgound-color);
    z-index: 103;
}

.change_node {
    margin-left: -5px;
}

</style>