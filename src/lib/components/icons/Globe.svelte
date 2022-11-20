<script>
export let grey = true
export let red
export let yellow
export let blink
let color

$: {
    if (red) {
        color = 'var(--warn-color)'
    } else if (yellow) {
        color = 'var(--alert-color)'
    } else if (grey) {
        color = 'var(--text-color)'
    }
}
</script>

<svg
    class:blink_me="{blink}"
    on:click
    style="cursor: pointer"
    width="22px"
    height="22px"
    viewBox="0 0 22 22"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
>
    <g id="Linear" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="Location" transform="translate(-173.000000, -253.000000)">
            <g id="global" transform="translate(172.000000, 252.000000)">
                <path
                    d="M12,22 C6.47715235,22 2,17.5228477 2,12 C2,6.47715235 6.47715235,2 12,2 C17.5228477,2 22,6.47715235 22,12 C22,17.5228477 17.5228477,22 12,22 Z"
                    id="Vector"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"></path>
                <path
                    d="M7.99997562,3 L8.99997568,3 C7.04997563,8.84000015 7.04997563,15.1599998 8.99997568,21 L7.99997562,21"
                    id="Vector"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"
                    fill-rule="nonzero"></path>
                <path
                    d="M15,3 C16.95,8.84000015 16.95,15.1599998 15,21"
                    id="Vector"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"
                    fill-rule="nonzero"></path>
                <path
                    d="M3,16 L3,15 C8.84000015,16.95 15.1599998,16.95 21,15 L21,16"
                    id="Vector"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"
                    fill-rule="nonzero"></path>
                <path
                    d="M3,9.00009775 C8.84000015,7.0500977 15.1599998,7.0500977 21,9.00009775"
                    id="Vector"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"
                    fill-rule="nonzero"></path>
                <path
                    d="M24,0 L24,24 L0,24 L0,0 L24,0 Z"
                    id="Vector"
                    opacity="0"
                    transform="translate(12.000000, 12.000000) rotate(-180.000000) translate(-12.000000, -12.000000) "
                ></path>
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
