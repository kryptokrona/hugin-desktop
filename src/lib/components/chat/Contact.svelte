<script>
import {createEventDispatcher} from 'svelte'
import {fade} from 'svelte/transition'
import {get_avatar} from '$lib/utils/hugin-utils.js'
import {user, webRTC} from '$lib/stores/user.js'

export let contact

let thisCall = false
let beamInvite = false

$: if (contact.msg.substring(0,7) === "BEAM://") {
    beamInvite = true
}

$: if (contact.msg.substring(0,11) === "BEAMFILE://") { 
    contact.msg = "File shared ⚡️"
}

$: if ($webRTC.active) {
    thisCall = $webRTC.call.some((a) => a.chat === contact.chat)
} else {
    thisCall = false
}
const dispatch = createEventDispatcher()

const printThis = (contact) => {
    dispatch('thisContact', {
        contact: contact,
    })
}

const rename = () => {
    user.update((a) => {
        return {
            ...a,
            rename: contact,
        }
    })
    dispatch('openRename')
}
</script>

<div
    class="flex py-4 px-4 w-full cursor-pointer hover:bg-neutral-800/50"
    in:fade
    class:rgb="{thisCall}"
    class:bg-neutral-800="{contact.chat === $user.activeChat.chat}"
    on:click="{() => printThis(contact)}"
>
    {#if contact.new}
        <div class:unread="{contact.new}"></div>
    {/if}

    <img
        class="h-10 w-10"
        width="20px"
        height="20px"
        on:click="{() => rename(contact)}"
        src="data:image/png;base64,{get_avatar(contact.chat)}"
    />

    <div class="flex flex-col ml-5 justify-center">
        <h4 class="text-md">{contact.name}</h4>
        {#if !beamInvite}
        <p class="text-sm tracking-tight">{contact.msg}</p>
        {:else if beamInvite}
        <p class="text-sm tracking-tight">Started a beam ⚡️</p>
        {/if}
    </div>
</div>

<style lang="scss">

.unread {
    animation: border_rgb 30s infinite;
    background-color: white;
    width: 5px;
    height: 2px;
    border-radius: 30%;
    left: 340px;
    margin-top: 25px;
    position: absolute;
}
</style>
