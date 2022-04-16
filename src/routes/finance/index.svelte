<script>
    import { fade } from 'svelte/transition';
    import Balance from "/src/components/finance/Balance.svelte";
</script>

<main in:fade>
    <div class="top">
        <h1>Finances</h1>
        <Balance/>
    </div>
</main>

<style>
    h1 {
        color: white;
        margin: 0
    }

    main {
        margin: 0 85px;
        z-index: 3;
    }

    .top {
        display: flex;
        justify-content: space-between;
        width: 100%;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        padding: 15px 20px 15px 20px;
        box-sizing: border-box;
    }

    h1 {
        font-weight: 400;
    }

</style>
