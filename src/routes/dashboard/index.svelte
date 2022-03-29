<script>
    import { fade } from 'svelte/transition';
    import Balance from "/src/components/finance/Balance.svelte";
</script>

<main in:fade>
    <h1>Dashboard</h1>
    <Balance/>
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
