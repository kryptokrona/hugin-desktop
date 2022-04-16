<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    let node;
</script>

<main in:fade>
    <h1>Settings</h1>

    <select bind:value={node}>
        {#each $nodelist as node}
            <option value={`${node.url}:${node.port}`}>{node.name}</option>
        {/each}
</main>

<style>
    h1 {
        color: white;
        margin: 0
    }

    main {
        margin-left: 85px;
        padding: 40px;
        z-index: 3;
    }

</style>
