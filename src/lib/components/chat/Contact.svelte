<script>
  import { run } from 'svelte/legacy';

import { onMount} from 'svelte'
import {fade} from 'svelte/transition'
import {get_avatar, getColorFromHash} from '$lib/utils/hugin-utils.js'
import {notify, user, webRTC, beam, swarm, rooms} from '$lib/stores/user.js'
import { isLatin } from '$lib/utils/utils'

  /** @type {{contact: any, ThisContact: any, OpenRename: any, Rename: any}} */
let { contact = $bindable(), ThisContact, OpenRename } = $props();
let thisCall = $state(false)
let beamInvite = $state(false)
let asian = $state(false)
let online = $derived($swarm.active.some(a => a.chat == contact.chat && a.connections.some(a => a.address === contact.chat)))


onMount(async () => {
    const inswarm = $swarm.active.find(a => a.chat == contact.chat )
    if (!inswarm) return
    const users = await window.api.getRoomUsers(inswarm.key)
    for (const u of users) {
        make_avatar(u.avatar, u.address)
    }
})

const make_avatar = (data, address) => {
    if (!data || data.length === 0) return
    if ($rooms.avatars.some(a => a.address === address)) return
    const blob = new Blob( [ data ]);
    const avatar = URL.createObjectURL( blob );
    const usr = {avatar, address}
    $rooms.avatars.push(usr)
    $rooms.avatars = $rooms.avatars
}

let counter = $derived($notify.unread.filter(a => a.type === 'message' && contact.chat === a.chat).length)
run(() => {
    if (contact.msg.substring(0,7) === "BEAM://") {
      beamInvite = true
  }
  });

run(() => {
    if (!isLatin(contact.name)) asian = true
  });

run(() => {
    if (contact.msg.substring(0,11) === "BEAMFILE://") { 
      contact.msg = "File shared ⚡️"
  }
  });

run(() => {
    if ($webRTC.active) {
      thisCall = $webRTC.call.some((a) => a.chat === contact.chat)
  } else {
      thisCall = false
  }
  });

const printThis = (contact) => {
    ThisContact({
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
    OpenRename()
}

  const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
}
</script>

<div
    class="card"
    in:fade|global
    out:fade|global
    class:rgb="{thisCall}"
    class:active="{contact.chat === $user.activeChat.chat}"
    onclick={() => printThis(contact)} >
    
    {#await check_avatar(contact.chat)}
    {:then avatar}
    {#if avatar}
        <img
            class="avatar custom"
            src="{avatar}"
            alt=""
            onclick={() => rename(contact)}
        />
    {:else}
        <img
        class="avatar"
        onclick={() => rename(contact)}
        src="data:image/png;base64,{get_avatar(contact.chat)}"
        alt=""
        />
    {/if}
    {/await}
   
    <div class="content">
        {#if online}
        <div class="online">

        </div>
        {/if}
        <h4 class:asian class:big={asian} style="color: {getColorFromHash(contact.chat)}">{contact.name}</h4>
        
        {#if !beamInvite}
        <p>{contact.msg}</p>
        {:else if beamInvite}
        <p>Started a beam ⚡️</p>
        {/if}
    </div>
    {#if counter > 0}
        <div in:fade|global class="unread">
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
        background-color: var(--card-background);
        border-bottom: 1px solid transparent;
    }
}

.avatar {
    margin-bottom: 10px;
    max-width: 35px;
    opacity: 0.92;
    cursor: pointer;
}

.custom {
    margin-top: 6px;
    border-radius: 5px;
    object-fit: cover;
    width: 25px !important;
    height: 25px !important;
    margin: 6px;
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
    background-color: var(--card-background);
    border: 1px solid var(--success-color) !important;
    border-radius: 2px;
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

.online {
    background-color: #3fd782;
    border-radius: 50%;
    height: 6px;
    width: 7px;
    left: -17px;
    top: 0px;
    box-shadow: 0 0 10px white;
    position: relative;
}
</style>
