<script>
import { createEventDispatcher } from 'svelte/internal'

const dispatch = createEventDispatcher()
let color = '#f5f5f5'

const iconGlow = () => {
    color = '#4dbb45'
    let timer = setTimeout(function () {
        color = '#f5f5f5'
    }, 900)

    dispatch('copy')
}
</script>

<svg
    on:click="{iconGlow}"
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns="http://www.w3.org/2000/svg"
>
    <g id="vuesaxlinearlock">
        <g id="vuesaxlinearlock">
            <g id="lock">
                <path
                    d="M6 10L6 8C6 4.69 7 2 12 2C17 2 18 4.69 18 8L18 10"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M7 22C3 22 2 21 2 17L2 15C2 11 3 10 7 10L17 10C21 10 22 11 22 15L22 17C22 21 21 22 17 22L7 22Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M24 0L24 24L0 24L0 0L24 0Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="none"></path>
                <path
                    d="M15.9965 16L16.0054 16"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M11.9955 16L12.0045 16"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M7.99451 16L8.00349 16"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
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
</style>
