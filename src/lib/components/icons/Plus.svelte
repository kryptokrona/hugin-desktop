<script>
    import { createBubbler } from 'svelte/legacy';
    const bubble = createBubbler();
</script>

<svg
    onclick={bubble('click')}
    version="1.1"
    width="22px"
    height="22px"
    viewBox="0 0 22.0 22.0"
    xmlns="http://www.w3.org/2000/svg"
>
    <defs>
        <clipPath id="4511112010810611210611010753">
            <path d="M880,0 L880,886 L0,886 L0,0 L880,0 Z"></path>
        </clipPath>
        <clipPath id="5597117971131051059810097">
            <path d="M705,0 L705,73 L0,73 L0,0 L705,0 Z"></path>
        </clipPath>
    </defs>
    <g transform="translate(-621.0 -253.0)">
        <g clip-path="url(#4511112010810611210611010753)">
            <g transform="translate(620.0 252.0)">
                <g transform="translate(8.0 12.0)">
                    <path
                        d="M0,0 L8,0"
                        stroke="var(--text-color)"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray=" 0.0 0.0"></path>
                </g>
                <g transform="translate(12.0 8.0)">
                    <path
                        d="M0,8 L0,0"
                        stroke="var(--text-color)"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray=" 0.0 0.0"></path>
                </g>
                <g transform="translate(2.0 2.0)">
                    <path
                        d="M13,20 C18,20 20,18 20,13 L20,7 C20,2 18,0 13,0 L7,0 C2,0 0,2 0,7 L0,13 C0,18 2,20 7,20 L13,20 Z"
                        stroke="var(--text-color)"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray=" 0.0 0.0"></path>
                </g>
            </g>
            <g transform="translate(86.0 227.0)">
                <g clip-path="url(#5597117971131051059810097)">
                    <polygon
                        points="0,0 705,0 705,73 0,73 0,0 0,0"
                        stroke="var(--text-color)"
                        stroke-width="6"
                        fill="none"
                        stroke-miterlimit="5"></polygon>
                </g>
            </g>
        </g>
    </g>
</svg>

<style lang="scss">
    svg {
        transition: 200ms ease-in-out;
        cursor: pointer;
        -webkit-app-region: no-drag;
        pointer-events: auto;
        &:hover {
            opacity: 80%;
        }
        
    }
</style>
    
