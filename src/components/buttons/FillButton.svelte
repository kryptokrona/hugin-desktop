<script>
    import {Moon} from "svelte-loading-spinners";

    export let text = 'Text'
    export let enabled = false
    export let rgb = false
    export let info = false
    export let disabled
    export let loading
</script>

<button disabled="{disabled}" on:click class:enabled class:info class:border_rgb="{rgb}">
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

    &:hover {
      background-color: var(--card-border);
    }
  }

  .enabled {
    background-color: #3fd782;
    border-color: #63e79f;
    color: #ffffff;
    font-size: 1rem;
    text-shadow:  0 0 1px black;
    font-weight: 600;

    &:hover {
      background-color: #63e79f;
    }
  }

  .info {
    background: #5f86f2;
    border: 1px solid #83a4ff;
    color: white;

    &:hover {
      background-color: #83a4ff;
    }
  }
</style>
