<script>

    import { createEventDispatcher } from "svelte/internal";

    const dispatch = createEventDispatcher();
    let color = "#f5f5f5"

    const iconGlow = () =>  {
        color = "red"
        let timer = setTimeout(function() {
            color = "#f5f5f5"
    }, 900)

    dispatch('remove')
    }

</script>
<svg on:click={iconGlow} width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
    <g id="vuesaxlineargroup">
      <g id="vuesaxlineargroup">
        <g id="group">
          <path d="M9.10001 2C8.42001 2 7.46 2.4 6.98 2.88L2.88 6.98001C2.4 7.46001 2 8.42001 2 9.10001L2 14.9C2 15.58 2.4 16.54 2.88 17.02L6.98 21.12C7.46 21.6 8.42001 22 9.10001 22L14.9 22C15.58 22 16.54 21.6 17.02 21.12L21.12 17.02C21.6 16.54 22 15.58 22 14.9L22 9.10001C22 8.42001 21.6 7.46001 21.12 6.98001L17.02 2.88C16.54 2.4 15.58 2 14.9 2L9.10001 2Z" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M8.5 15.5L15.5 8.5" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M15.5 15.5L8.5 8.5" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M24 0L24 24L0 24L0 0L24 0Z" id="Vector" fill="none" fill-rule="evenodd" stroke="none" />
        </g>
      </g>
    </g>
  </svg>