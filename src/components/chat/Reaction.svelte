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
  margin-left: 10px;
  width: max-content;
  display: contents;
  position: relative;
}

.hoverReactions {
    background: white !important;
    color: black;
}
.reactors {
  color: black;
  border-radius: 5px;
  width: max-content;
  display: inline;
  margin-top: 20px;
  margin-left: -30px;
  position: absolute;
}

.reactor {
  font-family: "Roboto Mono";
  background: white;
  color: black;
  border-radius: 2px;
  padding: 3px;
  margin-right: 2px;
  font-size: 11px;
  display: inline-block;
  margin-top: 5px;
  width: max-content;
  position: relative;
}

.count {
  font-family: "Montserrat";
  font-size: 10px;
  display: inline;
  color: white;
}
</style>
