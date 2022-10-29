<script>
    import { fade } from 'svelte/transition'
    import { get_avatar } from '$lib/utils/hugin-utils.js'
    import { createEventDispatcher } from 'svelte'
    import { boards } from '$lib/stores/user.js'
    import Reaction from '/src/components/chat/Reaction.svelte'
    import EmojiSelector from 'svelte-emoji-selector'
    import Time from 'svelte-time'
    import ReplyArrow from '/src/components/icons/ReplyArrow.svelte'
    import RepliedArrom from '/src/components/icons/RepliedArrow.svelte'

    export let msg
    export let msgFrom
    export let board
    export let reply = ''
    export let myMsg
    export let signature
    export let timestamp
    export let nickname = 'Anonymous'
    export let hash
    export let message
    export let reply_to_this = false

    let active
    let replyicon = '<'
    let thisreply = ''
    let has_reaction = false
    let reactionslist = []
    let hoverReactions = false
    let reactions = []
    let reactors = []
    let react = false
    let reactIcon = '😊'
    let replyMessage = false
    let reactionCount
    let time

    const dispatch = createEventDispatcher()

    async function checkreply(reply) {
        thisreply = await window.api.getReply(reply)
        //Add extra number to avoid collision for keys in Svelte each loop
        thisreply.hash = thisreply.hash + '1337'
        return thisreply
    }

    const replyTo = () => {
        if ($boards.thisBoard === 'Home') return
        reply_to_this = true
        // Dispatch the inputted data
        dispatch('replyTo', {
            reply: 'reply',
        })
    }

    const sendReactMsg = (e) => {
        console.log('wanna send', e.detail)
        dispatch('reactTo', {
            text: e.detail.msg,
            reply: hash,
            board: board,
        })
    }

    const reactTo = (e) => {
        console.log('reactto', e)
        dispatch('reactTo', {
            text: e.detail,
            reply: hash,
            board: board,
        })
    }

    $: if ($boards.replyTo.reply == false) {
        reply_to_this = false
    } else if ($boards.replyTo.to == hash) {
        reply_to_this = true
    }

    $: reactions

    $: if (reply.length === 64) {
        replyMessage = true
    }

    $: if (message.react) {
        let thisemoji = {}
        reactions = message.react.filter(
            (a) => !thisemoji[a.message] && (thisemoji[a.message] = true)
        )
        has_reaction = true
    }
</script>

<!-- Takes incoming data and turns it into a board message that we then use in {#each} methods. -->

<div
    class="message"
    id={hash}
    class:reply_active={reply_to_this}
    in:fade={{ duration: 150 }}
>
    <div>
        {#if replyMessage}
            {#await checkreply(reply) then thisreply}
                <div class="reply">
                    <div style="display: flex; gap: 10px; align-items: center">
                        <RepliedArrom />
                        <div
                            style="display: flex; align-items: center; gap: 10px;"
                        >
                            <p class="reply_nickname">{thisreply.name}</p>
                            <p>{thisreply.message}</p>
                        </div>
                    </div>
                </div>
            {:catch error}
                <div in:fade={{ duration: 150 }} class="reply">
                    <img
                        class="reply_avatar"
                        src="data:image/png;base64,{get_avatar(
                            'SEKReSkhdWVASJVLoSwNgkGuNbE6W52jJeBNuWjE3ZYNYuAPaF9pWT9DK4z3dfUWLNfY7CXGbXAadW46Cd2Wfdf4eaJK3cb9faq'
                        )}"
                        alt=""
                    />
                    <p class="reply_nickname">Can't find reply</p>
                    <br />
                    <p style="color: red">This reply is not in the mempool</p>
                </div>
            {/await}
        {/if}
    </div>
    <div>
        <div>
            <div class="header">
                <div
                    style="display: flex; align-items: center; margin-left: -10px"
                >
                    <img
                        src="data:image/png;base64,{get_avatar(msgFrom)}"
                        alt=""
                    />
                    <h5 class="nickname">
                        {nickname}<span
                            class="time"
                            on:click={() =>
                                dispatch('findMsg', {
                                    hash: hash,
                                    board: board,
                                })}
                            >| <Time
                                relative
                                timestamp={parseInt(message.time * 1000)}
                            /> |
                            {#if $boards.thisBoard === 'Home'}@{board}{/if}</span
                        >
                    </h5>
                </div>
                <div class="actions">
                    <EmojiSelector on:emoji={reactTo} />
                    <ReplyArrow on:click={replyTo} />
                </div>
            </div>
            <p style="user-select: text;">{msg}</p>
        </div>

        <div class="reactions">
            {#if has_reaction}
                {#each reactions as reaction}
                    <Reaction
                        on:sendReaction={(e) => sendReactMsg(e)}
                        thisReaction={reaction}
                        reacts={message.react}
                        emoji={reaction.message}
                        {react}
                    />
                {/each}
            {/if}
        </div>
    </div>
</div>

<style lang="scss">
    .message {
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        color: rgba(255, 255, 255, 0.8);
        padding: 10px 30px 10px 30px;
        border: 1px solid transparent;

        .header {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        &:hover {
            background-color: var(--card-background);

            .actions {
                opacity: 100%;
            }
        }
    }

    .nickname {
        font-size: 13px;
        font-weight: bold;
        display: contents;
        line-height: 20px;
    }

    p {
        margin: 0 0 0 30px;
        word-break: break-word;
        font-family: 'Montserrat', sans-serif !important;
    }

    .actions {
        display: flex;
        gap: 0.5rem;
        transition: 100ms ease-in-out;
        cursor: pointer;
        opacity: 0;
    }

    .reply_avatar {
        height: 30px;
        width: 30px;
    }

    .reply_nickname {
        font-size: 12px;
        font-weight: bold;
    }

    .reply {
        display: flex;
        align-items: center;
        color: rgba(255, 255, 255, 0.8);
        font-size: 12px;
        width: fit-content;
        opacity: 0.85;
        border-radius: 10px;

        p {
            font-size: 11px;
            display: contents;
        }
    }

    .reply_active {
        border: 1px solid #5f86f2;
        -webkit-animation: border_rgb 10s ease infinite;
        -moz-animation: border_rgb 10s ease infinite;
        animation: border_rgb 10s ease infinite;
    }

    .reactions {
        margin: 0.5rem 0 0 30px;
        display: flex;
        gap: 10px;
        font-size: 15px;
        flex: auto;
    }

    .time {
        color: var(--text-color);
        opacity: 80%;
        margin-left: 8px;
        font-weight: 400;
        font-size: 0.75rem;
        cursor: pointer;
    }
</style>
