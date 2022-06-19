<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user} from "$lib/stores/user.js";
    import NodeList from '/src/components/settings/NodeList.svelte';

    let networkHeight = ''
    let walletHeight = ''
    let synced = false
    let status = 'Connecting'

    async function getHeight() {
      console.log('GettingHeighttttt');
      let heightStatus = await window.api.getHeight()
      walletHeight = heightStatus.walletHeight
      networkHeight = heightStatus.networkHeight

    console.log('wallet', walletHeight);
    console.log('network', networkHeight);

    }

    setInterval(getHeight, 10000)

    $: { if (networkHeight - walletHeight < 2) {
      synced = true
      status = 'Connected'
    }  else {
      synced = false
      status = 'Connecting'
    }
    }

    const changeNode = () => {
      console.log('Changed');
      networkHeight = ''
      walletHeight = ''
      status = 'Connecting'
      getHeight()
    }

</script>

<main in:fade>
<h1>Settings</h1>
  <div id="settings">
       <div class="inner">

  <NodeList on:changeNode={changeNode}/>
     </div>

      <div class="inner">

          <h3>Status</h3>
        <div class="nodestatus">
           <p>{$user.node}</p>
            {#if synced}

           <p class="syncstatus" class:sync={synced}>{status} {networkHeight}</p>
             {:else}
           <p class="syncstatus" class:sync={synced}>Syncing blocks {walletHeight} / {networkHeight}</p>

            {/if}
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

    .sync {
      color: green !important;
    }

    .syncstatus {
      color: red;
    }


</style>
