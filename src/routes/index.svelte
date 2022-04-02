<script>
    import {fade} from 'svelte/transition';
    import FillButton from "/src/components/buttons/FillButton.svelte";
    import {user} from "$lib/stores/user.js";
    import {nodelist} from "$lib/stores/nodes.js";
    import {onMount} from "svelte";
    import Hero from "/src/components/Hero.svelte";

    let wallet

    onMount(() => {
        window.api.send('app', true)
        window.api.receive('wallet-exist', data => wallet = data)
    })

    const handleLogin = () => {
        user.update(oldData => {
            return {
                ...oldData,
                loggedIn: true
            }
        })
        console.log('User logged in')
    }

    let node;
    const switchNode = () => {
        window.api.switchNode(node)
        user.update(oldData => {
            return {
                ...oldData,
                node: node
            }
        })
    }
</script>

<div class="wrapper" in:fade out:fade="{{duration: 200}}">
    <div class="login-wrapper">
        <div class="login-wrapper">
            <h1 class="title">Welcome back {$user.username} 👋</h1>
            <FillButton text="Log in" url="/dashboard" on:click={handleLogin}/>
            {#if !wallet}
                <FillButton text="Create Account" url="/create-account" />
            {/if}
        </div>
        <select bind:value={node}>
            {#each $nodelist as node}
                <option value={`${node.url}:${node.port}`}>{node.name}</option>
            {/each}
        </select>
        <button on:click={switchNode}>Connect</button>
    </div>
    <Hero/>
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

    .login-wrapper {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 50%;
        height: 100vh;
    }

    .title {
        width: 270px;
        margin-top: 0;
        margin-bottom: 30px;
    }

</style>