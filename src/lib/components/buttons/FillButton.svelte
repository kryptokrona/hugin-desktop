<script>
    import { createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
    import {Moon} from "svelte-loading-spinners";

    /** @type {{text?: string, enabled?: boolean, rgb?: boolean, info?: boolean, disabled: any, loading: any, red?: boolean}} */
    let {
        text = 'Text',
        enabled = false,
        rgb = false,
        info = false,
        disabled,
        loading,
        red = false
    } = $props();
</script>

<button disabled="{disabled}" class:red={red} onclick={bubble('click')} class:enabled class:info class:border_rgb="{rgb}">
    {#if loading}
        <Moon color="#000000" size="20" unit="px"/>
        {:else}
        {text}
    {/if}
</button>

<style lang="scss">
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: var(--card-background);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    border-radius: 0.4rem;
    height: 40px;
    padding: 0 15px;
    min-width: 100px;
    width: 100%;
    cursor: pointer;
    font-weight: 600;
    font-size: 1rem;
    transition: 250ms ease-in-out;
    font-family: 'Montserrat', sans-serif;
    opacity: 0.9;

    &:hover {
      opacity: 1;
    }
  }

  .red {
    background-color: var(--warn-color) !important;
  }

  .enabled {
    background-color: var(--success-color);
    border-color: var(--border-color);
    color: var(--text-color);
    font-size: 1rem;
    text-shadow:  0 0 1px black;
    font-weight: 600;

    &:hover {
      opacity: 1;
      background-color: #63e79f;
      border-color: var(--success-color);
    }
  }

  .info {
    background: #5f86f2;
    border: 1px solid #83a4ff;
    color: white;

    &:hover {
      opacity: 1;
      background-color: #83a4ff;
    }
  }
</style>
