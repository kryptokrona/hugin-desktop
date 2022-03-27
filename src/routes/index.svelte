<script>
    import {fade, fly} from 'svelte/transition';
    import FillButton from "/src/components/buttons/FillButton.svelte";
    import {user} from "$lib/stores/user.js";
    import {onMount} from "svelte";

    let password = 'no password'

    onMount(() => {
        ipcRenderer.receive('account-exist', data => console.log(data))
    })

    const handleLogin = () => {
        window.api.send('password', password);
        user.set({
            ...user,
            loggedIn: true
        })
        console.log('User logged in')
    }
</script>

<div class="wrapper" in:fade>
    <div class="left-wrapper">
        <div class="login-wrapper">
            <h1 class="title">Welcome to Hugin Messenger.</h1>
            <FillButton text="Log in" url="/dashboard" on:click={handleLogin}/>
            <FillButton text="Create Account" url="/create-account" />
        </div>
    </div>
    <div class="right-wrapper rgb">
        <div></div>
        <div in:fly="{{y: 50, delay: 200}}">
            <h2>In this update</h2>
        </div>
        <div in:fly="{{y: 100}}" class="socials">
            <p>Github</p>
            <p>Support</p>
            <p>Website</p>
        </div>
    </div>
</div>

<style>
	:root {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
	}

    :global(body) {
        margin: 0;
        padding: 0;
    }

	.wrapper {
        display: flex;
        height: 100vh;
        color: #fff;
	}

    .right-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 50%;
        height: 100vh;
    }

    .left-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 50%;
        height: 100vh;
    }

    .login-wrapper {

    }

    .title {
        width: 270px;
        margin-top: 0;
        margin-bottom: 30px;
    }

    .socials {
        display: flex;
        gap: 20px
    }
</style>
