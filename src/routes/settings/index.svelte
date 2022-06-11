<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user} from "$lib/stores/user.js";
    let node;


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

</script>

<main in:fade>
<h1>Settings</h1>
  <div id="settings">
       <div class="inner">
        <div class="nodelist">
        <h4>Nodes</h4>
        {#each $nodelist as node}
        <div on:click={()=> switchNode(node)}>
            <h4>{node.name}</h4>
        </div>
        {/each}
      </div>
     </div>

      <div class="inner">
        <div class="nodestatus">
          <h4>Status</h4>
           <p>{$user.node}</p>
       </div>
        </div>

   </div>
</main>

<style>
    h1,h2,h3,h4 {
        color: white;
        margin: 0;
        font-family: "Montserrat"
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
      background: rgba(0,0,0,0.1);
      border-radius: 10px;
      display: grid;
      transition: .25s ease-in-out all;
      grid-template-columns: repeat(2,1fr);
    }

    #settings .inner {
      padding: 2rem;
      border-radius: 0.4rem;
      height: 220px;
      transition: 0.25s ease-in-out all;
      width: 40%;
      height: 700px;
    }

    #nodelist {
      width: 80%;
      color: white;
    }

</style>
