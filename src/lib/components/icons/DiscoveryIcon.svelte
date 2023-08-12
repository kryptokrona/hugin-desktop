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
    <title>vuesax/twotone/global-search</title>
    <g id="Two-Tone" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="Location" transform="translate(-685.25, -189.25)">
            <g id="global-search" transform="translate(684, 188)">
                <g
                    id="Group"
                    transform="translate(2, 2)"
                    fill-rule="nonzero"
                    stroke="#f4f4f4"
                    stroke-dasharray="0,0"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5">
                    <path
                        d="M20,10 C20,4.48000002 15.52,0 10,0 C4.48000002,0 0,4.48000002 0,10 C0,15.52 4.48000002,20 10,20"
                        id="Vector"></path>
                    <g id="Group-515" opacity="0.400000006" transform="translate(1, 1)">
                        <path
                            d="M4.99960941,0 L5.99960947,0 C4.04960942,5.84000015 4.04960942,12.1599998 5.99960947,18 L4.99960941,18"
                            id="Vector"></path>
                        <path
                            d="M12,0 C12.97,2.92000008 13.4600067,5.96000004 13.4600067,9"
                            id="Vector"></path>
                        <path
                            d="M0,13 L0,12 C2.92000008,12.97 5.96000004,13.460022 9,13.460022"
                            id="Vector"></path>
                        <path
                            d="M0,6.00009775 C5.84000015,4.0500977 12.1599998,4.0500977 18,6.00009775"
                            id="Vector"></path>
                    </g>
                </g>
                <path
                    d="M18.1999969,21.4000244 C16.4326857,21.4000244 15,19.9673234 15,18.2000122 C15,16.432701 16.4326857,15 18.1999969,15 C19.9673082,15 21.3999939,16.432701 21.3999939,18.2000122 C21.3999939,19.9673234 19.9673082,21.4000244 18.1999969,21.4000244 Z"
                    id="Vector"
                    stroke="#f4f4f4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"></path>
                <line
                    x1="22"
                    y1="22"
                    x2="21"
                    y2="21"
                    id="Vector"
                    stroke="#f4f4f4"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-dasharray="0,0"></line>
                <path
                    d="M24,0 L24,24 L0,24 L0,0 L24,0 Z"
                    id="Vector"
                    opacity="0"
                    transform="translate(12, 12) rotate(-180) translate(-12, -12)"></path>
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
