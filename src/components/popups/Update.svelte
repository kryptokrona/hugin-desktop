<script>
  import { onMount, onDestroy } from "svelte";
  import { notify } from "$lib/stores/user.js";
  import { fade, fly } from "svelte/transition";
  import { cubicOut, cubicIn } from "svelte/easing";
  import { createEventDispatcher } from "svelte";
  import { get_avatar } from "$lib/utils/hugin-utils.js";
  import GreenButton from "$components/buttons/GreenButton.svelte";

  const dispatch = createEventDispatcher();
  let timer;
  export let updates;
  export let platform;

  onMount(() =>

    timer = setTimeout(function() {
      hideNotification(updates.hash);
    }, 20 * 1000)
  );
  onDestroy(() => {
    clearTimeout(timer);
    hideNotification();
  });

  function hideNotification(id) {
    dispatch("hide", {
      hash: updates.hash
    });
  }

  function update() {
    window.api.send("update", platform);
    console.log("update!");
  }

</script>

<div in:fly="{{x: 200, duration:200, easing: cubicOut}}" out:fly="{{y: -200, duration: 200, easing: cubicIn}}" class="card">
    <div class="header">
      <img src="/icon.png" width="20px" height="20px" alt="">
      <h3>Update available!</h3>
    </div>
    <div class="buttons">
      <GreenButton text="Update" on:click={update} />
      <h4 on:click={hideNotification}>Later</h4>
    </div>
</div>

<style lang="scss">
    .card {
        display: flex;
        padding: 1rem;
        gap: 1rem;
        flex-direction: column;
        justify-content: space-between;
        border-radius: 5px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 99999;
        background-color: #111111;
    }

    .buttons {
        display: flex;
      align-items: center;
      gap: 1rem;

        p {
        margin: 0;
        }
    }

    .header {
        display: flex;
        gap: 0.5rem;
    }

</style>