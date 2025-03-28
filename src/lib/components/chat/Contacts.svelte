<!-- @migration-task Error while migrating Svelte code: Cannot subscribe to stores that are not declared at the top level of the component -->
<script>
import { fade } from 'svelte/transition'
import { user, webRTC } from '$lib/stores/user.js'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import AddToCall from '$lib/components/icons/AddToCall.svelte'
import { videoSettings, mediaSettings } from '$lib/stores/mediasettings.js'
let open
let changed
let audioDevices = $mediaSettings.devices.filter((a) => a.kind == 'audioinput')

function invite(contact) {
    buttonGlow()
    console.log('invite!', contact)
    let video = false
    //If video
    if ($videoSettings.myVideo) {
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
    window.api.successMessage(`${contact.name} invited to call`)
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

</script>

<div style="display: flex; flex-direction: column">
    {#if open}
        <div in:fade|global class="list layered-shadow">
            {#each $user.contacts as u}
                <div class="card" on:click="{(e) => invite(u)}">
                    <img
                        class="avatar"
                        src="data:image/png;base64,{get_avatar(u.chat)}"
                        alt=""
                    />
                    <p class="nickname">{u.name}</p>
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

<style lang="scss">/*$$__STYLE_CONTENT__$$*/</style>
