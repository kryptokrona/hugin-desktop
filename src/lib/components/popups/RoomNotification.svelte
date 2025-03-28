<script>
import {  onDestroy, onMount } from 'svelte'
import { groups, notify, rooms } from '$lib/stores/user.js'
import { fly } from 'svelte/transition'
import { cubicIn, cubicOut } from 'svelte/easing'
import { get_avatar } from '$lib/utils/hugin-utils.js'

let timer
    /** @type {{error: any, message: any, success: any, Hide: any}} */
    let { error, message, success, Hide } = $props();

const find_room = () => {
    const findit = (arr) => {
       return arr.find(a => a.key === message.group)
    }
    const room = findit($rooms.roomArray)
    return room
    
}
const room = find_room()

onMount(
    () =>
        (timer = setTimeout(function () {
            hideNotification(message.hash)
        }, 2000))
)
onDestroy(() => {
    clearTimeout(timer)
    hideNotification()
})

function hideNotification(id) {
    Hide({
        hash: message.hash,
    })
}

const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
}

</script>

{#if room}
    <div
        onclick={hideNotification}
        in:fly|global="{{ x: 200, duration: 200, easing: cubicOut }}"
        out:fly|global="{{ y: -200, duration: 200, easing: cubicIn }}"
        class="card"
    >
        <div class="inner-card">
            <div class="header">
                {#await check_avatar(message.address)}
                {:then avatar}
                 {#if avatar}
                    <img
                        class="custom-avatar"
                        src="{avatar}"
                        alt=""
                    />
                {:else}
                    <img
                    class="avatar"
                    src="data:image/png;base64,{get_avatar(message.address)}"
                    alt=""
                />
                {/if}
                {/await}
                <h4 class="name">{message.name}</h4>
                <p>in {room.name}</p>
            </div>
            <p class="message">{message.message}</p>
            <br />
        </div>
    </div>

{/if}

<style>
.card {
    display: flex;
    padding: 1px;
    height: 72px;
    width: 300px;
    flex-direction: column;
    box-sizing: border-box;
    border-radius: 5px;
    box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 99999;
}

.inner-card {
    justify-content: space-between;
    align-items: center;
    width: 100%;
    max-height: 69px;
    border-radius: 3px;
    background-color: #111111;
}

.avatar {
    height: 30px;
    width: 30px;
}

.name {
    font-size: 12px;
    display: flex;
    font-weight: bold;
    padding-right: 10px;
}

p {
    margin-top: 0px;
    font-size: 11px;
    font-family: 'Montserrat';
    display: contents;
}

h4 {
    margin: 0;
    color: rgba(255, 255, 255, 0.8);
    font-weight: normal;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.header {
    margin-left: 10px;
    padding-top: 4px;
    align-items: center;
    display: flex;
    align-items: center;
    gap: 0.25rem;
}

.message {
    font-family: 'Montserrat';
    font-size: 12px;
    display: inline-flex;
    height: 30px;
    overflow: hidden;
    padding-right: 10px;
    margin-left: 44px;
    margin-top: -9px;
    word-break: break-word;
}

.success {
    color: var(--success-color);
}

.custom-avatar {
    height: 40px;
    width:  40px;
    border-radius: 15px;
    padding: 10px;
    object-fit: cover;
}
</style>
