<script>
import { page } from "$app/stores"
import { fade } from "svelte/transition"

$: thispage = $page.url.pathname === '/dashboard'


</script>

{#if thispage}
    <div class="dot" in:fade></div>
{/if}

<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <rect width="24" height="24" id="artboard_1" />
      <clipPath id="clip_1">
        <use xlink:href="#artboard_1" clip-rule="evenodd" />
      </clipPath>
    </defs>
    <g id="vuesaxlinearhouse" clip-path="url(#clip_1)">
      <g id="vuesaxlinearhouse" artboard="eed04435-f0a9-47b4-861e-2f48a4f3e291">
        <g id="house">
          <path d="M2 22L22 22" id="Vector" fill="none" fill-rule="evenodd" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M2.94995 22L2.99995 9.96999C2.99995 9.35999 3.28995 8.78004 3.76995 8.40004L10.77 2.95003C11.49 2.39003 12.4999 2.39003 13.2299 2.95003L20.23 8.39003C20.72 8.77003 21 9.34999 21 9.96999L21 22" id="Vector" fill="none" stroke="#f5f5f5" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M11 17C10.17 17 9.5 17.67 9.5 18.5L9.5 22L14.5 22L14.5 18.5C14.5 17.67 13.83 17 13 17L11 17Z" id="Vector" fill="none" stroke="#f5f5f5" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M7.5 13.75C6.95 13.75 6.5 13.3 6.5 12.75L6.5 11.25C6.5 10.7 6.95 10.25 7.5 10.25L9.5 10.25C10.05 10.25 10.5 10.7 10.5 11.25L10.5 12.75C10.5 13.3 10.05 13.75 9.5 13.75L7.5 13.75Z" id="Vector" fill="none" stroke="#f5f5f5" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M14.5 13.75C13.95 13.75 13.5 13.3 13.5 12.75L13.5 11.25C13.5 10.7 13.95 10.25 14.5 10.25L16.5 10.25C17.05 10.25 17.5 10.7 17.5 11.25L17.5 12.75C17.5 13.3 17.05 13.75 16.5 13.75L14.5 13.75Z" id="Vector" fill="none" stroke="#f5f5f5" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M19.0001 7L18.9701 4L14.5701 4" id="Vector" fill="none" stroke="#f5f5f5" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
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