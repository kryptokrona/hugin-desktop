<script>
    export let grey = false
    export let red = false
    export let yellow = false
    export let blink = false
    let color = 'var(--text-color)'

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

<svg on:click class:blink_me={blink} width="22px" height="22px" viewBox="0 0 22 22" version="1.1"
     xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="Linear" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="Essetional" transform="translate(-429.000000, -253.000000)">
            <g id="danger" transform="translate(428.000000, 252.000000)">
                <line class:blicnkcolor={blink} x1="12" y1="9" x2="12" y2="14" id="Vector" stroke={color}
                      stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0,0"></line>
                <path class:blicnkcolor={blink}
                      d="M5.94005489,21.4100285 C2.47005486,21.4100285 1.02005494,18.9300292 2.70005488,15.9000292 L5.82005501,10.2800293 L8.76005507,5.00002933 C10.540055,1.79002929 13.4600551,1.79002929 15.2400551,5.00002933 L18.1800556,10.2900295 L21.3000546,15.9100294 C22.9800545,18.9400294 21.5200548,21.4200287 18.0600548,21.4200287 L12.0000553,21.4200287 L12.0000553,21.4100285 L5.94005489,21.4100285 Z"
                      id="Vector" stroke={color} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
                      stroke-dasharray="0,0" fill-rule="nonzero"></path>
                <line class:blicnkcolor={blink} x1="11.9945068" y1="17" x2="12.0034888" y2="17" id="Vector"
                      stroke={color} stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                      stroke-dasharray="0,0"></line>
                <path class:blicnkcolor={blink} d="M24,0 L24,24 L0,24 L0,0 L24,0 Z" id="Vector" opacity="0"></path>
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