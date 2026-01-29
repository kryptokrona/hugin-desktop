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

<div class="settings-container">
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
    <div class="card-header">
        <h2>{t('messageNode') || 'Message Node'}</h2>
    </div>

    <div class="info-grid">
        <div class="info-item">
            <span class="info-label">{t('status') || 'Status'}</span>
            <div class="status-indicator {$HuginNode.connected ? 'connected' : 'disconnected'}">
                <span class="status-dot"></span>
                <span class="status-text">
                    {#if $HuginNode.connected}
                        {t('connected') || 'Connected'}
                    {:else}
                        {t('disconnected') || 'Disconnected'}
                    {/if}
                </span>
            </div>
        </div>
        
        <div class="info-item">
            <span class="info-label">{t('address') || 'Address'}</span>
            <span class="info-value">
                {#if publicNode}
                    {t('publicNode') || 'Public Node'}
                {:else}
                    {truncateAddress(huginNode)}
                {/if}
            </span>
        </div>
    </div>

    <div class="controls-section">
        <div class="mode-toggle">
            <button
                class="toggle-btn {publicNode ? 'active' : ''}"
                onclick={() => (publicNode = true)}
            >
                
                {t('public') || 'Public'}
            </button>
            <button
                class="toggle-btn {!publicNode ? 'active' : ''}"
                onclick={() => (publicNode = false)}
            >
                
                {t('private') || 'Private'}
            </button>
        </div>
        
        {#if !publicNode}
            <div class="input-wrapper" transition:slide|local={{ duration: 250 }}>
                <input
                    spellcheck="false"
                    placeholder={t('enterNodeAddress') || 'Enter node address'}
                    bind:value={huginNode}
                    class="node-input"
                />
            </div>
        {/if}
        
        <Button
            text={t('connect') || 'Connect'}
            disabled={false}
            on:click={() => connect()}
        />
    </div>
</section>

<!-- Normal Node -->
<section class="card">
    <div class="card-header">
        
        <h2>{t('node') || 'Node'}</h2>
    </div>

    <div class="info-grid">
        <div class="info-item">
            <span class="info-label">{t('status') || 'Status'}</span>
            <div class="status-indicator {synced ? 'connected' : 'syncing'}">
                <span class="status-dot"></span>
                <span class="status-text">
                    {#if synced}
                        {status}
                    {:else}
                        {t('syncingBlocks') || 'Syncing blocks'}
                    {/if}
                </span>
            </div>
        </div>
        
        <div class="info-item">
            <span class="info-label">{t('height') || 'Height'}</span>
            <span class="info-value">
                {#if synced}
                    {networkHeight}
                {:else}
                    {walletHeight}
                {/if}
            </span>
        </div>
    </div>

    <div class="controls-section">
        <div class="node-display">
            <span class="node-label">{t('address') || 'Address'}</span>
            <span class="node-address {connecting ? 'connecting' : ''}">
                {activeNode}
            </span>
        </div>
        
        <Button
            text={t('change') || 'Change'}
            disabled={false}
            on:click={() => ($layoutState.showNodeSelector = true)}
        />
    </div>
</section>
</div>

<style lang="scss">
.settings-container {
    height: 100vh;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 20px;
    --scrollbarBG: transparent;
    --thumbBG: #3337;
    scrollbar-width: thin;
    scrollbar-color: var(--thumbBG) var(--scrollbarBG);
}

.settings-container::-webkit-scrollbar {
    width: 8px;
}

.settings-container::-webkit-scrollbar-track {
    background: var(--scrollbarBG);
}

.settings-container::-webkit-scrollbar-thumb {
    background-color: var(--thumbBG);
    border-radius: 3px;
    border: 3px solid var(--scrollbarBG);
}

.card {
    background: var(--background-color, #1a1a1a);
    border-radius: 16px;
    margin-bottom: 24px;
    transition: all 0.3s ease;
    
}

.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    
    h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: var(--text-color);
        font-family: "Montserrat";
    }
}

.icon-badge {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(76, 175, 80, 0.15);
    border-radius: 10px;
    font-size: 20px;
    border: 1px solid rgba(76, 175, 80, 0.3);
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 20px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    border: 1px solid var(--border-color, #2a2a2a);
}

.info-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-color);
    opacity: 0.6;
    font-weight: 600;
    font-family: "Montserrat";
}

.info-value {
    font-size: 16px;
    color: var(--text-color);
    font-weight: 500;
    font-family: "RobotoMono", monospace;
    word-break: break-all;
}

.status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    
    &.connected {
        .status-dot {
            background: var(--accent-color, #4CAF50);
            box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
        }
        .status-text {
            color: var(--accent-color, #4CAF50);
        }
    }
    
    &.disconnected,
    &.syncing {
        .status-dot {
            background: var(--alert-color, #ff9800);
            box-shadow: 0 0 10px rgba(255, 152, 0, 0.5);
        }
        .status-text {
            color: var(--alert-color, #ff9800);
        }
    }
}

.status-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

.status-text {
    font-size: 16px;
    font-weight: 600;
    font-family: "Montserrat";
}

.controls-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.mode-toggle {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 4px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    border: 1px solid var(--border-color, #2a2a2a);
}

.toggle-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 20px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text-color);
    font-family: "Montserrat";
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
        background: rgba(76, 175, 80, 0.1);
    }
    
    &.active {
        background: linear-gradient(135deg, var(--accent-color, #4CAF50) 0%, rgba(76, 175, 80, 0.8) 100%);
        color: #fff;
        box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
    }
}

.toggle-icon {
    font-size: 18px;
}

.input-wrapper {
    width: 100%;
}

.node-input {
    width: 100%;
    height: 45px;
    padding: 12px 16px;
    font-size: 14px;
    font-family: "RobotoMono", monospace;
    color: var(--text-color);
    background: rgba(0, 0, 0, 0.2);
    border: 2px solid var(--border-color, #2a2a2a);
    border-radius: 10px;
    outline: none;
    transition: all 0.3s ease;
    
    &:focus {
        border-color: var(--accent-color, #4CAF50);
        box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
    }
    
    &::placeholder {
        color: var(--text-color);
        opacity: 0.4;
    }
}

.node-display {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 10px;
    border: 1px solid var(--border-color, #2a2a2a);
    flex: 1;
}

.node-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text-color);
    opacity: 0.6;
    font-weight: 600;
    font-family: "Montserrat";
}

.node-address {
    font-size: 16px;
    color: var(--text-color);
    font-weight: 500;
    font-family: "RobotoMono", monospace;
    word-break: break-all;
    
    &.connecting {
        color: var(--alert-color, #ff9800);
        animation: pulse 2s ease-in-out infinite;
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
    background-color: var(--backgound-color);
    z-index: 103;
}
</style>
