<script>
import { misc, user, userAvatar, swarm, webRTC } from '$lib/stores/user.js'
import { goto } from '$app/navigation'
import GroupIcon from '$lib/components/icons/GroupIcon.svelte'
import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte'
import RoomIcon from '$lib/components/icons/RoomIcon.svelte'
import XkrLogo from '$lib/components/icons/XkrLogo.svelte'
import { openURL } from '$lib/utils/utils.js'
import { page } from '$app/stores'
import { layoutState } from '$lib/stores/layout-state.js'
import AlphaIcon from '$lib/components/icons/AlphaIcon.svelte'
import Logout from '$lib/components/icons/Logout.svelte'
import Home from '../icons/Home.svelte'
import Tooltip from "$lib/components/popups/Tooltip.svelte"
import { onMount } from 'svelte'

let sync
let avatar
let in_voice = false
let fileList
let files

onMount(async () => {
//    const profile = await window.api.getProfile()
//    console.log("Got profile info!", profile)
})
$: sync = $misc.syncState

$: if (!$user.customAvatar) {
    userAvatar.subscribe((output) => {
        avatar = output
    })
} else {
    avatar = $user.customAvatar
}
$: avatar

const handleLogout = () => { 
    $user.loggedIn = false
    goto("/login")
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
        setTimeout(() => {
            $layoutState.hideGroupList = false
        }, 300)
        goto('/groups')
    }
}

const roomRouteAndMenu = () => {
    if ($page.url.pathname === '/room') {
        // $layoutState.hideGroupList = !$layoutState.hideGroupList
    } else {
        setTimeout(() => {
            $layoutState.hideGroupList = false
        }, 300)
        goto('/rooms')
    }
}
const changeProfilePic = () => {
    return
   fileList.click()
}

const selectAvatar = async () => {
    return
    console.log('Selected', files[0]);
    const file = files[0];
    window.api.send('set-avatar', [file.path, file.name, file.size])
    const arr = await window.api.loadFile(file.path, file.size)
    const blob = new Blob( [ arr ]);
    const imageUrl = URL.createObjectURL( blob );
    $user.customAvatar = imageUrl
  };

$: if ($webRTC.call.length || $swarm.voice_channel.some(a => a.address === $user.myAddress)) {
    in_voice = true
} else in_voice = false

</script>

<div class="leftMenu">
    <div class="nav">
        <input
        bind:this={fileList}
        bind:files
        class="open"
        type="file"
        on:change={() => selectAvatar()}
        style="width: 0; height: 0;"
      />
        <!-- <Tooltip title="Avatar"> -->
            <div style="cursor: default;" class="button myavatar" on:click="{() => changeProfilePic()}">
                {#if !$user.customAvatar}
                <img class="avatar" src="data:image/png;base64,{avatar}" alt="" />
                {:else}
                <img class="avatar custom" src={$user.customAvatar} alt="" />
                {/if}
            </div>
        <!-- </Tooltip> -->
        <Tooltip title="Dashboard">
            <div on:click="{() => goto('/dashboard')}" class="button">
                <Home />
            </div>
        </Tooltip>
        <Tooltip title="Messages">
            <div on:click="{messagesRouteAndMenu}" class="button">
                <MessageIcon />
            </div>
        </Tooltip>
        <Tooltip title="Groups">
            <div on:click="{groupRouteAndMenu}" class="button">
                <GroupIcon />
            </div>
        </Tooltip> 
        <Tooltip title="Rooms">
            <div on:click="{roomRouteAndMenu}" class="button">
                <RoomIcon />
            </div>
        </Tooltip> 
        <!-- <div on:click={() => goto("/boards")} class="button">
            <BoardIcon/>
        </div> -->
        <!-- <a class='button' href="/webrtc"><img class="icon" src={financeIcon} alt="finance"></a> -->
    </div>
    <div class="draggable"></div>
    <div class="nav">
        <Tooltip title="Settings">
            <div on:click="{() => goto('/settings/node')}" class="button">
                <SettingsIcon />
            </div>
        </Tooltip>
        <Tooltip title="Logout">
            <div class='button' on:click={handleLogout}>
                <Logout/>
            </div>
        </Tooltip>      
        <XkrLogo grey="{true}" />
        <Tooltip title="Github">
            <div
            on:click="{() =>
                openURL('https://github.com/kryptokrona/hugin-desktop/issues/new/choose')}"
        >
            <AlphaIcon />
        </div>
        </Tooltip> 
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

.custom {
    height: 40px !important;
    border-radius: 5px;
    max-width: 60px;
}
</style>
