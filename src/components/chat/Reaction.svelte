<script>
import {fade} from 'svelte/transition'
import {createEventDispatcher, onMount} from "svelte";

const dispatch = createEventDispatcher()

export let reacts
export let reactCount = 0
export let thisReaction
export let emoji
export let react = false
export let counter = false
let filterReactions = []
let hoverReaction = false
let filterReactors = []

$: filterReactions = reacts.filter(a => a.m == thisReaction.m)

$: if (filterReactions.length > 0) {
  let reactor = {}
  filterReactors = filterReactions.filter(r => !reactor[r.k] && (reactor[r.k] = true))
  reactCount = filterReactors.length
}

const sendReaction = () => {
  dispatch('sendReaction', {
    msg: thisReaction.m,
    brd: thisReaction.brd,
    reply: thisReaction.r,
  })
  console.log('sending reaction');
}

$: reactCount

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

{#if filterReactions.length > 1}
  <p class="count">{reactCount}</p>
{/if}

{#if hoverReaction}
<div class="reactors">
 {#each filterReactors as reactors}
      <p class="reactor">{reactors.n}</p>
 {/each}
 </div>
{/if}

</div>


<style>

.reaction {
  cursor: pointer;
  margin-left: 7px;
}

.hoverReactions {
    background: white !important;
    color: black;
}
.reactors {
  color: black;
  border-radius: 5px;
  display: flex;
  width: min-content;
  position: absolute;
}

.reactor {
  color: black;
  font-family: "Roboto Mono";
  background: white;
  color: black;
  border-radius: 2px;
  font-size: 11px;
  display: inline-block;
  margin-top: 5px;
  width: fit-content;
  display: block;
  padding: 2px;
  margin-right: 2px;
}

.count {
  font-family: "Montserrat";
  font-size: 10px;
  display: table-row;
  color: white;
}
</style>
