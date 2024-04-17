<script>
    import {fade} from 'svelte/transition'
    import {misc, user} from '$lib/stores/user.js'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import {goto} from '$app/navigation'
    import NodeSelector from '$lib/components/popups/NodeSelector.svelte'
    import { getBestNode } from '$lib/stores/nodes'
    let mnemonic = ''
    let blockHeight
    let password = ''
    let confirmPassword = ''
    let completed = false
    let username = ''
    let walletName = ''
    let nodeInput = ''
    let step = 1
    let showNodes = false
    let loading = false
    $: walletName = username

    const enter = (e) => {
        if (e.key === 'Enter' && password.length && step === 3) {
            handleLogin()
        } else if (e.key === 'Enter' && username.length && step < 3) {
            step++
        }
    }

    const handleLogin = (e) => {
        blockHeight ? blockHeight : 0
        nodeInput = e.detail.node
        $misc.loading = true
        let accountData = {
            walletName,
            password,
            node: nodeInput.split(':')[0],
            port: parseInt(nodeInput.split(':')[1]),
            mnemonic: mnemonic,
            blockheight: parseInt(blockHeight),
        }
        
        //Save username to localStorage
        window.localStorage.setItem('userName', username)

        $user.username = username

        window.api.send('create-account', accountData)
        console.log('Creating user account', accountData)
        loading = false
    }

    const autoNode = async () => {
        loading = true
        const node = await getBestNode()
        if (!node) {
            window.api.errorMessage('Auto node did not load')
            return
        }
        const event = {detail: {node: node}}
        
        console.log("Event node!", event)
        return handleLogin(event)
    }

    $: {
        step
        username
        blockHeight
    }

    function createAcc() {
        $user.restore = false
        step = 1
    }

    window.api.receive('node-not-ok', () => {
        nodeInput = ''
    })

    window.api.receive('wallet-started', async () => {
        await goto('/dashboard')
        $misc.loading = false
        $user.loggedIn = true
        username = ''
        password = ''
        step = 1
    })

</script>

<svelte:window on:keyup|preventDefault="{enter}"/>
<div class="main" in:fade>
    {#if step === 1 && $user.restore}
        <div in:fade class="wrapper">
            <h2>Please enter your mnemonic seed</h2>

            <input
                    spellcheck="false"
                    placeholder="Type your mnemonic here"
                    bind:value="{mnemonic}"
            />
            <input
                    type="text"
                    spellcheck="false"
                    placeholder="Blockheight"
                    bind:value="{blockHeight}"
            />

            <div class="button_wrapper">
                <FillButton
                        text="Back"
                        disabled="{false}"
                        on:click="{() => {
                        $user.restore = false
                        goto('/')
                    }}"
                />
                <FillButton
                        disabled="{mnemonic.length < 0}"
                        enabled="{mnemonic.length > 0}"
                        text="Next"
                        on:click="{() => createAcc()}"
                />
            </div>
        </div>
    {/if}

    {#if step === 1 && !$user.restore}
        <div in:fade class="wrapper">
            <h2>Enter your username</h2>
            <input type="text" spellcheck="false" placeholder="Username" bind:value="{username}"/>

            <div class="button_wrapper">
                <FillButton text="Back" disabled="{false}" on:click="{() => goto('/')}"/>
                <FillButton
                        disabled="{username.length < 0}"
                        enabled="{username.length > 0}"
                        text="Next"
                        on:click="{() => (step = 2)}"
                />
            </div>
        </div>
    {:else if step === 2}
        <div in:fade class="wrapper">
            <h1>Create wallet</h1>
            <input type="password" placeholder="Password" bind:value="{password}"/>
            <input type="password" placeholder="Confirm Password" bind:value="{confirmPassword}"/>

            <div style="display: flex; gap:1rem; width: 100%; justify-content: center">
                <FillButton disabled="{false}" text="Back" on:click="{() => (step = 1)}"/>
                <FillButton
                        disabled="{!(
                        walletName.length > 0 &&
                        password.length > 0 &&
                        password === confirmPassword
                    )}"
                        text="Next"
                        enabled="{walletName.length > 0 &&
                        password.length > 0 &&
                        password === confirmPassword}"
                        on:click="{() => (step = 3)}"
                />
            </div>
        </div>
    {:else if step === 3}
    <div in:fade class="wrapper">
        <h1>Node</h1>
        <div style="display: flex; gap:1rem; width: 100%; justify-content: center">
        <div class="nodes" class:show={showNodes}>
            <NodeSelector on:back="{() => (showNodes = false)}" on:connect="{(e) => handleLogin(e)}"/>
        </div>
            <FillButton disabled="{false}" text="Custom" on:click="{() => (showNodes = true)}"/>
            
            <FillButton disabled="{false}" info={true} loading={loading} text="Auto" on:click="{async () => await autoNode()}"/>
         
        </div>
    </div>
    {/if}
        </div>

<style lang="scss">

 .main {
    height: 100vh;
    padding: 4rem;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
  }

  .wrapper {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    max-width: 840px;
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

  .button_wrapper {
    display: flex;
    gap: 1rem;
    width: 100%;
    justify-content: center;
  }

  .nodes {
    display: none;

  }

  .show {
    display: flex;
  }
</style>
