<script>
    import { page } from '$app/stores'
    import { fade } from 'svelte/transition'
    import { notify } from '$lib/stores/user.js'
    
    let thispage
    let unread = false
    $: thispage = $page.url.pathname === '/rooms'
    $: if ($notify.unread.some((a) => a.type === 'room')) {
        unread = true
    } else {
        unread = false
    }
    </script>
    
    {#if thispage}
        <div class="dot" in:fade></div>
    {/if}
    
    {#if unread}
        <div class="unread" in:fade></div>
    {/if}

<svg width="24px" height="24px" viewBox="0 0 24 24" version="1.1" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns="http://www.w3.org/2000/svg">
    <g id="vuesaxlinearmessages-3">
      <g id="vuesaxlinearmessages-3">
        <g id="messages-3">
          <path d="M22 11.35C22 12.62 21.58 13.69 20.83 14.43C20.09 15.18 19.02 15.6 17.75 15.6L17.75 17.41C17.75 18.09 16.99 18.5 16.43 18.12L15.46 17.48C15.55 17.17 15.59 16.83 15.59 16.47L15.59 12.4C15.59 10.36 14.23 9 12.19 9L5.39999 9C5.25999 9 5.13 9.01002 5 9.02002L5 6.25C5 3.7 6.7 2 9.25 2L17.75 2C20.3 2 22 3.7 22 6.25L22 11.35Z" id="Vector" fill="none" fill-rule="evenodd" stroke="#f4f4f4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          <path d="M15.59 16.47C15.59 16.83 15.55 17.17 15.46 17.48C15.09 18.95 13.87 19.87 12.19 19.87L9.47 19.87L6.45 21.88C6 22.19 5.39999 21.86 5.39999 21.32L5.39999 19.87C4.37999 19.87 3.53 19.53 2.94 18.94C2.34 18.34 2 17.49 2 16.47L2 12.4C2 10.5 3.18 9.19002 5 9.02002C5.13 9.01002 5.25999 9 5.39999 9L12.19 9C14.23 9 15.59 10.36 15.59 12.4L15.59 16.47Z" id="Vector" fill="none" fill-rule="evenodd" stroke="#f4f4f4" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
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