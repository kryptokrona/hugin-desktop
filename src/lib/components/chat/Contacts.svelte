<script>
import { fade } from 'svelte/transition'
import { notify, user, webRTC } from '$lib/stores/user.js'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import AddToCall from '$lib/components/icons/AddToCall.svelte'

let open
let changed
let audioDevices = $webRTC.devices.filter((a) => a.kind == 'audioinput')

function invite(contact) {
    buttonGlow()
    console.log('invite!', contact)
    let video = false
    //If video
    if ($webRTC.myVideo) {
        video = true
    }
    //Set group iniator state
    if ($webRTC.call.length >= 1) {
        $webRTC.initiator = true
    }
    //Reset invited status
    $webRTC.invited = false

    //Hide contact window
    open = false

    //Add callobject to store
    let call = {
        msg: 'outgoing',
        out: true,
        chat: contact.chat,
        video: video,
    }
    //Invite notification
    let invite = {
        message: `Invited to call...`,
        name: contact.name,
        key: contact.chat,
        hash: Date.now(),
    }
    //Update store
    $notify.success.push(invite)
    $notify.success = $notify.success
    $webRTC.call.unshift(call)

    //Start call
    window.api.startCall(contact.chat + contact.key, video)
}

const buttonGlow = () => {
    changed = true
    let timer = setTimeout(function () {
        changed = false
        open = false
    }, 1000)
}

$: if (open) window.api.checkSources()

</script>

<div style="display: flex; flex-direction: column">
    {#if open}
        <div in:fade class="list layered-shadow">
            {#each $user.contacts as user}
                <div class="card" on:click="{(e) => invite(user)}">
                    <img
                        class="avatar"
                        src="data:image/png;base64,{get_avatar(user.chat)}"
                        alt=""
                    />
                    <p class="nickname">{user.name}</p>
                    <br />
                </div>
            {/each}
        </div>
    {/if}
    <div
        class="contacts_button"
        class:border_rgb="{changed}"
        class:open
        on:click="{() => (open = !open)}"
    >
        <AddToCall />
    </div>
</div>

<style lang="scss">
.contacts_button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    width: 50px;
    height: 38px;
    cursor: pointer;
    transition: 200ms;

    &:hover {
        background-color: var(--card-border);
    }
}

.open {
    border-color: var(--success-color);
}

.list {
    position: absolute;
    bottom: 85px;
    display: flex;
    flex-direction: column;
    gap: 0px;
    width: 220px;
    padding: 5px;
    overflow: hidden;
    overflow: scroll;
    overflow-x: hidden;
    max-height: 500px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    z-index: 99999;
}

.card {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    width: 100%;
    color: white;
    border-bottom: 1px solid var(--border-color);
    transition: 177ms ease-in-out;
    cursor: pointer;

    &:hover {
        background-color: #333333;
    }
}

.nickname {
    font-family: 'Montserrat';
    font-weight: bold;
}

.list {
    --scrollbarBG: transparent;
    --thumbBG: #3337;
    overflow: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--thumbBG) var(--scrollbarBG);
}

.list::-webkit-scrollbar {
    width: 8px;
}

.list::-webkit-scrollbar-track {
    background: var(--scrollbarBG);
}

.list::-webkit-scrollbar-thumb {
    background-color: var(--thumbBG);
    border-radius: 3px;
    border: 3px solid var(--scrollbarBG);
}
</style>
