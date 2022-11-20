<script>
import {fade} from 'svelte/transition'
import { misc, user} from '$lib/stores/user.js'
import {Moon} from "svelte-loading-spinners";
import ArrowRight from "$lib/components/icons/ArrowRight.svelte";
import {goto} from '$app/navigation'
import { onDestroy, onMount } from 'svelte'
import toast from 'svelte-french-toast'

let myPassword = ""
let enableLogin = false

onMount(() => {
  $misc.loading = false
})

onDestroy(() => {
  window.api.removeAllListeners('login-failed')
  window.api.removeAllListeners('login-success')
})
$: {
    enableLogin = myPassword.length > 1
}

const enter = (e) => {
    if (enableLogin && e.keyCode === 13) {
        handleLogin()
        enableLogin = false
    }
}

//Handle login, sets logeged in to true and gets user address
const handleLogin = async (e) => {
    if (!$user.started) {
        $misc.loading = true
    }
    let accountData = {
        node: $misc.node.node,
        port: $misc.node.port,
        thisWallet: $user.thisWallet,
        myPassword: myPassword,
    }
  window.api.send('login', accountData)
}

const loginSuccess = async () => {
    await goto('/dashboard')
    $user.loggedIn = true
    $misc.loading = false
}

window.api.receive('login-success', async () => {
      loginSuccess()
})

window.api.receive('login-failed', async () => {
    toast.error('Wrong password', {
        position: 'top-right',
        style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
    })
    $misc.loading = false
})

</script>

<svelte:window on:keyup|preventDefault="{enter}"/>

<div class="wrapper" in:fade>
    <div class="login-wrapper">
        <h1>Hugin</h1>
        <div class="field">
            <input placeholder="Password..." type="password" bind:value="{myPassword}"/>
            <button on:click={handleLogin} class:enableLogin={enableLogin === true}>
                {#if $misc.loading}
                    <Moon color="#000000" size="20" unit="px"/>
                {:else}
                    <ArrowRight/>
                {/if}
            </button>
        </div>
        <p style="color: white; opacity: 30%">v{$misc.version}</p>
    </div>
</div>

<style lang="scss">

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

