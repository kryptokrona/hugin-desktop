<script>
let color = '#f5f5f5'

const iconGlow = () => {
    color = '#4dbb45'
    let timer = setTimeout(function () {
        color = '#f5f5f5'
    }, 200)
}
</script>

<svg
    on:click="{iconGlow}"
    width="22px"
    height="22px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns="http://www.w3.org/2000/svg"
>
    <g id="vuesaxlinearuser-add">
        <g id="vuesaxlinearuser-add">
            <g id="user-add">
                <path
                    d="M12 12C9.23858 12 7 9.76142 7 7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7C17 9.76142 14.7614 12 12 12Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M3.40991 22C3.40991 18.13 7.25991 15 11.9999 15C12.9599 15 13.8899 15.13 14.7599 15.37"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M21.88 18.93C21.79 19.33 21.63 19.72 21.42 20.06C20.73 21.22 19.46 22 18 22C16.97 22 16.04 21.61 15.34 20.97C15.04 20.71 14.78 20.4 14.58 20.06C14.21 19.46 14 18.75 14 18C14 16.92 14.43 15.93 15.13 15.21C15.86 14.46 16.88 14 18 14C19.18 14 20.25 14.51 20.97 15.33C21.61 16.04 22 16.98 22 18C22 18.32 21.96 18.63 21.88 18.93Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="{color}"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <g id="Group" transform="translate(16.51001 16.52002)">
                    <path
                        d="M2.97998 1.45996L0 1.45996"
                        id="Vector"
                        fill="none"
                        fill-rule="evenodd"
                        stroke="{color}"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"></path>
                    <path
                        d="M1.48999 0L1.48999 2.98999"
                        id="Vector"
                        fill="none"
                        fill-rule="evenodd"
                        stroke="{color}"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"></path>
                </g>
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
