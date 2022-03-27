<script>
    import {fly} from 'svelte/transition'
    import logo from '/static/logo-white.png'
    import logout from '/static/logout.png'
    import {user} from "$lib/stores/user.js";

    const handleLogout = () => {
        user.set({
            loggedIn: false,
            ...user
            })
    }
</script>

<div class="leftMenu" in:fly="{{x: -100}}" out:fly="{{x: -100}}">
    <div class="top">
        <a class='button' href="/dashboard">Dashboard</a>
        <a class='button' href="/boards">Boards</a>
    </div>
    <div class="bottom">
        <a href="/" on:click={handleLogout}><img src={logout} height="18px" alt=""></a>
        <img class="logo" src={logo} alt="kryptokrona logo">
    </div>
</div>


<style>

    .leftMenu {
        height: 100vh;
        width: 85px;
        background-color: #1d1d1d;
        box-sizing: border-box;
        padding-bottom: 1.5em;
        padding-top: 3em;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        -webkit-app-region: drag;
        position: fixed;
        z-index: 100;
    }

    .top {

    }

    .bottom {
        display: flex;
        flex-direction: column;
        gap: 15px
    }

    .logo {
        width: 50px;
    }


    .button {
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 5px;
        border-radius: 5px;
    }

    a {
        margin: 0 auto;
    }

</style>