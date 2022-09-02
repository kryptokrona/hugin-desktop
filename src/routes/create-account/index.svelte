<script>
    import {fade} from 'svelte/transition';
    import FillButton from "/src/components/buttons/FillButton.svelte";
    import {user, misc} from "$lib/stores/user.js";
    import { goto } from '$app/navigation';
    import GreenButton from "/src/components/buttons/GreenButton.svelte";
    import {nodelist} from "$lib/stores/nodes.js";
    
    import NodeList from '/src/components/settings/NodeList.svelte';
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
    let userName = ''
    const handleLogin = () => {

      $misc.loading = true
      
      let accountData = {
        walletName: walletName,
        password: password,
        node: nodeInput.split(':')[0],
        port: parseInt(nodeInput.split(':')[1])
      }

      //Save username to localStorage
      window.localStorage.setItem('userName', userName)

      user.update(oldData => {
				return {
						...oldData,
						loading: true
				}
		})

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
    $: enableNextButton

    function chooseNode(node) {
          nodeInput = node
          enableNextButton = true
    }

    $: {
        if (nodeInput.length > 0 || userName.length > 0 || password.length > 0) {
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
        nodeInput = 'blocksum.org:11898'
        enableNextButton = true
      }
    }

    window.addEventListener('keyup', e => {
        if (enableNextButton && pass && e.keyCode === 13) {
            handleLogin()
            pass = false
            enableNextButton = false
        }
    })

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
                <NodeList on:node={(e)=> chooseNode(e.detail.node)} on:enable={() => enableNextButton = true} on:disable={() => enableNextButton = false}/>
              {/if}
          <GreenButton  disabled={!enableNextButton} enabled={enableNextButton} text="Next" on:click={()=> next('node') }/>
      {/if}

    <div class="wrapper">

      {#if username && !pass}
        <label>Username</label>
        <input type="text" placeholder="Satoshi" bind:value={userName}>
        <GreenButton  disabled={!enableNextButton} enabled={enableNextButton} text="Next" on:click={()=> next('wallet')}/>
      {/if}
      {#if pass}
      
        <label>Wallet name</label>
        <input type="text" placeholder="Wallet" bind:value={walletName}>

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
      height: 800px;
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

</style>
