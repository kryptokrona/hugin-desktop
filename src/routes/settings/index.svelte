<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
</script>

<main in:fade>
    <h1>Settings</h1>
    {#each $nodelist as node}
        <p>{node.name}</p>
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
    }

</style>
