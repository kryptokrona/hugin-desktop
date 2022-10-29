<script>
    import { page } from '$app/stores'
    import { fade } from 'svelte/transition'
    import { notify } from '$lib/stores/user.js'

    let thispage
    let unread = false
    $: thispage = $page.url.pathname === '/groups'
    $: if ($notify.unread.some((a) => a.type === 'group')) {
        unread = true
    } else {
        unread = false
    }
</script>

{#if thispage}
    <div class="dot" in:fade />
{/if}

{#if unread}
    <div class="unread" in:fade />
{/if}

<svg
    on:click
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns="http://www.w3.org/2000/svg"
>
    <g id="vuesaxlinearmessages">
        <g id="messages">
            <g id="Group" transform="translate(2 6)">
                <path
                    d="M15.98 8.79001C15.98 9.05001 15.97 9.30001 15.94 9.54001C15.71 12.24 14.12 13.58 11.19 13.58L10.79 13.58C10.54 13.58 10.3 13.7 10.15 13.9L8.95001 15.5C8.42001 16.21 7.56 16.21 7.03 15.5L5.82999 13.9C5.69999 13.73 5.41 13.58 5.19 13.58L4.79001 13.58C1.60001 13.58 0 12.79 0 8.79001L0 4.79001C0 1.86001 1.35001 0.270009 4.04001 0.0400085C4.28001 0.0100085 4.53001 0 4.79001 0L11.19 0C14.38 0 15.98 1.60001 15.98 4.79001L15.98 8.79001Z"
                    id="Vector"
                    fill="none"
                    stroke="#f4f4f4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                />
            </g>
            <path
                d="M21.98 10.79C21.98 13.73 20.63 15.31 17.94 15.54C17.97 15.3 17.98 15.05 17.98 14.79L17.98 10.79C17.98 7.60001 16.38 6 13.19 6L6.79004 6C6.53004 6 6.28004 6.01001 6.04004 6.04001C6.27004 3.35001 7.86004 2 10.79 2L17.19 2C20.38 2 21.98 3.60001 21.98 6.79001L21.98 10.79Z"
                id="Vector"
                fill="none"
                stroke="#f4f4f4"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <path
                d="M24 0L24 24L0 24L0 0L24 0Z"
                id="Vector"
                fill="none"
                fill-rule="evenodd"
                stroke="none"
            />
            <path
                d="M13.4955 13.25L13.5045 13.25"
                id="Vector"
                fill="none"
                fill-rule="evenodd"
                stroke="#f4f4f4"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <path
                d="M9.9955 13.25L10.0045 13.25"
                id="Vector"
                fill="none"
                fill-rule="evenodd"
                stroke="#f4f4f4"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
            <path
                d="M6.4955 13.25L6.5045 13.25"
                id="Vector"
                fill="none"
                fill-rule="evenodd"
                stroke="#f4f4f4"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
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
