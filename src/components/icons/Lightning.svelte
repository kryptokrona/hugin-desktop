<script>
  export let connected
  export let connecting

  $: if(connected) connecting = false

</script>

<svg class:blink_me={connecting} on:click width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
    <g id="vuesaxlinearflash">
      <g id="vuesaxlinearflash">
        <g id="flash">
          <path class:green={connected} class:yellow={connecting} d="M12.4099 13.28L12.4099 20.48C12.4099 21.54 13.7299 22.04 14.4299 21.24L21.9999 12.64C22.6599 11.89 22.1299 10.72 21.1299 10.72L18.0399 10.72L18.0399 3.51997C18.0399 2.45997 16.7199 1.95997 16.0199 2.75997L8.44994 11.36C7.79994 12.11 8.32994 13.28 9.31993 13.28L12.4099 13.28Z" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M24 0L24 24L0 24L0 0L24 0Z" id="Vector" fill="none" fill-rule="evenodd" stroke="none" />
        </g>
      </g>
    </g>
  </svg>

  <style lang="scss">
    svg {
        transition: 200ms ease-in-out;
        cursor: pointer;
        margin-left: -5px;
        &:hover {
            opacity: 80%;
        }
    }

    .yellow {
      stroke: var(--alert-color);
    }

    .green {
      stroke: var(--success-color);
      fill: var(--success-color);
    }
    </style>