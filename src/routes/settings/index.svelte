<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user} from "$lib/stores/user.js";
    import NodeList from '/src/components/settings/NodeList.svelte';


</script>

<main in:fade>
<h1>Settings</h1>
  <div id="settings">
       <div class="inner">

  <NodeList/>
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


</style>
