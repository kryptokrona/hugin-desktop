<script>
    import { run, createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
import { page } from '$app/stores'
import { fade } from 'svelte/transition'
import { notify, rtc_groups } from '$lib/stores/user.js'
import { videoGrid } from '$lib/stores/layout-state.js'

let thispage = $derived($page.url.pathname === '/messages')
let unread = $state(false)
let rtc_unread = false


run(() => {
        if ($notify.unread.some((a) => a.type === 'message')) {
        unread = true
    } else {
        unread = false
    }
    });

run(() => {
        if (!$videoGrid.showChat && $rtc_groups.unread.length && $videoGrid.showVideoGrid) {
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
    <div class="unread" class:grid={$videoGrid.showVideoGrid && !$videoGrid.showChat} in:fade|global></div>
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
    <g id="vuesaxlinearsms">
        <g id="vuesaxlinearsms">
            <g id="sms">
                <path
                    d="M7 20.5C4 20.5 2 19 2 15.5L2 8.5C2 5 4 3.5 7 3.5L17 3.5C20 3.5 22 5 22 8.5L22 15.5C22 19 20 20.5 17 20.5L7 20.5Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M17 9L13.87 11.5C12.84 12.32 11.15 12.32 10.12 11.5L7 9"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <g id="Vector-2">
                    <path
                        d="M24 0L24 24L0 24L0 0L24 0Z"
                        id="Vector"
                        fill="none"
                        fill-rule="evenodd"
                        stroke="none"></path>
                </g>
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
    background-color: var(--primary-color);
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

.grid {
    left: 94% !important;
}
</style>
