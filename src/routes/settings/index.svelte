<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user, misc} from "$lib/stores/user.js";
    import NodeList from '/src/components/settings/NodeList.svelte';
    import {onMount} from "svelte";

    let networkHeight = ''
    let walletHeight = ''
    let synced = false
    let status = 'Connecting'
    onMount(async () => {
      getHeight()
    })
    async function getHeight() {

      let heightStatus = await window.api.getHeight()
      walletHeight = heightStatus.walletHeight
      networkHeight = heightStatus.networkHeight

    }

    window.api.receive('node-sync-data', (e) => {
      console.log('e', e);
      walletHeight = e.walletBlockCount
      networkHeight = e.networkBlockCount
      console.log('status', walletHeight, networkHeight);
    })

    //Change node defaults values and triggers getHeight
    const changeNode = () => {

      console.log('Changed');
      networkHeight = ''
      walletHeight = ''
      status = 'Connecting'
      getHeight()

    }

    //Reactive if statement
    $: { if (networkHeight - walletHeight < 2) {
      synced = true
      status = 'Connected'
    }  else {
      synced = false
      status = 'Connecting'
    }
    }

</script>

<main in:fade>
<h1>Settings</h1>
  <div id="settings">
       <div class="inner">

  <NodeList on:changeNode={changeNode}/>
     </div>

      <div class="inner">

        <div class="nodestatus">
          <h3>Status</h3>
            <h4>Address</h4>
           <p>{$misc.node}</p>
          <div class="status">
                <h4>Status</h4>

              {#if synced}
             <p class="syncstatus" class:sync={synced}>{status}</p>
               {:else}
             <p class="syncstatus" class:sync={synced}>Syncing blocks</p>
               {/if}

           </div>

          <div class="height">
            <h4>Height</h4>

              {#if synced}
              <p> {networkHeight} </p>
              {:else}
              <p> {networkHeight} - {walletHeight} </p>

               {/if}

           </div>
            <br>

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

    h4 {
      font-size: 17px;
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
      margin-left: 60px;
      transition: .25s ease-in-out all;
      grid-template-columns: repeat(2,1fr);
    }

    #settings .inner {
      padding: 3rem;
      border-radius: 0.4rem;
      height: 220px;
      transition: 0.25s ease-in-out all;
      width: 90%;
      height: 700px;
    }

    .sync {
      color: green !important;
    }

    .syncstatus {
      color: red;
    }


</style>
