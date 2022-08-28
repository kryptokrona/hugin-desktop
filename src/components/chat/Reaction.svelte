<script>
  import { fade } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";

  const dispatch = createEventDispatcher();

  export let reacts = [];
  export let reactCount = 0;
  export let thisReaction;
  export let emoji;
  export let react = false;
  export let counter = false;
  let filterReactions = [];
  let hoverReaction = false;
  let filterReactors = [];

  $: if (reacts.length) filterReactions = reacts.filter(a => a.m == thisReaction.m);

  $: if (filterReactions.length > 0) {
    let reactor = {};
    filterReactors = filterReactions.filter(r => !reactor[r.k] && (reactor[r.k] = true));
    reactCount = filterReactors.length;
  }

  const sendReaction = () => {
    dispatch("sendReaction", {
      msg: thisReaction.m,
      brd: thisReaction.brd,
      reply: thisReaction.r
    });
    console.log("sending reaction");
  };

  $: reactCount;

</script>

<div class="reaction" on:click={sendReaction}>{thisReaction.m}
  {#if filterReactions.length >= 1}
    <p class="count">{reactCount}</p>
  {/if}

  <!--
  <div class="reactors">
    {#each filterReactors as reactors}
      <p class="reactor">{reactors.n}</p>
    {/each}
  </div>
  -->

</div>


<style lang="scss">

  .reaction {
    display: flex;
    align-items: center;
    height: 20px;
    gap: 8px;
    padding: 0 10px 0 5px;
    cursor: pointer;
    background-color: var(--card-border);
    border-radius: 20px;

/*    .reactors {
      display: none;
    }

    &:hover {
      .reactors {
        display: block;
      }
    }*/
  }

  .reactor {
    font-family: "Roboto Mono", monospace;
    color: white;
    border-radius: 2px;
    font-size: 11px;
    display: inline-block;
  }

  .count {
    font-family: "Montserrat";
    font-size: 10px;
    display: inline;
    color: white;
  }
</style>
