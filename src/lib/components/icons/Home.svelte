<script>
import { page } from "$app/stores"
import { fade } from "svelte/transition"

$: thispage = $page.url.pathname === '/dashboard'


</script>

{#if thispage}
    <div class="dot" in:fade></div>
{/if}

<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
    <g id="vuesaxlinearelement-equal">
      <g id="vuesaxlinearelement-equal">
        <g id="element-equal">
          <path d="M22 4.23C22 2.64 21.36 2 19.77 2L15.73 2C14.14 2 13.5 2.64 13.5 4.23L13.5 8.27C13.5 9.86 14.14 10.5 15.73 10.5L19.77 10.5C21.36 10.5 22 9.86 22 8.27L22 4.23Z" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M10.5 3.98C10.5 2.57 9.86 2 8.27 2L4.23 2C2.64 2 2 2.57 2 3.98L2 8.51C2 9.93 2.64 10.49 4.23 10.49L8.27 10.49C9.86 10.5 10.5 9.93 10.5 8.52L10.5 3.98Z" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M10.5 15.73C10.5 14.14 9.86 13.5 8.27 13.5L4.23 13.5C2.64 13.5 2 14.14 2 15.73L2 19.77C2 21.36 2.64 22 4.23 22L8.27 22C9.86 22 10.5 21.36 10.5 19.77L10.5 15.73Z" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M15 15.5L21 15.5" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" />
          <path d="M15 19.5L21 19.5" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" />
          <path d="M24 0L24 24L0 24L0 0L24 0Z" id="Vector" fill="none" fill-rule="evenodd" stroke="none" />
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
    </style>