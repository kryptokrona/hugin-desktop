<script>
    import {fade} from 'svelte/transition';
    import FillButton from "/src/components/buttons/FillButton.svelte";
    import {user} from "$lib/stores/user.js";
    import { goto } from '$app/navigation';
    import GreenButton from "/src/components/buttons/GreenButton.svelte";
    import {nodelist} from "$lib/stores/nodes.js";

    let password = ''
    let walletName = ''
    let nodeInput = ''
    let username = false
    let pass
    let nodeAddress = ''
    let nodePort
    let enableNextButton = false
    let ready = false
    let showNode = false
    let exitNode = "X"
    let defualtPick = true

    const handleLogin = () => {

      let accountData = {
        walletName: walletName,
        password: password,
        node: nodeAddress,
        port: nodePort
      }
       window.api.send('create-account', accountData);

        console.log('Creating user account', accountData)
    }

    const next = (type) => {

      switch (type) {
        case 'node':
        username = true
        break;
        case 'wallet':
        pass = true
        break;
      }
        enableNextButton = false
    }

    $: nodeAddress
    $: nodePort

    function chooseNode(node) {
          nodeAddress = nodeInput.split(':')[0]
          nodePort = parseInt(nodeInput.split(':')[1])
      enableNextButton = true
    }

    $ : if (nodeInput.length) {
      nodeAddress = nodeInput.split(':')[0]
      nodePort = parseInt(nodeInput.split(':')[1])
    }

    $: {
        if (nodeInput.length > 0 || walletName.length > 0 || password.length > 0) {
            //Enable add button
            enableNextButton = true
        } else {
          enableNextButton = false
        }
    }

    const showNodes = () => {
      showNode =!showNode
      if (!showNode) {
        enableNextButton = true
      }
    }

    function defualtPicker() {
      console.log('picked');
      if (defualtPick) {
        nodeAddress = 'blocksum.org'
        nodePort = 11898
        enableNextButton = true
      }
    }

</script>

<main in:fade>

 <div id="create">
    <h1>Create Account</h1>
      {#if !username}
      <div class="centerbox">

        {#if !showNode}
          <div class="pickNode">
          <GreenButton text="Pick custom node" on:click={showNodes}/>
          <GreenButton text="Defualt node" enabled={defualtPick} on:click={()=> defualtPicker()}/>
          </div>
        {/if}
      </div>
              {#if showNode}
                <div class="nodeBox">
                  <div on:click={showNodes}>{exitNode}</div>
                  <h4>Node</h4>
                    <div class="nodelist">
                      {#each $nodelist as node}
                          <div class="nodes" on:click={()=> chooseNode(node)}>
                             <h4 class="nodes">{node.name}</h4>
                          </div>
                      {/each}
                    </div>
                  <br>
                  <h4>Custom node</h4>
                  <input placeholder="node:url" type="text" bind:value={nodeInput}>
                </div>
              {/if}
          <GreenButton  disabled={!enableNextButton} enabled={enableNextButton} text="Next" on:click={()=> next('node') }/>
      {/if}

    <div class="wrapper">

      {#if username && !pass}
        <label>Username</label>
        <input type="text" placeholder="Satoshi" bind:value={walletName}>
        <GreenButton  disabled={!enableNextButton} enabled={enableNextButton} text="Next" on:click={()=> next('wallet')}/>
      {/if}
      {#if pass}
        <label>Password</label>
        <input type="password" placeholder="Something safe" bind:value={password}>
        <GreenButton  disabled={!enableNextButton} enabled={enableNextButton} text="Next" on:click={handleLogin}/>
      {/if}
        <!-- <FillButton text="back" url="/"/> -->
      </div>
  </div>

</main>

<style lang="scss">

    main {
        height: 100vh;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 3;
    }

    #create {

      padding: 3rem;
      border-radius: 10px;
      display: grid;
      transition: .25s ease-in-out all;
    }

    .nodeBox {
      display: block;
      justify-content: center;
      height: 500px;
    }
    .wrapper, .centerbox {
        display: flex;
        justify-content: center;
        align-items: flex-start;
        flex-direction: column;
    }

    .pickNode {
      display: inline-block;
    }

    h1 {
        color: white;
        margin-bottom: 15% !important;
        margin-top: 5% !important;
    }

    label {
        color: white;
        margin-top: 20px;
    }

    h2,h3,h4 {
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
      font-size: 20px;
    }


    .nodelist {
      height: 50%;
      overflow-x: hidden;
      overflow-y: scroll;
    }

    .nodes {
      color: #f1f2f3;
      font-family: 'Roboto Mono';
      font-size: 17px;
      padding: 7px;
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
      margin-left: -10px;
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
