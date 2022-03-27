<script>
    import {fade} from 'svelte/transition';
    import FillButton from "/src/components/buttons/FillButton.svelte";
</script>

<main in:fade>

    <h1>Create Account</h1>
    <div class="wrapper">
        <label>Username</label>
        <input type="text" placeholder="Satoshi">
        <label>Password</label>
        <input type="password" placeholder="Something safe">
        <FillButton text="Create" on:click={() => console.log('clicked')}/>
        <FillButton text="back" url="/"/>
    </div>
</main>

<style>
    main {
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    .wrapper {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex-direction: column;
    }

    h1 {
        margin: 0;
        color: white;
    }

    label {
        color: white;
        margin-top: 20px;
    }

    input {
        padding: 10px;
        width: 200px;
        border: none;
        border-radius: 5px;
    }
</style>