<script>

import { fade } from 'svelte/transition';
import {nodelist} from "$lib/stores/nodes.js";
import {user} from "$lib/stores/user.js";
import GreenButton from "/src/components/buttons/GreenButton.svelte";
import {createEventDispatcher} from "svelte";

const dispatch = createEventDispatcher()

export let node;
export let nodeInput = ''
export let nodeAddress
export let nodePort
export let enableConnect

const switchNode = (node, input=false) => {
  console.log('node', node);
  console.log('input', input);
  //Switch between custom and node list
  if (input) {
      nodeAddress = nodeInput.split(':')[0]
      nodePort = parseInt(nodeInput.split(':')[1])
  } else {
      nodeAddress = node.url
      nodePort = node.port
  }

  dispatch('changeNode', {
      node: 'changed-node',
  })

  window.api.switchNode(nodeAddress + ':' +  nodePort)

  user.update(oldData => {
      return {
          ...oldData,
          node: nodeAddress + ':' +  nodePort
      }
  })
}

$ : console.log('nodeinput', nodeInput);


    $: {
        if (nodeInput.length > 1) {
            //Enable add button
            enableConnect = true

        } else {
          enableConnect = false
        }
    }


</script>

<h3>Nodes</h3>
<div class="nodelist">
{#each $nodelist as node}
<div class="nodes" on:click={()=> switchNode(node)}>
   <h4 class="nodes">{node.name}</h4>
</div>
{/each}
</div>
<br>
<h4>Custom node</h4>
<input placeholder="node:url" type="text" bind:value={nodeInput}>
<GreenButton text="Connect" on:click={()=> switchNode(nodeInput, true)}/>
<style lang="scss">

h1,h2,h3,h4 {
    color: white;
    margin: 0;
    font-family: "Montserrat"
}

h3 {
  font-size: 25px;
  margin-bottom: 15px;
  margin-left: -10px;
}

h4 {
  font-size: 15px;
}


.nodelist {
  height: 50%;
  overflow-x: hidden;
  overflow-y: scroll;
}

.nodes {
  color: #f1f2f3;
  font-family: 'Roboto Mono';
  font-size: 17px;
  padding: 3px;
  cursor: pointer;
}

.nodes:hover {
  background: rgba(0,0,0,0.1);
  color: white;
}

input {
  box-sizing: border-box;
  background-color: var(--backgound-color);
  border: 1px solid var(--card-border);
  border-radius: 0.4rem;
  color: var(--title-color);
  padding: 0 10px;
  margin-bottom: 20px;
  position: fixed;
  font-size: 17px !important;
  width: 100%;
  font-size: 16px;
  height: 40px;
  display: inline-flex;
  position: relative;
  font-family: 'Roboto Mono';
  padding-left: 15px;
  margin-top: 10px;
  margin-left: -10px;
  &:focus {
    outline: none;
    border: 1px solid var(--title-color);
    }
  }

.nodelist {
--scrollbarBG: transparent;
--thumbBG: #3337;
overflow: auto;

}
 .nodelist::-webkit-scrollbar {
  width: 8px;
}
  .nodelist {
  scrollbar-width: thin;
  scrollbar-color: var(--thumbBG) var(--scrollbarBG);
}
.nodelist::-webkit-scrollbar-track {
  background: var(--scrollbarBG);
}
.nodelist::-webkit-scrollbar-thumb {
  background-color: var(--thumbBG) ;
  border-radius: 3px;
  border: 3px solid var(--scrollbarBG);
}

</style>
