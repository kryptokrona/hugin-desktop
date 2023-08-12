<script>
import { misc, user, userAvatar } from '$lib/stores/user.js'
import { goto } from '$app/navigation'
import GroupIcon from '$lib/components/icons/GroupIcon.svelte'
import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte'
import XkrLogo from '$lib/components/icons/XkrLogo.svelte'
import DiscoveryIcon from '$lib/components/icons/DiscoveryIcon.svelte'
import { openURL } from '$lib/utils/utils.js'
import { page } from '$app/stores'
import { layoutState } from '$lib/stores/layout-state.js'
import AlphaIcon from '$lib/components/icons/AlphaIcon.svelte'
import Logout from '$lib/components/icons/Logout.svelte'

let sync
let avatar

$: sync = $misc.syncState

userAvatar.subscribe((output) => {
    avatar = output
})
$: avatar

const handleLogout = () => {
    user.update((data) => {
        return {
            ...data,
            loggedIn: false,
        }
    })
    goto('/login')
}

const messagesRouteAndMenu = () => {
    if ($page.url.pathname === '/messages') {
        $layoutState.hideChatList = !$layoutState.hideChatList
    } else {
        setTimeout(() => {
            $layoutState.hideChatList = false
        }, 300)
        goto('/messages')
    }
}

const groupRouteAndMenu = () => {
    if ($page.url.pathname === '/groups') {
        $layoutState.hideGroupList = !$layoutState.hideGroupList
    } else {
        goto('/groups')
    }
}

const discoveryRouteAndMenu = () => {
    if ($page.url.pathname === '/discovery') {
        $layoutState.hideGroupList = !$layoutState.hideGroupList
    } else {
        goto('/discovery')
    }
}
</script>

<div class="leftMenu">
    <div class="nav">
        <div class="button myavatar" on:click="{() => goto('/dashboard')}">
            <img class="avatar" src="data:image/png;base64,{avatar}" alt="" />
        </div>
        <div on:click="{messagesRouteAndMenu}" class="button">
            <MessageIcon />
        </div>
        <div on:click="{groupRouteAndMenu}" class="button">
            <GroupIcon />
        </div>
        <div on:click="{discoveryRouteAndMenu}" class="button">
            <DiscoveryIcon />
        </div>
        <!-- <div on:click={() => goto("/boards")} class="button">
            <BoardIcon/>
        </div> -->
        <!-- <a class='button' href="/webrtc"><img class="icon" src={financeIcon} alt="finance"></a> -->
    </div>
    <div class="draggable"></div>
    <div class="nav">
        <div on:click="{() => goto('/settings/node')}" class="button">
            <SettingsIcon />
        </div>
        <a class="button" href="/" on:click="{handleLogout}">
            <Logout />
        </a>
        <XkrLogo grey="{true}" />
        <div
            on:click="{() =>
                openURL('https://github.com/kryptokrona/hugin-desktop/issues/new/choose')}">
            <AlphaIcon />
        </div>
    </div>
</div>

<style lang="scss">
.leftMenu {
    height: 100vh;
    width: 85px;
    border-right: 1px solid var(--border-color);
    box-sizing: border-box;
    padding-bottom: 1rem;
    padding-top: 3rem;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    position: fixed;
    z-index: 100;
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

.button:hover,
.button:hover > .icon {
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
