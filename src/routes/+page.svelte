<script>
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
    if (e.detail.node) {
      $misc.node = {node: e.detail.node.split(':')[0], port: parseInt(e.detail.node.split(':')[1])}
      nodeFailed = false
    }
  }

</script>

{#if nodeFailed}
  <div class="w-full h-full">
    <NodeSelector on:connect={(e) => setNode(e)} on:back={() => nodeFailed = false}/>
  </div>
{/if}

{#if wallet === false}

  <div class="flex flex-col h-full max-w-xs justify-center mx-auto text-center">
    <h1 class="text-2xl font-bold">Hugin</h1>
    <div class="flex flex-col gap-2">
      <FillButton disabled="{false}" text="Create Account" on:click="{() => goTo(false)}"/>
      <FillButton disabled="{false}" text="Restore Account" on:click="{() => goTo(true)}"/>
    </div>
    <p class="text-white opacity-50">v{$misc.version}</p>
  </div>

{:else if wallet === undefined}

  <Moon color="#ffffff" size="30" unit="px"/>

{/if}
