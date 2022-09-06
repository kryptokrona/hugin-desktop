<script>
    import {fly} from 'svelte/transition'
    import {user, misc, userAvatar} from "$lib/stores/user.js";
    import { goto } from "$app/navigation";
    import BoardIcon from '/src/components/buttons/BoardIcon.svelte'
    import MessageIcon from '/src/components/buttons/MessageIcon.svelte'
    import SettingsIcon from '/src/components/buttons/SettingsIcon.svelte'
    import XkrLogo from "/src/components/buttons/XkrLogo.svelte";
    import Warning from "/src/components/buttons/Warning.svelte";
    import { openURL } from "$lib/utils/utils.js";
    import BoardIcon2 from '/src/components/buttons/BoardIcon2.svelte'

    let sync
    let avatar

    $: sync = $misc.syncState

    userAvatar.subscribe(output => {
        avatar = output
    })
    $ : avatar

    const handleLogout = () => {
        user.update(data => {
            return {
                ...data,
                loggedIn: false,
            }
        })
    }

</script>

<div class="leftMenu" in:fly="{{x: -100}}" out:fly="{{x: -100}}">
    <div class="nav">
        <a class='button myavatar' href="/dashboard"><img class="avatar" src="data:image/png;base64,{avatar}" alt=""></a>
        <div on:click={() => goto("/messages")} class="button">
            <MessageIcon />
        </div>
        <div on:click={() => goto("/groups")} class="button">
            <BoardIcon/>
        </div>
        <div on:click={() => goto("/boards")} class="button">
            <BoardIcon2/>
        </div>
        <!-- <a class='button' href="/webrtc"><img class="icon" src={financeIcon} alt="finance"></a> -->
    </div>
    <div class="draggable"></div>
    <div class="nav">
        <div on:click={() => goto("/settings")} class="button">
            <SettingsIcon/>
        </div>
        <div on:click={() => openURL('https://github.com/kryptokrona/hugin-svelte/issues/new/choose')} class="button">
            <Warning/>
        </div>
        <!-- <a class='button' href="/" on:click={handleLogout}><img class="icon" src={logoutIcon} alt="logout"></a> -->
        <XkrLogo grey={true}/>
    </div>
</div>


<style lang="scss">

    .leftMenu {
        height: 100vh;
        width: 85px;
        border-right: 1px solid var(--border-color);
        box-sizing: border-box;
        padding-bottom: 2em;
        padding-top: 3em;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        position: fixed;
        z-index: 99;
    }

    .nav {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        -webkit-app-region: no-drag;
    }

    .button {
        width: 40px;
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 5px;
        border-radius: 5px;
        transition: 250ms ease-in-out;
        cursor: pointer;
    }

    .icon {
        opacity: 80%;
        transition: 250ms ease-in-out;
    }

    .button:hover, .button:hover > .icon {
        background-color: #313131;
        opacity: 100%;
    }

    .myavatar {
      margin-bottom: 10px;
      margin-top: -15px;
    }

    .avatar {
      height: 55px;
    }
</style>
