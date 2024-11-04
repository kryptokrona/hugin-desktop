<script>
import { fade } from 'svelte/transition'
import { createEventDispatcher } from 'svelte'

const dispatch = createEventDispatcher()

export let reacts = []
export let reactCount = 0
export let thisReaction
export let emoji
export let react = false
export let counter = false
let filterReactions = []
let hoverReaction = false
let filterReactors = []

$: if (reacts.length) filterReactions = reacts.filter((a) => a.message == thisReaction.message)

$: if (filterReactions.length > 0) {
    let reactor = {}
    filterReactors = filterReactions.filter((r) => !reactor[r.address] && (reactor[r.address] = true))
    reactCount = filterReactions.length
}

const sendReaction = () => {
    dispatch('sendReaction', {
        msg: thisReaction.message,
        grp: thisReaction.group,
        reply: thisReaction.reply,
    })
}

$: reactCount
</script>

<div class="reaction" on:click="{sendReaction}">
    {thisReaction.message}
    {#if filterReactions.length >= 1}
        <p class="count">{reactCount}</p>
    {/if}

    <div in:fade class="reactors">
        {#each filterReactors as reactors}
            <p class="reactor">{reactors.name}</p>
        {/each}
    </div>
</div>

<style lang="scss">
.reaction {
    display: flex;
    align-items: center;
    height: 20px;
    gap: 8px;
    padding: 0 10px 0 5px;
    cursor: pointer;
    background-color: var(--card-border);
    border-radius: 20px;
    position: relative;

    .reactors {
        display: none;
    }

    &:hover {
        .reactors {
            display: flex;
            margin-top: 40px;
            position: absolute;
            gap: 5px;
            width: max-content;
        }
    }
}

.reactor {
    font-family: 'Montserrat';
    font-weight: bold;
    color: white;
    border-radius: 2px;
    font-size: 11px;
    display: inline-block;
    z-index: 1;
    background-color: #222222;
}

.count {
    font-family: 'Montserrat';
    font-size: 10px;
    display: inline;
    color: white;
}
</style>
