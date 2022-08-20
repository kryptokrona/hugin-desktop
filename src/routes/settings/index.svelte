<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user, misc} from "$lib/stores/user.js";
    import NodeList from '/src/components/settings/NodeList.svelte';
    import {onMount} from "svelte";
    import Button from "/src/components/buttons/Button.svelte";

    let networkHeight = ''
    let walletHeight = ''
    let synced = false
    let status = 'Connecting'
    let seedPhrase = ''
    let node = true
    let wallet = false
    let privateSpendKey = ''
    let privateViewKey = ''

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

    const getMnemonic = async () => {
      let mnemonic = await window.api.getMnemonic()
      seedPhrase = mnemonic[0]
    }

    const getPrivateKeys = async () => {
      let  keys = await window.api.getPrivateKeys()
      privateSpendKey = keys[0]
      privateViewKey = keys[1]
    }

    const toWallet = () => {
      wallet = true
      node = false
    }

    const toNode = () => {
      wallet = false
      node = true
    }

    $: seedPhrase
    $: status
    $: networkHeight
    $: walletHeight
    $: privateSpendKey
    $: privateViewKey
    
</script>

<main in:fade>
  <h1>Settings</h1>
    <h5 on:click={toNode}>NODE</h5> <h5 on:click={toWallet}>WALLET</h5>
{#if node}


<div id="settings">
  <div class="inner">
    <NodeList on:changeNode={changeNode}/>
  </div>

    <div class="inner">
      <div class="nodestatus">
          <h3>Status</h3>
            <h4>Address</h4>
             <p class="nodeinfo">{$misc.node}</p>

          <div class="status">
            <h4>Status</h4>

              {#if synced}
                <p class="syncstatus nodeinfo" class:sync={synced}>{status}</p>
               {:else}
                <p class="syncstatus nodeinfo" class:sync={synced}>Syncing blocks</p>
               {/if}

          </div>

          <div class="height">
            <h4>Height</h4>

              {#if synced}
                <p class="nodeinfo"> {networkHeight} </p>
              {:else}
                <p class="nodeinfo"> {networkHeight} - {walletHeight} </p>

              {/if}

          </div><br>
      </div>
    </div>

  </div>
  {/if}

  {#if wallet} 
  <div id="settings">
    <div class="inner">
      <Button disabled={node} text="Show private keys" on:click={getPrivateKeys}/>

      <h4>Spend Key</h4>
      <p type="text">{privateSpendKey}</p>

      <h4>View key</h4>
      <p type="text">{privateViewKey}</p>

    </div>

    <div class="inner">
      <Button disabled={node} text="Show Mnemonic Seed" on:click={getMnemonic}/>
      <p type="text">{seedPhrase}</p>
    </div>

   
  </div>
  {/if}
</main>

<style lang="scss">
    h1,h2,h3,h4 {
        color: white;
        margin: 0;
        font-family: "Montserrat";
    }

    h3 {
      font-size: 25px;
      margin-bottom: 15px;
      margin-left: -10px;
    }

    h4 {
      font-size: 16px;
      margin-bottom: 15px;
      font-weight: bold;
    }

    h5 {
      display: inline;
      font-size: 16px;
      color: #f5f5f5;
      font-family: 'Montserrat';
      margin-right: 10px;
      cursor: pointer;
    }

    h5:hover {
      color: white;
      text-decoration: underline;
      transition: 0.4s;
    }

    main {
        margin-left: 85px;
        padding: 40px;
        z-index: 3;
    }

    p {
      font-family: "Roboto Mono";
      color: white;
      width: 100%;
      overflow-wrap: break-word;
      padding-right: 10px;
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
      height: 700px;
      overflow: hidden;
    }

    .sync {
      color: green !important;
    }

    .syncstatus {
      color: red;
    }

    .nodeinfo {
      font-size: 17px !important;

    }


</style>
