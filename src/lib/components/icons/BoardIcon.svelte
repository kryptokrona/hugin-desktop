<script>
    import { run, createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
import { page } from '$app/stores'
import { fade } from 'svelte/transition'
import { notify } from '$lib/stores/user.js'

let thispage = $derived($page.url.pathname === '/boards')
let unread = $state(false)

run(() => {
        if ($notify.unread.some((a) => a.type === 'board')) {
        unread = true
    } else {
        unread = false
    }
    });
</script>

{#if thispage}
    <div class="dot" in:fade|global></div>
{/if}

{#if unread}
    <div class="unread" in:fade|global></div>
{/if}

<svg
    onclick={bubble('click')}
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns="http://www.w3.org/2000/svg"
>
    <g id="vuesaxlinearmessage-text">
        <g id="vuesaxlinearmessage-text">
            <g id="message-text">
                <path
                    d="M8 19C4 19 2 18 2 13L2 8C2 4 4 2 8 2L16 2C20 2 22 4 22 8L22 13C22 17 20 19 16 19L15.5 19C15.19 19 14.89 19.15 14.7 19.4L13.2 21.4C12.54 22.28 11.46 22.28 10.8 21.4L9.3 19.4C9.14 19.18 8.77 19 8.5 19L8 19Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M7 8L17 8"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M7 13L13 13"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M24 0L24 24L0 24L0 0L24 0Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="none"></path>
            </g>
        </g>
    </g>
</svg>

<style lang="scss">
svg {
    transition: 200ms ease-in-out;
    cursor: pointer;

    &:hover {
        opacity: 80%;
    }
}

.dot {
    position: absolute;
    background-color: white;
    border-radius: 2px;
    height: 16px;
    width: 10px;
    left: -8px;
    box-shadow: 0 0 10px white;
}

.unread {
    position: absolute;
    background-color: var(--warn-color);
    border-radius: 50%;
    height: 5px;
    width: 5px;
    left: 2px;
    box-shadow: 0 0 10px white;
}
</style>
