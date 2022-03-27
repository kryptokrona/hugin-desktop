<script>
    import {fade} from 'svelte/transition';
</script>

<main in:fade>
    <div class="board">
        <h1>Boards</h1>
    </div>
</main>

<style>
    main {
        margin-left: 85px;
        padding: 40px;
    }

    h1 {
        color: white;
        margin: 0
    }
</style>