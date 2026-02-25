<script>
    import toast_ from 'svelte-5-french-toast';
    import { layoutState } from '$lib/stores/layout-state.js';
    import { t } from '$lib/utils/translation.js';
    import { misc } from '$lib/stores/user.js';

    /** @type {{toast: any}} */
    let { toast } = $props();

    const handleClick = () => {
        layoutState.update(current => {
            return {
                ...current,
                showNodeSelector: true,
            }
        });
        toast_.dismiss(toast.id);
    };

    let message = $derived($misc.autoSelectNode 
        ? (t('noNodesFound') || 'No nodes found') 
        : (t('couldNotConnectToNode') || 'Could not connect to node'));
</script>

<button class="node-error-btn" onclick={handleClick}>
    <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px;">
        <span style="font-weight: 500;">{message}</span>
        <span style="font-size: 0.85em; opacity: 0.7;">{t('clickToSelectNode') || 'Click to select node manually'}</span>
    </div>
</button>

<style>
    .node-error-btn {
        background: transparent;
        border: none;
        color: inherit;
        cursor: pointer;
        padding: 0;
        text-align: left;
        font-family: inherit;
        width: 100%;
        outline: none;
    }
    .node-error-btn:hover {
        opacity: 0.8;
    }
</style>
