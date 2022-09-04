<script>
  import { fade } from "svelte/transition";
  import { user, misc } from "$lib/stores/user.js";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";
  import { nodelist } from "$lib/stores/nodes.js";
  import { goto } from "$app/navigation";

  let password = "";
  let username = "";
  let walletName = "";
  let nodeInput = "";
  let selectedNode;
  let step = 1;

  const handleLogin = () => {
    $misc.loading = true;
    let accountData = {
      walletName,
      password,
      node: nodeInput.split(":")[0],
      port: parseInt(nodeInput.split(":")[1])
    };

    //Save username to localStorage
    window.localStorage.setItem("userName", username);

    user.update(oldData => {
      return {
        ...oldData,
        loading: true
      };
    });

    window.api.send("create-account", accountData);
    console.log("Creating user account", accountData);


    goto("/dashboard");
  };

  $: {
    selectedNode;
    step;
  }

  function chooseNode(node, i) {
    nodeInput = `${node.url}:${node.port}`;
    selectedNode = i;
  }


  function defaultPicker() {
      nodeInput = "blocksum.org:11898";
  }

  window.addEventListener("keyup", e => {
    if (e.keyCode === 13) {
      handleLogin();
    }
  });

</script>

<main in:fade>

  {#if step === 1}

    <div in:fade class="wrapper">
      <h2>Select you username</h2>
      <input type="text" spellcheck="false" placeholder="Username" bind:value={username}>
      <GreenButton disabled={username.length < 0} enabled={username.length > 0} text="Next" on:click={() => step = 2} />
    </div>

  {:else if step === 2}

    <div in:fade class="wrapper">
      <h1>Create wallet</h1>
      <input type="text" placeholder="Wallet name" bind:value={walletName}>
      <input type="password" placeholder="Password" bind:value={password}>

      <div style="display: flex; gap:1rem; width: 100%; justify-content: center">
        <GreenButton disabled={false} text="Back" on:click={() => step = 1} />
        <GreenButton disabled={!(walletName.length > 0 && password.length > 0)} text="Next"
                     enabled={(walletName.length > 0 && password.length > 0)} on:click={() => step = 3} />
      </div>
    </div>

  {:else if step === 3}

    <div in:fade class="wrapper">
      <h1>Chose a node</h1>
      <input class="node-input" spellcheck="false" type="text" placeholder="Enter url & port" bind:value={nodeInput}>
      <div class="node-list">
        {#each $nodelist as node, i}
          <div class="node-card" class:selected={selectedNode === i} on:click={() => {chooseNode(node, i)}}>
            <p id="node">{node.name}</p>
          </div>
        {/each}
      </div>
      <div style="display: flex; gap:1rem; width: 100%; justify-content: center">
        <GreenButton text="Back" disabled={false} on:click={() => step = 1} />
        <GreenButton text="Auto" disabled={false} on:click={()=> {defaultPicker(); selectedNode = null}} />
        <GreenButton text="Next" disabled={!(nodeInput.length > 0)} enabled={nodeInput.length > 0} on:click={handleLogin} />
      </div>
    </div>


  {/if}

</main>

<style lang="scss">

  main {
    height: 100vh;
    width: 100%;
    padding: 4rem;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .wrapper {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    max-width: 840px;
  }

  .node-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
  }

  .node-card {
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    padding: 0.75rem;
    border-radius: 0.4rem;
    cursor: pointer;

    p {
      margin: 0;
      font-size: 0.75rem;
    }
  }

  .selected {
    background-color: var(--success-color);
  }


  label {
    color: white;
    margin-top: 20px;
  }

  input {
    margin: 0 auto;
    max-width: 700px;
    width: 100%;
    height: 48px;
    padding: 0 15px;
    border-radius: 0.5rem;
    transition: 200ms ease-in-out;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    color: var(--text-color);
    font-size: 1.1rem;

    &:focus {
      outline: none;
    }
  }

</style>
