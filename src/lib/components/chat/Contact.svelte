<script>
import {createEventDispatcher} from 'svelte'
import {fade} from 'svelte/transition'
import {get_avatar, getColorFromHash} from '$lib/utils/hugin-utils.js'
import {notify, user, webRTC} from '$lib/stores/user.js'
import { isLatin } from '$lib/utils/utils'

export let contact
let thisCall = false
let beamInvite = false
let asian = false

$: counter = $notify.unread.filter(a => a.type === 'message' && contact.chat === a.chat).length
$: if (contact.msg.substring(0,7) === "BEAM://") {
    beamInvite = true
}

$: if (!isLatin(contact.name)) asian = true

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
    class="card"
    in:fade
    out:fade
    class:rgb="{thisCall}"
    class:active="{contact.chat === $user.activeChat.chat}"
    on:click="{() => printThis(contact)}"
>


    <img
        class="avatar"
        on:click="{() => rename(contact)}"
        src="data:image/png;base64,{get_avatar(contact.chat)}"
        alt=""
    />
    <div class="content">
        <h4 class:asian class:big={asian} style="color: {getColorFromHash(contact.chat)}">{contact.name}</h4>
        
        {#if !beamInvite}
        <p>{contact.msg}</p>
        {:else if beamInvite}
        <p>Started a beam ⚡️</p>
        {/if}
    </div>
    {#if counter > 0}
        <div in:fade class="unread">
            <div class="count">
                {counter}
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
.card {
    display: flex;
    height: 80px;
    padding: 1rem;
    width: 100%;
    color: var(--title-color);
    border-bottom: 1px solid var(--border-color);
  background-color: var(--backgound-color);
    transition: 200ms ease-in-out;
    cursor: pointer;
    opacity: 0.9;

    &:hover {
        color: white;
        opacity: 1;
        background-color: var(--card-border);
        border-bottom: 1px solid transparent;
    }
}

.avatar {
    margin-bottom: 10px;
    opacity: 0.92;
    cursor: pointer;
}

.content {
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    width: 90%;
}

h4 {
    margin: 0;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    font-family: 'Montserrat', sans-serif;
    text-overflow: ellipsis;
    font-weight: bold;
}

p {
    margin: 5px 0 0 0;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    font-family: 'Montserrat', sans-serif;
}

.unread {
    min-width: 17px;
    height: 17px;
    border-radius: 33%;
    background: #ce4141;
    padding: 2px;
    display: flex;
    margin-top: 10px;
    justify-content: center;
}

.active {
    background-color: var(--border-color);
    border-bottom: 1px solid transparent;
}

.count {
    font-size: 12px;
    color: white;
}

.asian {
    font: menu;
}

.big {
    font-size: 17px;
}
</style>
