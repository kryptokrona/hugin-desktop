<script>
    import { self } from 'svelte/legacy';

    //To handle true and false, or in this case show and hide.
    import { fade } from 'svelte/transition'
    /** @type {{children?: import('svelte').Snippet, onClose: any}} */
    let { children, onClose } = $props();

    const close = () => {
        onClose()
    }
    
    </script>


<div
    onclick={self(close)}
    in:fade|global="{{ duration: 100 }}"
    out:fade|global="{{ duration: 100 }}"
    class="backdrop">
        {#if children}{@render children()}{:else}
        {/if}
    </div>


    <style lang="scss">


    .backdrop {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--backdrop-color);
    -webkit-backdrop-filter: blur(9px);
    backdrop-filter: blur(9px);
    z-index: 103;
    border-radius: 15px;
}

    </style>