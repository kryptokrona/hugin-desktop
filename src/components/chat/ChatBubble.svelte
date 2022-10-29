<script>
import { fade } from 'svelte/transition'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import { user } from '$lib/stores/user.js'
import Button from '/src/components/buttons/Button.svelte'
import { createEventDispatcher } from 'svelte'
import Time from 'svelte-time'

export let message
export let handleType
export let msgFrom
export let ownMsg
export let torrent
export let files
export let timestamp
let file

const dispatch = createEventDispatcher()
let address = $user.huginAddress.substring(0, 99)

$: if (files) {
    file = files[0]
}

$: {
    switch (message.substring(0, 1)) {
        case 'Δ':
        // Fall through
        case 'Λ':
            // Call offer
            message = `${message.substring(0, 1) == 'Δ' ? 'Video' : 'Audio'} call started`
            break
    }
}

const downloadTorrent = () => {
    console.log('downloading torrent')
    dispatch('download')
}
</script>

{#if torrent}
    <div class="peer">
        <div class="header peer">
            <img
                class="avatar "
                in:fade="{{ duration: 150 }}"
                src="data:image/png;base64,{get_avatar(msgFrom)}"
                alt=""
            />
            <h5>{$user.activeChat.name}</h5>
        </div>
        <div class="bubble from" in:fade="{{ duration: 150 }}">
            <Button text="Download" disabled="{false}" on:click="{downloadTorrent}" />
        </div>
    </div>
{:else}
    <!-- Takes incoming data and turns it into a bubble that we then use in {#each} methods. -->
    {#if ownMsg}
        <div class="wrapper">
            <div class="avatar-box">
                <img
                    in:fade="{{ duration: 150 }}"
                    src="data:image/png;base64,{get_avatar(address)}"
                    alt=""
                />
            </div>
            <div class="content">
                <div style="display: flex; gap: 1rem">
                    <p class="nickname">
                        {$user.username}
                        <span class="time">
                            | <Time relative timestamp="{parseInt(timestamp)}" /></span
                        >
                    </p>
                </div>
                {#if files}
                    <div class="file" in:fade="{{ duration: 150 }}">
                        <p>{file.name}</p>
                        {#each files as image}{/each}
                    </div>
                {:else}
                    <p class="message">{message}</p>
                {/if}
            </div>
        </div>
    {:else}
        <div class="wrapper">
            <div class="avatar-box">
                <img
                    in:fade="{{ duration: 150 }}"
                    src="data:image/png;base64,{get_avatar(msgFrom)}"
                    alt=""
                />
            </div>
            <div class="content">
                <div style="display: flex; gap: 1rem">
                    <p class="nickname">
                        {$user.activeChat.name}
                        <span class="time">
                            | <Time relative timestamp="{parseInt(timestamp)}" /></span
                        >
                    </p>
                </div>
                {#if files}
                    <div class="file" in:fade="{{ duration: 150 }}">
                        <p>{file.name}</p>
                        {#each files as image}{/each}
                    </div>
                {:else}
                    <p class="message" style="user-select: text;">{message}</p>
                {/if}
            </div>
        </div>
    {/if}
{/if}

<style lang="scss">
.wrapper {
    padding: 10px 20px;
    display: flex;
    width: 100%;

    &:hover {
        background-color: var(--card-background);
    }
}

.avatar-box {
    height: 48px;
    width: 48px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 5px;
    display: flex;
    justify-content: center;
    align-items: center;

    img {
        height: 48px;
        width: 48px;
    }
}

.content {
    display: flex;
    flex-direction: column;
    padding-left: 1rem;
    justify-content: center;
    gap: 0.25rem;

    .nickname {
        margin: 0;
        word-break: break-word;
        font-family: 'Montserrat', sans-serif;
        font-weight: 600;
    }

    .message {
        margin: 0;
        word-break: break-word;
        font-family: 'Montserrat', sans-serif;
        font-weight: 400;
        color: var(--text-color);
        font-size: 15px;
    }
}

.file {
    background: none !important;
}

.time {
    color: var(--text-color);
    opacity: 80%;
    font-weight: 400;
    font-size: 0.75rem;
}
</style>
