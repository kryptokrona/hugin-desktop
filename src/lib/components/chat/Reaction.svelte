<script>
    import { run } from 'svelte/legacy'
    import { fade, fly, scale } from 'svelte/transition'

    /** @type {{reacts?: any, reactCount?: number, thisReaction: any, emoji: any, react?: boolean, counter?: boolean}} */
    let {
        reacts = [],
        reactCount = $bindable(0),
        thisReaction,
        emoji,
        react = false,
        counter = false,
        onSendReaction
    } = $props();
let filterReactions = $state([])
let hoverReaction = false
let filterReactors = $state([])
let press = $state(false)

run(() => {
        if (reacts.length) filterReactions = reacts.filter((a) => a.message == thisReaction.message)
    });

run(() => {
        if (filterReactions.length > 0) {
        let reactor = {}
        filterReactors = filterReactions.filter((r) => !reactor[r.address] && (reactor[r.address] = true))
        reactCount = filterReactions.length
    }
    });

const sendReaction = () => {
press = true
onSendReaction({
        msg: thisReaction.message,
        grp: thisReaction.group,
        reply: thisReaction.reply,
    })
    setTimeout(() => {
            press = false
    }, 150)
}

run(() => {
        reactCount
    });
</script>


<div class:pressed={press} in:fly={{y : 150}} class="reaction" onclick={sendReaction}>
    {thisReaction.message}
    {#if filterReactions.length >= 1}
        <p class="count">{reactCount}</p>
    {/if}

    <div in:fade|global class="reactors">
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

.pressed {
    background-color: var(--success-color) !important;
    transform: scale(1.1);
    transition: transform 150ms ease-in-out;
}

.reactor {
    font-family: 'Montserrat';
    font-weight: bold;
    color: var(--text-color);
    border-radius: 2px;
    font-size: 11px;
    display: inline-block;
    z-index: 1;
    background-color: var(--background-color);
}

.count {
    font-family: 'Montserrat';
    font-size: 10px;
    display: inline;
    color: var(--text-color);
}
</style>
