<script>
    import { createEventDispatcher } from 'svelte'
    import { fade } from 'svelte/transition'
    import { get_avatar } from '$lib/utils/hugin-utils.js'
    import { user, webRTC } from '$lib/stores/user.js'

    export let contact
    let thisCall = false

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
    in:fade={{ duration: 100 }}
    out:fade={{ duration: 100 }}
    class:rgb={thisCall}
    class:active={contact.chat === $user.activeChat.chat}
    on:click={() => printThis(contact)}
>
    {#if contact.new}
        <div class:unread={contact.new} />
    {/if}

    <img
        class="avatar"
        on:click={() => rename(contact)}
        src="data:image/png;base64,{get_avatar(contact.chat)}"
        alt=""
    />
    <div class="content">
        <h4>{contact.name}</h4>
        <p>{contact.msg}</p>
    </div>
</div>

<style lang="scss">
    .card {
        display: flex;
        height: 80px;
        padding: 1rem;
        width: 100%;
        color: var(--title-color);
        border-bottom: 1px solid var(--border-color);
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
        animation: border_rgb 30s infinite;
        background-color: white;
        width: 5px;
        height: 2px;
        border-radius: 30%;
        left: 340px;
        margin-top: 25px;
        position: absolute;
    }

    .active {
        background-color: var(--border-color);
        border-bottom: 1px solid transparent;
    }
</style>
