<script>
    import { run, createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
import { videoSettings } from '$lib/stores/mediasettings'
let color = $state('#f5f5f5')
    /** @type {{voice: any, size?: string}} */
    let { voice, size = "24px" } = $props();

run(() => {
        if ($videoSettings.myVideo && $videoSettings.screenshare && !voice) {
        color = '#4dbb45'
    } else if (!$videoSettings.screenshare && !voice) {
        color = 'var(--text-color)'
    }
    });
</script>

<svg
    onclick={bubble('click')}
    version="1.1"
    width={size}
    height={size}
    viewBox="0 0 22.0 22.0"
    xmlns="http://www.w3.org/2000/svg"
    xmlns:xlink="http://www.w3.org/1999/xlink"
>
    <defs>
        <clipPath id="110100104481219910650104107">
            <path d="M880,0 L880,555 L0,555 L0,0 L880,0 Z"></path>
        </clipPath>
    </defs>
    <g transform="translate(-429.0 -189.0)">
        <g clip-path="url(#110100104481219910650104107)">
            <g transform="translate(428.0 188.0)">
                <g transform="translate(2.0 2.0)">
                    <path
                        d="M15.5499992,0 C19.1099992,0 20,0.890000105 20,4.44000006 L20,10.7700005 C20,14.3300004 19.1099994,15.2100821 15.5599995,15.2100821 L4.44000006,15.2100821 C0.890000105,15.2199991 0,14.3299997 0,10.7799997 L0,4.44000006 C0,0.890000105 0.890000105,0 4.44000006,0 L15.5499992,0 Z"
                        stroke="{color}"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray=" 0.0 0.0"></path>
                </g>
                <g transform="translate(12.0 17.219970703125)">
                    <path
                        d="M0,0 L0,4.78000069"
                        stroke="{color}"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray=" 0.0 0.0"></path>
                </g>
                <g transform="translate(2.0 13.0)">
                    <path
                        d="M0,0 L20,0"
                        stroke="{color}"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray=" 0.0 0.0"></path>
                </g>
                <g transform="translate(7.5 22.0)">
                    <path
                        d="M0,0 L9,0"
                        stroke="{color}"
                        stroke-width="1.5"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-dasharray=" 0.0 0.0"></path>
                </g>
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
