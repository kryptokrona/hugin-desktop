<script>
    import {fade} from 'svelte/transition'
    import FillButton from '/src/components/buttons/FillButton.svelte'
    import {groups, misc, user} from '$lib/stores/user.js'
    import {onMount} from 'svelte'
    import {goto} from '$app/navigation'
    import toast, {Toaster} from 'svelte-french-toast'
    import ArrowRight from "$components/icons/ArrowRight.svelte";
    import {Moon} from "svelte-loading-spinners";

    let wallet
    let myPassword = ''
    let data
    let thisWallet
    let enableLogin = false

    onMount(() => {
        window.api.send('app', true)
        window.api.receive('version', version => {
            $misc.version = version
        })

        $user.username = window.localStorage.getItem('userName')
        if (!$user.username) $user.username = 'Anon'

        window.api.receive('wallet-exist', async (data, walletName) => {
            wallet = data
            if (walletName === undefined) return
            console.log('wallet exists', walletName)
            thisWallet = walletName[0]
        })

    })

    window.api.receive('login-failed', async () => {
        toast.error('Wrong password', {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
        myPassword = ''
        $misc.loading = false
    })

    //Handle login, sets logeged in to true and gets user address
    const handleLogin = () => {
        $misc.loading = true
        let accountData = {
            thisWallet: thisWallet,
            myPassword: myPassword,
        }
        window.api.send('login', accountData)
    }

    window.api.receive('wallet-started', async (node, my_groups) => {

        console.log('Got wallet started')
        //Set chosen node from last startup in store
        $misc.node = node.node + ':' + node.port

        console.log('adding groups', my_groups)
        $groups.groupArray = my_groups

        myPassword = ''
        await goto('/dashboard')
        $user.loggedIn = true
    })

    //Sets our own address in svelte store
    window.api.receive('addr', async (huginAddr) => {
        console.log('Addr incoming')
        $user.huginAddress = huginAddr
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

    const goTo = restore => {
        $user.restore = !!restore
        goto('/create-account')
    }

</script>

<svelte:window on:keyup|preventDefault="{enter}"/>
<Toaster/>

{#if wallet}
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
{:else}

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

{/if}

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

</style>
