<script>
    import {fade} from 'svelte/transition';
    import FillButton from "/src/components/buttons/FillButton.svelte";
    import {user} from "$lib/stores/user.js";
    import { goto } from '$app/navigation';

    let password;
    let walletName;

    const handleLogin = () => {

      let accountData = {
        walletName: walletName,
        password: password
      }
        window.api.send('create-account', accountData);

        console.log('Creating user account')
    }
    
</script>

<main in:fade>
    <h1>Create Account</h1>
    <div class="wrapper">
        <label>Username</label>
        <input type="text" placeholder="Satoshi" bind:value={walletName}>
        <label>Password</label>
        <input type="password" placeholder="Something safe" bind:value={password}>
        <FillButton text="Create" on:click={handleLogin}/>
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
        z-index: 3;
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
