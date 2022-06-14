<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user} from "$lib/stores/user.js";
    let node;
    let nodeInput

    const switchNode = (node) => {

      let nodeAddress = node.url
      let nodePort = node.port

      window.api.switchNode(nodeAddress + ':' +  nodePort)

      user.update(oldData => {
          return {
              ...oldData,
              node: nodeAddress + ':' +  nodePort
          }
      })

    }

    $ : console.log('nodeinput', nodeInput);

</script>

<main in:fade>
<h1>Settings</h1>
  <div id="settings">
       <div class="inner">

         <h3>Nodes</h3>
        <div class="nodelist">
        {#each $nodelist as node}
        <div class="nodes" on:click={()=> switchNode(node)}>
            <h4>{node.name}</h4>
        </div>
        {/each}
      </div>
        <br>
       <input placeholder="node:url" type="text" bind:value={nodeInput}>
     </div>

      <div class="inner">

          <h3>Status</h3>
        <div class="nodestatus">
           <p>{$user.node}</p>
       </div>
        </div>

   </div>
</main>

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

    main {
        margin-left: 85px;
        padding: 40px;
        z-index: 3;
    }

    p {
      font-family: "Roboto Mono";
      color: white;
    }

    #settings {
      border-radius: 10px;
      display: grid;
      transition: .25s ease-in-out all;
      grid-template-columns: repeat(2,1fr);
    }

    #settings .inner {
      padding: 3rem;
      border-radius: 0.4rem;
      height: 220px;
      transition: 0.25s ease-in-out all;
      width: 80%;
      height: 700px;
    }

    .nodelist {
      height: 50%;
      overflow-x: hidden;
      overflow-y: scroll;
    }

    .nodes {
      color: #f1f2f3;
      font-family: 'Roboto Mono';
      font-size: 18px;
      margin-bottom: 5px;
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
      margin-left: -5px;
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
