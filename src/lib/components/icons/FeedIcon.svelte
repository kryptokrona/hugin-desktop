<script>
  import { run } from 'svelte/legacy';

    import { page } from '$app/stores'
    import { fade } from 'svelte/transition'
    import { feed } from '$lib/stores/user.js'
    
    let thispage = $derived($page.url.pathname === '/feed')
    let unread = $state(false)
    
    run(() => {
    if ($feed.new.length) {
          unread = true
      } else {
          unread = false
      }
  });
    </script>
    
    {#if thispage}
        <div class="dot" in:fade|global></div>
    {/if}
    
    {#if unread}
        <div class="unread" in:fade|global></div>
    {/if}

    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 14.75C10.48 14.75 9.25 13.52 9.25 12C9.25 10.48 10.48 9.25 12 9.25C13.52 9.25 14.75 10.48 14.75 12C14.75 13.52 13.52 14.75 12 14.75ZM12 10.75C11.31 10.75 10.75 11.31 10.75 12C10.75 12.69 11.31 13.25 12 13.25C12.69 13.25 13.25 12.69 13.25 12C13.25 11.31 12.69 10.75 12 10.75Z" fill="var(--text-color)"/>
      <path d="M20.0003 18.75C19.8403 18.75 19.6903 18.7 19.5503 18.6C19.2203 18.35 19.1503 17.88 19.4003 17.55C20.6103 15.94 21.2503 14.02 21.2503 12C21.2503 9.98004 20.6103 8.06005 19.4003 6.45005C19.1503 6.12005 19.2203 5.65003 19.5503 5.40003C19.8803 5.15003 20.3503 5.22002 20.6003 5.55002C22.0103 7.42002 22.7503 9.65004 22.7503 12C22.7503 14.35 22.0103 16.58 20.6003 18.45C20.4503 18.65 20.2303 18.75 20.0003 18.75Z" fill="var(--text-color)"/>
      <path d="M4 18.75C3.77 18.75 3.54999 18.65 3.39999 18.45C1.98999 16.58 1.25 14.35 1.25 12C1.25 9.65004 1.98999 7.42002 3.39999 5.55002C3.64999 5.22002 4.12001 5.15003 4.45001 5.40003C4.78001 5.65003 4.85001 6.12005 4.60001 6.45005C3.39001 8.06005 2.75 9.98004 2.75 12C2.75 14.02 3.39001 15.94 4.60001 17.55C4.85001 17.88 4.78001 18.35 4.45001 18.6C4.32001 18.7 4.16 18.75 4 18.75Z" fill="var(--text-color)"/>
      <path d="M16.801 16.3499C16.641 16.3499 16.4911 16.2999 16.3511 16.1999C16.0211 15.9499 15.9511 15.4799 16.2011 15.1499C16.8911 14.2399 17.251 13.1499 17.251 11.9999C17.251 10.8499 16.8911 9.75994 16.2011 8.84994C15.9511 8.51994 16.0211 8.04992 16.3511 7.79992C16.6811 7.54992 17.151 7.61995 17.401 7.94995C18.281 9.12995 18.751 10.5299 18.751 11.9999C18.751 13.4699 18.281 14.8799 17.401 16.0499C17.251 16.2499 17.031 16.3499 16.801 16.3499Z" fill="var(--text-color)"/>
      <path d="M7.20001 16.3499C6.97001 16.3499 6.75001 16.2499 6.60001 16.0499C5.72001 14.8699 5.25 13.4699 5.25 11.9999C5.25 10.5299 5.72001 9.11995 6.60001 7.94995C6.85001 7.61995 7.31999 7.54992 7.64999 7.79992C7.97999 8.04992 8.04999 8.51994 7.79999 8.84994C7.10999 9.75994 6.75 10.8499 6.75 11.9999C6.75 13.1499 7.10999 14.2399 7.79999 15.1499C8.04999 15.4799 7.97999 15.9499 7.64999 16.1999C7.51999 16.2999 7.36001 16.3499 7.20001 16.3499Z" fill="var(--text-color)"/>
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
        background-color: var(--success-color);
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