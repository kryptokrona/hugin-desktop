<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user} from "$lib/stores/user.js";
    let node;


    const switchNode = (node) => {

      console.log('swiitching', node);

      //window.api.switchNode(node)

      user.update(oldData => {
          return {
              ...oldData,
              node: node
          }
      })


    }
    $ : console.log('node?', node);

</script>

<main in:fade>
    <h1>Settings</h1>

        {#each $nodelist as node}
        <div on:click={()=> switchNode(node)}>
            <h4>{node.name}</h4>
            <p>{`${node.url}:${node.port}`}</p>
        </div>
        {/each}
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

</style>
