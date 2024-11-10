<script>
import { videoSettings } from '$lib/stores/mediasettings'

export let grid = false
export let menu = false

let color = '#f5f5f5'

$: if ($videoSettings.myVideo && !$videoSettings.screenshare && grid) {
    color = '#4dbb45'
} else if ($videoSettings.screenshare || !$videoSettings.myVideo) {
    color = '#f5f5f5'
}
</script>

<svg
    on:click
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns="http://www.w3.org/2000/svg"
>
    <defs>
        <rect width="24" height="24" id="artboard_1"></rect>
        <clipPath id="clip_1">
            <use xlink:href="#artboard_1" clip-rule="evenodd"></use>
        </clipPath>
    </defs>
    <g id="vuesaxlinearvideo" clip-path="url(#clip_1)">
        <g id="vuesaxlinearvideo" artboard="8bc6873d-314a-42b3-b428-7161aebe88d9">
            <g id="video">
                <path
                    d="M6.21 20.4201C3.05 20.4201 2 18.3201 2 16.2101L2 7.79008C2 4.63008 3.05 3.58008 6.21 3.58008L12.53 3.58008C15.69 3.58008 16.74 4.63008 16.74 7.79008L16.74 16.2101C16.74 19.3701 15.68 20.4201 12.53 20.4201L6.21 20.4201Z"
                    id="Vector"
                    fill="none"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M16.74 15.1499L16.74 8.83989L19.52 6.88989C20.88 5.93989 22 6.51989 22 8.18989L22 15.8099C22 17.4799 20.88 18.0599 19.52 17.0999L16.74 15.1499Z"
                    id="Vector"
                    fill="none"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M11.5 11C10.6716 11 10 10.3284 10 9.5C10 8.67157 10.6716 8 11.5 8C12.3284 8 13 8.67157 13 9.5C13 10.3284 12.3284 11 11.5 11Z"
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
