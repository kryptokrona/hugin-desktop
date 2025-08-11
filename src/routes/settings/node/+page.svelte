<script>
    import { run } from 'svelte/legacy';
    import Button from '$lib/components/buttons/Button.svelte';
    import { misc, HuginNode } from '$lib/stores/user.js';
    import { layoutState } from '$lib/stores/layout-state.js';
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import NodeSelector from '$lib/components/popups/NodeSelector.svelte';

    // State
    let synced = $state(false);
    let networkHeight = $state();
    let walletHeight = $state();
    let connecting = $state(false);
    let huginNode = $state('');
    let connectionMode = $state('public'); // 'public' or 'private'
    let status = $state('Syncing...');

    // Active node
    let activeNode = $derived($misc.node.node ?? 'Connecting');

    // Lifecycle
    onMount(() => {
        getHeight();
    });

    // Effects
    $effect(() => {
        status = synced ? 'Connected' : 'Syncing blocks';
    });

    run(() => {
        synced = $misc.syncedStatus;
    });

    run(() => {
        networkHeight;
        walletHeight;
    });

    run(() => {
        if (activeNode === 'Connecting') {
            connecting = true;
            synced = false;
        } else {
            connecting = false;
            synced = true;
        }
    });

    // Functions
    async function getHeight() {
        let heightStatus = await window.api.getHeight();
        walletHeight = heightStatus.walletHeight;
        networkHeight = heightStatus.networkHeight;
    }

    const connectToNode = (e) => {
        $layoutState.showNodeSelector = false;
        $misc.node = e.node;
        changeNode();
        window.api.switchNode($misc.node);
    };

    const changeNode = () => {
        networkHeight = '';
        walletHeight = '';
        synced = false;
        getHeight();
    };

    const connect = () => {
        const pub = connectionMode === 'public';
        if (!pub && huginNode.length < 99) {
            window.api.errorMessage('Address format is not correct.');
            return;
        }
        window.api.send('hugin-node', { address: pub ? '' : huginNode, pub });
    };
</script>

{#if $layoutState.showNodeSelector}
    <div class="backdrop">
        <NodeSelector
            goBack={() => ($layoutState.showNodeSelector = false)}
            onConnect={(e) => connectToNode(e)}
        />
    </div>
{/if}

<section class="card">
    <h2>Message Node</h2>

    <div class="current-node">
        <strong>Status:</strong>
        <span>{#if HuginNode.connected}
            Connected
            {:else}
            Disconnected
            {/if}
        </span>
    </div>

    <div class="mode-toggle">
        <div
            class="toggle-option {connectionMode === 'public' ? 'active' : ''}"
            on:click={() => (connectionMode = 'public')}
        >
            Public
        </div>
        <div
            class="toggle-option {connectionMode === 'private' ? 'active' : ''}"
            on:click={() => (connectionMode = 'private')}
        >
            Private
        </div>
    </div>

    {#if connectionMode === 'private'}
        <div transition:slide|local={{ duration: 250 }}>
            <input
                spellcheck="false"
                placeholder="Enter node address"
                bind:value={huginNode}
            />
        </div>
    {/if}

    <div class="buttons">
        <Button text="Connect" on:click={connect} />
    </div>
</section>

<section class="card">
    <h2>Node</h2>
    <div class="change_node">
        <Button
            text="Change Node"
            disabled={false}
            on:click={() => ($layoutState.showNodeSelector = true)}
        />
    </div>

    <div class="nodestatus">
        <div class="node">
            <h4>Address</h4>
            <p class:syncstatus={connecting} class="nodeinfo">{activeNode}</p>
        </div>

        <div class="status">
            <h4>Status</h4>
            {#if synced}
                <p class="nodeinfo syncstatus" class:sync={synced}>
                    {status}
                </p>
            {:else}
                <p class="nodeinfo syncstatus" class:sync={synced}>
                    Syncing blocks
                </p>
            {/if}
        </div>

        <div class="height">
            <h4>Height</h4>
            {#if synced}
                <p class="nodeinfo">{networkHeight}</p>
            {:else}
                <p class="nodeinfo">{walletHeight}</p>
            {/if}
        </div>
    </div>
</section>

<style lang="scss">
.card {
    background: var(--background-secondary);
    padding: 1.5rem;
    border-radius: 10px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 2rem;
}

.current-node {
    font-size: 1rem;
    strong {
        color: var(--text-highlight);
    }
}

.mode-toggle {
    display: flex;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    overflow: hidden;
    width: fit-content;
}

.toggle-option {
    padding: 0.5rem 1rem;
    cursor: pointer;
    background: var(--background-secondary);
    color: var(--text-color);
    transition: background 0.2s, color 0.2s;
    user-select: none;
}

.toggle-option.active {
    background: var(--primary-color);
    color: var(--button-text-color);
}

.buttons {
    display: flex;
    gap: 1rem;
}

input {
    width: 100%;
    height: 45px;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    padding: 0.5rem;
    font-size: 1rem;
    background-color: transparent;
    color: var(--text-color);
    margin-top: 0.5rem;
    &:focus {
        outline: 2px solid var(--primary-color);
    }
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

.node {
    margin-bottom: 7px;
    margin-left: -5px;
}

.change_node {
    margin-left: -5px;
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
</style>
