<script>
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { groups, notify } from '$lib/stores/user.js'
import { fly } from 'svelte/transition'
import { cubicIn, cubicOut } from 'svelte/easing'
import { get_avatar } from '$lib/utils/hugin-utils.js'

const dispatch = createEventDispatcher()
let timer
export let error
export let message
export let success

const group = $groups.groupArray.find(a => a.key === message.group)

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
    dispatch('hide', {
        hash: message.hash,
    })
}

</script>

{#if !error && !success}
    <div
        on:click="{hideNotification}"
        in:fly="{{ x: 200, duration: 200, easing: cubicOut }}"
        out:fly="{{ y: -200, duration: 200, easing: cubicIn }}"
        class="card"
    >
        <div class="inner-card">
            <div class="header">
                <img class="avatar" src="data:image/png;base64,{get_avatar(message.key)}" alt="" />
                <h4 class="name">{message.name}</h4>
                {#if message.group}<p>in {group.name}</p>{/if}
            </div>
            <p class="message">{message.message}</p>
            <br />
        </div>
    </div>
{:else if error}
    <div
        on:click="{hideNotification}"
        in:fly="{{ x: 200, duration: 200, easing: cubicOut }}"
        out:fly="{{ y: -200, duration: 200, easing: cubicIn }}"
        class="card"
    >
        <div class="inner-card">
            <div class="header">
                <img
                    class="avatar"
                    src="data:image/png;base64,{get_avatar(
                        'SEKReSkhdWVASJVLoSwNgkGuNbE6W52jJeBNuWjE3ZYNYuAPaF9pWT9DK4z3dfUWLNfY7CXGbXAadW46Cd2Wfdf4eaJK3cb9faq'
                    )}"
                    alt=""
                />
                <h4 class="name">{message.name}</h4>
            </div>
            <p class="message">{message.message}</p>
            <br />
        </div>
    </div>
{:else if success}
    <div
        on:click="{hideNotification}"
        in:fly="{{ x: 200, duration: 200, easing: cubicOut }}"
        out:fly="{{ y: -200, duration: 200, easing: cubicIn }}"
        class="card"
    >
        <div class="inner-card">
            <div class="header">
                <img class="avatar" src="data:image/png;base64,{get_avatar(message.key)}" alt="" />
                <h4>{message.name}</h4>
            </div>
            <p class="message success">{message.message}</p>
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
</style>
