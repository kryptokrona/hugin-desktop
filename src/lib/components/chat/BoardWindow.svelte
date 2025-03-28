<script>
    /** @type {{children?: import('svelte').Snippet}} */
    let { children } = $props();
//Don't know if we can handle date here, to print today, yesterday etc in chat.
</script>

<!--This is just a wrapper that takes nested components-->
<div class="window">
    {@render children?.()}
</div>

<style lang="scss">
.window {
    display: flex;
    flex-direction: column;
    overflow-y: scroll;
    overflow-x: hidden;
    width: 100%;
    z-index: 3;

    &::-webkit-scrollbar {
        display: none;
    }
}
</style>
