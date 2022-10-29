<script>
    import { fade } from 'svelte/transition'
    import { misc, user } from '$lib/stores/user.js'
    import FillButton from '/src/components/buttons/FillButton.svelte'
    import { goto } from '$app/navigation'
    import NodeSelector from '$components/popups/NodeSelector.svelte'

    let mnemonic = ''
    let blockHeight
    let password = ''
    let confirmPassword = ''
    let completed = false
    let username = ''
    let walletName = ''
    let nodeInput = ''
    let step = 1

    const enter = (e) => {
        if (e.key === 'Enter' && password.length && step === 3) {
            handleLogin()
        } else if (e.key === 'Enter' && step < 3) {
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

        user.update((oldData) => {
            return {
                ...oldData,
                loading: true,
            }
        })

        window.api.send('create-account', accountData)
        console.log('Creating user account', accountData)

        username = ''
        password = ''
        step = 1

        goto('/dashboard')
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
</script>

<svelte:window on:keyup|preventDefault={enter} />
<main in:fade>
    {#if step === 1 && $user.restore}
        <div in:fade class="wrapper">
            <h2>Please enter your mnemonic seed</h2>

            <input
                spellcheck="false"
                placeholder="Type your mnemonic here"
                bind:value={mnemonic}
            />
            <input
                type="text"
                spellcheck="false"
                placeholder="Blockheight"
                bind:value={blockHeight}
            />

            <div class="button_wrapper">
                <FillButton
                    text="Back"
                    disabled={false}
                    on:click={() => {
                        $user.restore = false
                        goto('/')
                    }}
                />
                <FillButton
                    disabled={mnemonic.length < 0}
                    enabled={mnemonic.length > 0}
                    text="Next"
                    on:click={() => createAcc()}
                />
            </div>
        </div>
    {/if}

    {#if step === 1 && !$user.restore}
        <div in:fade class="wrapper">
            <h2>Select you username</h2>
            <input
                type="text"
                spellcheck="false"
                placeholder="Username"
                bind:value={username}
            />

            <div class="button_wrapper">
                <FillButton
                    text="Back"
                    disabled={false}
                    on:click={() => goto('/')}
                />
                <FillButton
                    disabled={username.length < 0}
                    enabled={username.length > 0}
                    text="Next"
                    on:click={() => (step = 2)}
                />
            </div>
        </div>
    {:else if step === 2}
        <div in:fade class="wrapper">
            <h1>Create wallet</h1>
            <input
                type="text"
                placeholder="Wallet name"
                bind:value={walletName}
            />
            <input
                type="password"
                placeholder="Password"
                bind:value={password}
            />
            <input
                type="password"
                placeholder="Confirm Password"
                bind:value={confirmPassword}
            />

            <div
                style="display: flex; gap:1rem; width: 100%; justify-content: center"
            >
                <FillButton
                    disabled={false}
                    text="Back"
                    on:click={() => (step = 1)}
                />
                <FillButton
                    disabled={!(
                        walletName.length > 0 &&
                        password.length > 0 &&
                        password === confirmPassword
                    )}
                    text="Next"
                    enabled={walletName.length > 0 &&
                        password.length > 0 &&
                        password === confirmPassword}
                    on:click={() => (step = 3)}
                />
            </div>
        </div>
    {:else if step === 3}
        <NodeSelector
            on:back={() => (step = 2)}
            on:connect={(e) => handleLogin(e)}
        />
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
</style>
