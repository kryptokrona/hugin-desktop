<script>
import {fade} from 'svelte/transition'
import {createEventDispatcher, onMount} from "svelte";

const dispatch = createEventDispatcher()

export let reacts
export let reactCount
export let thisReaction
export let emoji
export let react = false

let filterReactions = []
let hoverReaction = false

$ : filterReactions = reacts.filter(a => a.m == thisReaction.m)

$ : console.log('filterReactions', filterReactions);

const sendReaction = () => {
  dispatch('sendReaction', {
    reaction: reaction.m,
    brd: reaction.brd,
    reply: reaction.r
  })
  console.log('sending reaction');
}

$ : reactCount

function reactionHover() {
  console.log('hooooover');
  hoverReaction = true
}

function exitHover(){
  console.log('exit reactiion hover');
  hoverReaction = false
}

</script>

<div class="reaction" on:click={sendReaction} on:mouseenter={reactionHover} on:mouseleave={exitHover}>{thisReaction.m}

<!-- {#if hoverReaction} -->
<div class="reactors">
 {#each filterReactions as reactors}
      <p class="reactor">{reactors.n}</p>
 {/each}
 </div>
<!-- {/if} -->

</div>


<style>

.reaction {
  cursor: pointer;
}

.hoverReactions {
    background: white !important;
    color: black;
}
.reactors {
  background: white;
  color: black;
  border-radius: 5px;
  display: flex;
}

.reactor {
  color: black;
  font-family: "Roboto Mono";
}
</style>
