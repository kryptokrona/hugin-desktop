<script>
  import { run, preventDefault } from 'svelte/legacy';

import {fade, fly} from 'svelte/transition'
import { misc, notify, user} from '$lib/stores/user.js'
import {Moon} from "svelte-loading-spinners";
import ArrowRight from "$lib/components/icons/ArrowRight.svelte";
import {goto} from '$app/navigation'
import { getContext, onDestroy, onMount, setContext } from 'svelte'
import toast from 'svelte-5-french-toast'
import NodeSelector from "$lib/components/popups/NodeSelector.svelte";
import {layoutState} from "$lib/stores/layout-state.js";
import { sleep } from '$lib/utils/utils'
	import { page } from '$app/state';

let myPassword = $state("")
let enableLogin = $state(false)
let loadSpin = $state(false)
let errNode = $state(false)
let passwordField = $state()
let started = $derived($user.started)

run(() => {
  //   if (errNode) {
  //   $layoutState.showNodeSelector = true
  // }
  });

onMount(async () => {
  $misc.loading = false
  await sleep(200)
  passwordField.focus()
})

onDestroy(() => {
  window.api.removeAllListeners('login-failed')
})

$effect(() => {
    enableLogin = myPassword.length > 1
});

const enter = async (e) => {
  if (enableLogin && e.key === 'Enter') {

    if ($user.started) {
      await checkPass()
      return
    }
    handleLogin(e)
    enableLogin = false
  }
}

const checkPass = async () => {
  $user.idleTime = 0
  loadSpin = true
  const verify = await window.api.verifyPass(myPassword)
  if (!verify) {
    window.api.errorMessage('Wrong password')
    $misc.loading = false
    loadSpin = false
  }
  if (verify) {
      loadSpin = false
      $layoutState.showNodeSelector = false
      $misc.loading = false
      goto("/dashboard")
      $user.loggedIn = true
  }
}

//Handle login, sets logeged in to true and gets user address
const handleLogin = async (e) => {
  if ($user.started) {
    checkPass()
    return
  }
    
  let node = $misc.node.node
  let port = $misc.node.port
  loadSpin = true
  if(e.node) {
      node = e.node.split(':')[0]
      port = parseInt(e.node.split(':')[1])
  }
  
   $user.idleTime = 0

  if (!$user.started) {
      $misc.loading = true
  }
  let accountData = {
      node: node,
      port: port,
      thisWallet: $user.thisWallet,
      myPassword: myPassword,
  }
  window.api.send('login', accountData)
}

window.api.receive('login-failed', async () => {
    toast.error('Wrong password', {
        position: 'top-right',
        style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
    })
    $layoutState.showNodeSelector = false
    $misc.loading = false
    loadSpin = false
})

</script>

<svelte:window onkeyup={enter} />

<div class="wrapper" in:fly|global={{ delay: 300, duration: 300, y : 50 }} out:fly|global={{ delay: 100, duration: 100, y : -50 }}>
    {#if $layoutState.showNodeSelector}
        <NodeSelector goBack="{() => (errNode = false)}" onConnect="{(e) => handleLogin(e)}"/>
    {/if}
        <div class="login-wrapper" class:hide={$layoutState.showNodeSelector}>
            <h1>Hugin</h1>
            <div class="field">
                <input placeholder="Password..." type="password"  bind:this="{passwordField}" bind:value="{myPassword}"/>
                <button onclick={handleLogin} disabled={loadSpin && !enableLogin} class:enableLogin={enableLogin === true}>
                    {#if loadSpin}
                        <Moon color="var(--text-color)" size="20" unit="px"/>
                    {:else}
                        <ArrowRight/>
                    {/if}
                </button>
            </div>
            <p style="color: var(--text-color); opacity: 30%">v{$misc.version}</p>
        </div>
</div>

<style lang="scss">

.wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    width: 100%;
    color: var(--text-color);
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
      background-color: var(--border-color);
      height: 36px;
      width: 48px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: 5px;
      cursor: pointer;
      transition: 100ms ease-in-out;
      border: 1px solid transaparent;
      &:hover {
        background: var(--success-color);
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

  .hide {
    display: none;
  }
</style>

