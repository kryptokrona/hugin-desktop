<script>
    import { run } from 'svelte/legacy';
    import Button from '$lib/components/buttons/Button.svelte';
    import { misc, HuginNode } from '$lib/stores/user.js';
    import { layoutState } from '$lib/stores/layout-state.js';
    import { onMount } from 'svelte';
    import { slide } from 'svelte/transition';
    import NodeSelector from '$lib/components/popups/NodeSelector.svelte';
    import { t } from '$lib/utils/translation.js';

    let synced = $state(false);
    let networkHeight = $state();
    let walletHeight = $state();
    let connecting = $state(false);
    let huginNode = $derived($HuginNode.address);
    let publicNode = $state(true);
    let status = $state(t('syncing') || 'Syncing...');

    let activeNode = $derived(($misc.node.node ?? t('connecting')) || 'Connecting');

    onMount(() => {
        getHeight();
    });

    $effect(() => {
        status = synced ? t('connected') || 'Connected' : t('syncingBlocks') || 'Syncing blocks';
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
        const pub = publicNode;
        if (!pub && huginNode.length < 99) {
            window.api.errorMessage(t('addressFormatNotCorrect') || 'Address format is not correct.');
            return;
        }
        window.api.send('hugin-node', { address: pub ? '' : huginNode, pub });
    };

    const truncateAddress = (addr) =>
        addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : t('notSet') || 'Not set';
</script>

{#if $layoutState.showNodeSelector}
    <div class="backdrop">
        <NodeSelector
            goBack={() => ($layoutState.showNodeSelector = false)}
            onConnect={(e) => connectToNode(e)}
        />
    </div>
{/if}

<!-- Message Node -->
<section class="card">
    <h2>{t('messageNode') || 'Message Node'}</h2>

    <!-- First row: Status | Address -->
    <div class="row">
        <div class="status">
            <h4>{t('status') || 'Status'}</h4>
            {#if $HuginNode.connected}
                <p class="nodeinfo syncstatus sync">{t('connected') || 'Connected'}</p>
            {:else}
                <p class="nodeinfo syncstatus">{t('disconnected') || 'Disconnected'}</p>
            {/if}
        </div>
        <div class="node">
            <h4>{t('address') || 'Address'}</h4>
            {#if publicNode}
                <p class="nodeinfo ellipsis">{t('publicNode') || 'Public Node'}</p>
            {:else}
                <p class="nodeinfo ellipsis">{truncateAddress(huginNode)}</p>
            {/if}
        </div>
    </div>

    <div class="row gap">
        <div class="mode-toggle">
            <div
                class="toggle-option {publicNode ? 'active' : ''}"
                on:click={() => (publicNode = true)}
            >
                {t('public') || 'Public'}
            </div>
            <div
                class="toggle-option {!publicNode ? 'active' : ''}"
                on:click={() => (publicNode = false)}
            >
                {t('private') || 'Private'}
            </div>
        </div>
          <Button
            text={t('connect') || 'Connect'}
            disabled={false}
            on:click={() => connect()}
        />
        {#if !publicNode}
            <input
                spellcheck="false"
                placeholder={t('enterNodeAddress') || 'Enter node address'}
                bind:value={huginNode}
                class="ellipsis-input"
                transition:slide|local={{ duration: 250 }}
            />
        {/if}
    </div>
</section>

<!-- Normal Node -->
<section class="card">
    <h2>{t('node') || 'Node'}</h2>

    <!-- First row: Status | Height -->
    <div class="row">
        <div class="status">
            <h4>{t('status') || 'Status'}</h4>
            {#if synced}
                <p class="nodeinfo syncstatus sync">{status}</p>
            {:else}
                <p class="nodeinfo syncstatus">{t('syncingBlocks') || 'Syncing blocks'}</p>
            {/if}
        </div>
        <div class="height">
            <h4>{t('height') || 'Height'}</h4>
            {#if synced}
                <p class="nodeinfo">{networkHeight}</p>
            {:else}
                <p class="nodeinfo">{walletHeight}</p>
            {/if}
        </div>
    </div>

    <!-- Second row: Address | Change button -->
    <div class="row gap">
        <div class="node">
            <h4>{t('address') || 'Address'}</h4>
            <p class:syncstatus={connecting} class="nodeinfo ellipsis">
                {activeNode}
            </p>
        </div>
        <Button
            text={t('change') || 'Change'}
            disabled={false}
            on:click={() => ($layoutState.showNodeSelector = true)}
        />
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

.row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.row.gap {
    gap: 1rem;
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
    color: var(--success-color);
}

.ellipsis-input {
    width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.ellipsis {
    max-width: 250px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.nodeinfo {
    font-size: 17px !important;
    color: var(--text-color);
}

.sync {
    color: var(--success-color) !important;
}

.syncstatus {
    color: var(--alert-color);
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


input {
    margin: 0 auto;
    width: 400px;
    height: 37px;
    transition: 200ms ease-in-out;
    color: var(--text-color);
    background-color: transparent;
    border: 1px solid var(--border-color);
    font-size: 1.1rem;
    outline: none;
    padding: 10px;
    border-radius: 5px;

    &:focus {
        border: 1px solid var(--success-color) !important;
    }
}
</style>
