<script>
    /** @type {{size?: number}} */
    let { size = 24 } = $props();
</script>

<svg
    width="{size}px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
>
    <g id="vuesaxlinearexport">
        <g id="vuesaxlinearexport">
            <g id="export">
                <path
                    d="M13 11L21.2 2.80005"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M22 6.8L22 2L17.2 2"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M11 2L9 2C4 2 2 4 2 9L2 15C2 20 4 22 9 22L15 22C20 22 22 20 22 15L22 13"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M1.90735e-06 24L0 0L24 -1.90735e-06L24 24L1.90735e-06 24Z"
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
