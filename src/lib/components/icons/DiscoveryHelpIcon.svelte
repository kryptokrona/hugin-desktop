<script>
import { page } from '$app/stores'

let thispage
$: thispage = $page.url.pathname === '/discovery'
</script>

<svg
    on:click
    width="24px"
    height="24px"
    viewBox="0 0 24 24"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink">
    <title>vuesax/twotone/message-question</title>
    <g id="Two-Tone" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="Support,-Like,-Question" transform="translate(-621.25, -253.6802)">
            <g id="message-question" transform="translate(620, 252)">
                <path
                    d="M13,18.4302368 L8.54998779,21.3901978 C7.88998777,21.8301978 7,21.3602417 7,20.5602417 L7,18.4302368 C4,18.4302368 2,16.4302368 2,13.4302368 L2,7.43017578 C2,4.43017578 4,2.43017578 7,2.43017578 L17,2.43017578 C20,2.43017578 22,4.43017578 22,7.43017578 L22,13.4302368 C22,16.4302368 20,18.4302368 17,18.4302368 L13,18.4302368 Z"
                    id="Vector"
                    stroke="#f4f4f4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"
                    fill-rule="nonzero"></path>
                <path
                    d="M11.9998169,11.3598633 L11.9998169,11.1499023 C11.9998169,10.4699023 12.4198438,10.1098852 12.8398438,9.81988525 C13.2498437,9.53988525 13.65979,9.17989749 13.65979,8.51989746 C13.65979,7.59989744 12.9198169,6.85986328 11.9998169,6.85986328 C11.0798169,6.85986328 10.3398438,7.59989744 10.3398438,8.51989746"
                    id="Vector"
                    stroke="#f4f4f4"
                    stroke-width="1.5"
                    opacity="0.400000006"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"
                    fill-rule="nonzero"></path>
                <path d="M24,0 L24,24 L0,24 L0,0 L24,0 Z" id="Vector" opacity="0"></path>
                <line
                    x1="11.9955"
                    y1="13.75"
                    x2="12.0045"
                    y2="13.75"
                    id="Vector"
                    stroke="#f4f4f4"
                    stroke-width="1.5"
                    opacity="0.400000006"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"></line>
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
