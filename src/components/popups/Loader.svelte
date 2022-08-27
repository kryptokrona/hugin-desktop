<script>
  //To handle true and false, or in this case show and hide.
  import { fade, fly } from "svelte/transition";
  import { onMount } from "svelte";
  import { Moon } from "svelte-loading-spinners";


</script>

<div in:fade="{{duration: 100}}" out:fade="{{duration: 170}}" class="backdrop" on:click|self>

  <div class="card">
    <p in:fade="{{duration: 170}}">Loading Account...</p>
    <Moon color="var(--title-color)" size="30" unit="px" />
  </div>

</div>
<style lang="scss">
  .card {
    box-sizing: border-box;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    padding: 20px;
    border-radius: 0.4rem;
    width: 300px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    @media only screen and (max-width: 1000px) {
      max-width: 100%;
    }

  }

  p {
    margin: 0;
    color: var(--title-color);
  }

  .backdrop {
    display: flex;
    justify-content: center;
    align-items: center;
    position: fixed;
    width: 100%;
    height: 100%;
    background-color: rgba(10, 10, 10, 0.8);
    -webkit-backdrop-filter: blur(9px);
    backdrop-filter: blur(9px);
    margin-right: 85px;
    z-index: 101;
  }

  .wrapper {
    width: 100%;
  }

  h4 {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    margin-left: 4px;
  }

  .key {
    background-color: rgba(255, 255, 255, 0.2);
  }
</style>
