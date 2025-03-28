<script>
    import { createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
</script>

<svg
    onclick={bubble('click')}
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
>
    <g id="vuesaxlinearadd-circle">
        <g id="vuesaxlinearadd-circle">
            <g id="add-circle">
                <path
                    d="M22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22C17.5 22 22 17.5 22 12Z"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M8 12L16 12"
                    id="Vector"
                    fill="none"
                    fill-rule="evenodd"
                    stroke="var(--text-color)"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"></path>
                <path
                    d="M12 16L12 8"
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
