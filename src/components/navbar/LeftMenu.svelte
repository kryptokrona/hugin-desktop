<script>
    import {fly} from 'svelte/transition'
    import logo from '/static/logo-white.png'
    import logout from '/static/logout.png'
    import settings from '/static/settings.png'
    import {user} from "$lib/stores/user.js";
    import msgIcon from '/static/icons/msg.png'
    import dashIcon from '/static/icons/dash.png'
    import brdIcon from '/static/icons/brd.png'
    import settingsIcon from '/static/icons/settings.png'
    import logoutIcon from '/static/icons/logout.png'

    const handleLogout = () => {
        user.set({
            loggedIn: false,
            ...user
            })
    }
</script>

<div class="leftMenu" in:fly="{{x: -100}}" out:fly="{{x: -100}}">
    <div class="nav">
        <a class='button' href="/dashboard"><img class="icon" src={dashIcon} alt=""></a>
        <a class='button' href="/messages"><img class="icon" src={msgIcon} alt=""></a>
        <a class='button' href="/boards"><img class="icon" src={brdIcon} alt=""></a>
    </div>
    <div class="nav">
        <a class='button' href="/settings"><img class="icon" src={settingsIcon} alt=""></a>
        <a class='button' href="/" on:click={handleLogout}><img class="icon" src={logoutIcon} alt=""></a>
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
        padding-top: 4em;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        -webkit-app-region: drag;
        position: fixed;
        z-index: 100;
    }

    .nav {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px
    }

    .logo {
        width: 50px;
        margin-top: 10px;
    }

    .button {
        width: 40px;
        height: 40px;
        box-sizing: border-box;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 5px;
        border-radius: 5px;
        transition: 250ms ease-in-out;
    }

    .icon {
        opacity: 80%;
        transition: 250ms ease-in-out;
    }

    .button:hover, .button:hover > .icon {
        background-color: #313131;
        opacity: 100%;
    }

</style>