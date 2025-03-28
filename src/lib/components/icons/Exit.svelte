<script>
    let {
    onRemove
    } = props()
let color = '#f5f5f5'

const iconGlow = () => {
    color = 'red'
    let timer = setTimeout(function () {
        color = '#f5f5f5'
    }, 900)

    onRemove()
}
</script>

<svg
    onclick={iconGlow}
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns="http://www.w3.org/2000/svg"
>
    <g id="vuesaxlinearclose-square">
        <g id="vuesaxlinearclose-square">
            <g id="close-square">
                <path
                    d="M9.16998 14.83L14.83 9.17004"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M14.83 14.83L9.16998 9.17004"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M15 22C20 22 22 20 22 15L22 9C22 4 20 2 15 2L9 2C4 2 2 4 2 9L2 15C2 20 4 22 9 22L15 22Z"
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
</style>
