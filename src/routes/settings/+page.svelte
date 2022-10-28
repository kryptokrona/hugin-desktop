<script>
  import { fade } from "svelte/transition";
  import { user, misc } from "$lib/stores/user.js";
  import { onMount, onDestroy } from "svelte";
  import Button from "/src/components/buttons/Button.svelte";
  import FillButton from "/src/components/buttons/FillButton.svelte";
  import NodeSelector from "$components/popups/NodeSelector.svelte";
  import { layoutState } from "$lib/stores/layout-state.js";

  let networkHeight = "";
  let walletHeight = "";
  let synced = false;
  let status = "Connecting";
  let seedPhrase = "";
  let node = true;
  let wallet = false;
  let privateSpendKey = "";
  let privateViewKey = "";
  let enableConnect = false;
  let showKeys = false;
  let showMnemonic = false;

  onMount(async () => {
    getHeight();
  });

  onDestroy(() => {
    window.api.removeAllListeners("node-sync-data");
  });

  async function getHeight() {

    let heightStatus = await window.api.getHeight();
    walletHeight = heightStatus.walletHeight;
    networkHeight = heightStatus.networkHeight;

  }

  window.api.receive("node-sync-data", (e) => {
    console.log("e", e);
    walletHeight = e.walletBlockCount;
    networkHeight = e.networkBlockCount;
    console.log("status", walletHeight, networkHeight);
  });

  //Change node defaults values and triggers getHeight
  const changeNode = () => {

    console.log("Changed");
    networkHeight = "";
    walletHeight = "";
    status = "Connecting";
    getHeight();

  };

  $: enableConnect;

  //Reactive if statement
  $: {
    if (networkHeight - walletHeight < 2) {
      synced = true;
      status = "Connected";
    } else {
      synced = false;
      status = "Connecting";
    }
  }

  const getMnemonic = async () => {
    let mnemonic = await window.api.getMnemonic();
    seedPhrase = mnemonic[0];
    showMnemonic = true;
  };

  const getPrivateKeys = async () => {
    let keys = await window.api.getPrivateKeys();
    privateSpendKey = keys[0];
    privateViewKey = keys[1];
    showKeys = true;
  };

  const toWallet = () => {
    wallet = true;
    node = false;
  };

  const toNode = () => {
    wallet = false;
    node = true;
  };

  const connectToNode = (e) => {
    $layoutState.showNodeSelector = false;
    $misc.node = e.detail.node;
    changeNode();
    window.api.switchNode($misc.node);
  };

  $: {
    seedPhrase;
    status;
    networkHeight;
    walletHeight;
    privateSpendKey;
    privateViewKey;
  }

</script>

<main in:fade>
  <h1>Settings</h1>
<div style="margin-top: 1rem">
  <div style="width: 500px; display: flex; gap: 1rem">
    <FillButton text="Node" enabled={false} disabled={false} on:click={toNode} />
    <FillButton text="Wallet" enabled={false} disabled={false} on:click={toWallet} />
    <FillButton text="Check updates" disabled={false} on:click={() => window.api.send('check-new-release')}/>
  </div>
</div>


  {#if node}

    {#if $layoutState.showNodeSelector}
      <div class="backdrop">
        <NodeSelector on:back={() => $layoutState.showNodeSelector = false} on:connect={(e) => connectToNode(e)} />
      </div>
    {/if}

    <div class="settings"  in:fade>

      <div class="nodestatus">
        <h2>Selected Node</h2>
        <h4>Address</h4>
        <p class="nodeinfo">{$misc.node}</p>

        <div class="status">
          <h4>Status</h4>

          {#if synced}
            <p class="nodeinfo syncstatus" class:sync={synced}>{status}</p>
          {:else}
            <p class="nodeinfo syncstatus" class:sync={synced}>Syncing blocks</p>
          {/if}

        </div>
        <div class="height">
          <h4>Height</h4>

          {#if synced}
            <p class="nodeinfo"> {networkHeight} </p>
          {:else}
            <p class="nodeinfo"> {networkHeight} - {walletHeight} </p>
          {/if}
        </div>
        <div style="width: 160px;">
          <FillButton text="Change Node" enabled={false} disabled={false} on:click={() => $layoutState.showNodeSelector = true} />
        </div>

      </div>
    </div>

  {/if}

  {#if wallet}
    <div class="settings" in:fade>
      <div class="inner keys">
        <h3>Private keys</h3>
        <div class="button">
          <Button disabled={node} text="Show private keys" on:click={getPrivateKeys} />
        </div>
        <br>
        {#if showKeys}
          <h6>Spend Key</h6>
          <p style="user-select: text;" in:fade type="text">{privateSpendKey}</p>

          <h6>View key</h6>
          <p style="user-select: text;" in:fade type="text">{privateViewKey}</p>
        {/if}
      </div>

      <div class="inner mnemonic">
        <h3>Mnemonic seed</h3>
        <div class="button">
          <Button disabled={node} text="Show mnemonic seed" on:click={getMnemonic} />
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

  main {
    margin: 0 20px 0 95px;
    padding: 15px 20px;
    z-index: 3;
    height: 100vh;
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
    background: rgba(0, 0, 0, 0.25);
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
    background: rgba(0, 0, 0, 0.25);
    border-radius: 7px;
    overflow: hidden;
    padding: 10px;
    width: 250px;
    padding-right: 10px;
    margin-left: -9px;
    border: 1px solid white;

  }

  .settings {
    margin-top: 1rem;
    border-radius: 10px;
    display: grid;
    transition: .25s ease-in-out all;
    grid-template-columns: repeat(2, 1fr);
  }


  .sync {
    color: var(--success-color) !important;
  }

  .syncstatus {
    color: var(--warn-color);
  }

  .nodeinfo {
    font-size: 17px !important;

  }

  .button {
    margin-left: -15px;
    margin-bottom: 10px;
  }

  .backdrop {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--backgound-color);
    z-index: 103;
  }

  .button_wrapper {
    display: flex;
    gap: 1rem;
    width: 100%;
    justify-content: center;
  }


</style>
