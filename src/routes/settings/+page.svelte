<script>
    import { fade } from 'svelte/transition';
    import {nodelist} from "$lib/stores/nodes.js";
    import {user, misc} from "$lib/stores/user.js";
    import NodeList from '/src/components/settings/NodeList.svelte';
    import {onMount, onDestroy} from "svelte";
    import Button from "/src/components/buttons/Button.svelte";
    import GreenButton from "/src/components/buttons/GreenButton.svelte";

    let networkHeight = ''
    let walletHeight = ''
    let synced = false
    let status = 'Connecting'
    let seedPhrase = ''
    let node = true
    let wallet = false
    let privateSpendKey = ''
    let privateViewKey = ''
    let enableConnect = false
    let nodeInput = ""
    let showKeys = false
    let showMnemonic = false
    
    onMount(async () => {
      getHeight()
    })
    
    onDestroy(()=> {
    window.api.removeAllListeners("node-sync-data")
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

    $: enableConnect

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
      showMnemonic = true
    }

    const getPrivateKeys = async () => {
      let  keys = await window.api.getPrivateKeys()
      privateSpendKey = keys[0]
      privateViewKey = keys[1]
      showKeys = true
    }

    const toWallet = () => {
      wallet = true
      node = false
    }

    const toNode = () => {
      wallet = false
      node = true
    }

    const connectToNode = () => {

      misc.update(oldData => {
          return {
              ...oldData,
              node: nodeInput
          }
      })
      changeNode()
      window.api.switchNode(nodeInput)
    }
  

    $: nodeInput
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


<div id="settings" in:fade>
  <div class="inner">
    <NodeList  on:node={(e)=> nodeInput = e.detail.node} on:enable={()=> enableConnect = true} on:disable={()=> enableConnect = false}/>
    <GreenButton text="Connect" enabled={enableConnect} on:click={()=> connectToNode()}/>
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
  <div id="settings" in:fade>
    <div class="inner keys">
      <h3>Private keys</h3>
      <div class="button">
      <Button disabled={node} text="Show private keys" on:click={getPrivateKeys}/>
     </div>
      <br>
     {#if showKeys}
      <h6 >Spend Key</h6>
      <p style="user-select: text;" in:fade type="text">{privateSpendKey}</p>

      <h6 >View key</h6>
      <p style="user-select: text;" in:fade type="text">{privateViewKey}</p>
      {/if}
    </div>

    <div class="inner mnemonic">
      <h3>Mnemonic seed</h3>
      <div class="button">
      <Button disabled={node} text="Show mnemonic seed" on:click={getMnemonic}/>
      </div>
      <br>
      {#if showMnemonic}
      <h6>Mnemonic seed</h6>
      <p style="user-select: text;" in:fade type="text">{seedPhrase}</p>
      {/if}
    </div>

   
  </div>
  {/if}
</main>

<style lang="scss">
    h1,h2,h3,h4,h6 {
        color: white;
        margin: 0;
        font-family: "Montserrat";
    }

    h3 {
      font-size: 20px;
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

    h6 {
      font-size: 14px;
    }

    h5:hover {
      color: white;
      text-decoration: underline;
      transition: 0.4s;
    }

    main {
        margin-left: 120px;
        padding: 40px;
        z-index: 3;
    }

    p {
      font-family: "Montserrat";
      color: white;
      width: 100%;
      overflow-wrap: break-word;
      padding-right: 10px;
    }

    .keys p {
      font-family: "Montserrat";
    color: white;
    width: 100%;
    overflow-wrap: break-word;
    padding-right: 10px;
    height: 90px;
    background: rgba(0,0,0,0.25);
    border-radius: 7px;
    overflow: hidden;
    padding: 10px;
    width: 250px;
    text-overflow: ellipsis;
    margin-left: -9px;
    border: 1px solid white;
    }

    .mnemonic p {
      height: 190px;
      background: rgba(0,0,0,0.25);
      border-radius: 7px;
      overflow: hidden;
      padding: 10px;
      width: 250px;
      padding-right: 10px;
      margin-left: -9px;
      border: 1px solid white;

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

    .button {
      margin-left: -15px;
      margin-bottom: 10px;
    }


</style>
