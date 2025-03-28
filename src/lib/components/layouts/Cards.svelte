<script>
    /** @type {{children?: import('svelte').Snippet}} */
    let { children } = $props();
</script>

<div class="cards">
    {#if children}{@render children()}{:else}
    {/if}
</div>

<style lang="scss">

.cards {
    flex-direction: column;
    gap: 1rem;
    cursor: pointer;
    height: 100%;
    margin-right: 1rem;
    padding: 15px;
    display: flex;
}

</style>
