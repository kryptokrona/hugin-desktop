<script>
    //To handle true and false, or in this case show and hide.
    import { fade } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte';
    
    const dispatch = createEventDispatcher()

    const close = () => {
        dispatch('close')
    }
    
    </script>


<div
    on:click|self="{close}"
    in:fade="{{ duration: 100 }}"
    out:fade="{{ duration: 100 }}"
    class="backdrop">
        <slot>
        </slot>
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
    z-index: 103;
    border-radius: 15px;
}

    </style>