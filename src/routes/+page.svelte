<script>
    import {fade} from 'svelte/transition'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import {groups, misc, user} from '$lib/stores/user.js'
    import {onMount} from 'svelte'
    import {goto} from '$app/navigation'
    import {Moon} from "svelte-loading-spinners";
    import NodeSelector from "$lib/components/popups/NodeSelector.svelte";

    let wallet
    let nodeFailed

    onMount(() => {
        if ($user.started) {
            wallet = true
            goto('/login')
        return
        }
        window.api.send('app', true)
        window.api.receive('version', version => {
            $misc.version = version
        })
      window.api.receive('os-arch', data => {
        console.log(`You're running ${data.os} on ${data.arch}`)
        $misc.os = data.os
        $misc.arch = data.arch
      })

        $user.username = window.localStorage.getItem('userName')
        if (!$user.username) $user.username = 'Anon'

        window.api.receive('wallet-exist', async (data, walletName, node) => {
            console.log('node? wallet exist', node)
            $misc.node = node
            wallet = data
            if (wallet) {
                await goto('/login')
            }
            if (walletName === undefined) return
            console.log('wallet exists', walletName)
            $user.thisWallet = walletName[0]
        })

    })

    window.api.receive('node-not-ok', () => {
        setTimeout(() => {
            nodeFailed = true
        }, 500)
        $misc.loading = false
    })

    window.api.receive('wallet-started', async (node, my_groups, block_list) => {

        console.log('Got wallet started')
        //Set chosen node from last startup in store
        $misc.node = {node: node.node, port: parseInt(node.port)}
        $groups.blockList = block_list
        $groups.groupArray = my_groups
        loginSuccess()
    })

    //Sets our own address in svelte store
    window.api.receive('addr', async (huginAddr) => {
        console.log('Addr incoming')
        $user.huginAddress = huginAddr
    })

    const loginSuccess = async () => {
        console.log('login success')
        await goto('/dashboard')
        $user.loggedIn = true
        $user.started = true
    }

    const goTo = restore => {
        $user.restore = !!restore
        goto('/create-account')
    }

    const setNode = (e) => {
        if(e.detail.node) {
            $misc.node = { node: e.detail.node.split(':')[0], port: parseInt(e.detail.node.split(':')[1]) }
            nodeFailed = false
        }
    }

</script>

<main>
{#if nodeFailed}
    <div class="backdrop">
        <NodeSelector on:connect={(e) => setNode(e)} on:back={() => nodeFailed = false}/>
    </div>
{/if}

{#if wallet == false}

    <div in:fade class="wrapper">
        <div class="init">
            <h1>Hugin</h1>
            <div>
                <FillButton disabled="{false}" text="Create Account" on:click="{() => goTo(false)}"/>
                <FillButton disabled="{false}" text="Restore Account" on:click="{() => goTo(true)}"/>
            </div>
            <p style="color: white; opacity: 30%">v{$misc.version}</p>
        </div>
    </div>

{:else if wallet == undefined}

    <div class="wrapper">
        <Moon color="#ffffff" size="30" unit="px"/>
    </div>

{/if}
</main>
<style lang="scss">

  main {
      display: flex;
      height: 100vh;
      overflow: hidden;
      z-index: 3;
      width: 100%;
  }
  .wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    color: #fff;
  }

  .login-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    justify-content: center;
    align-items: center;
  }

  .init {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 2rem;

    div {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
  }

  .field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 6px 0 10px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 8px;
    transition: 100ms ease-in-out;

    &:focus-within {
      border: 1px solid #404040;
    }

    input {
      margin: 0 auto;
      width: 200px;
      height: 48px;
      transition: 200ms ease-in-out;
      color: var(--text-color);
      background-color: transparent;
      border: none;
      font-size: 1.1rem;

      &:focus {
        outline: none;
      }
    }

    button {
      border: none;
      background-color: #252525;
      height: 36px;
      width: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 5px;
      cursor: pointer;
      transition: 100ms ease-in-out;

      &:hover {
        background: #303030;
      }
    }
  }

  .enableLogin {
    background-color: #3fd782 !important;
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

</style>
