<script>
  import { fade, fly } from "svelte/transition";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";
  import FillButton from "/src/components/buttons/FillButton.svelte";
  import { user, misc } from "$lib/stores/user.js";
  import { nodelist } from "$lib/stores/nodes.js";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { messages } from "$lib/stores/messages.js";
  import HuginArt from "/src/components/HuginArt.svelte";
  let wallet;
  let walletName;
  let myPassword = "";
  let data;
  let thisWallet;
  let loginStatus = true;
  let errorMessage = "Wrong password";
  let enableLogin = false;

  onMount(() => {
    window.api.send("app", true);

    $user.username = window.localStorage.getItem('userName')

    if (!$user.username) $user.username = 'Anon';

    window.api.receive("wallet-exist", async (data, walletName) => {
      wallet = data;
      if (walletName === undefined) return 
      console.log("wallet exists", walletName);
      thisWallet = walletName[0];
    });
  });

  window.api.receive("login-failed", async () => {
    console.log("failed login");
    loginStatus = false;
    misc.update(oldData => {
				return {
						...oldData,
						loading: false
				}
		})
  });

  //Handle login, sets logeged in to true and gets user address
  const handleLogin = async () => {
    loginStatus = true;
    let accountData = {
      thisWallet: thisWallet,
      myPassword: myPassword
    };
    console.log("data", accountData);

    misc.update(oldData => {
				return {
						...oldData,
						loading: true
				}
		})

    window.api.send("login", accountData);

  };

  let node;
  const switchNode = () => {
    window.api.switchNode(node);
    user.update(oldData => {
      return {
        ...oldData,
        node: node
      };
    });
  };

  $ :  myPassword;
  $ :  console.log("mypass", myPassword);

  window.api.receive("wallet-started", async (myContacts, node) => {

    //Set contacts to store
    user.update(data => {
      return {
        ...data,
        loggedIn: true,
        contacts: myContacts
      };

    });
    //Set chosen node from last startup in store
    misc.update(oldData => {
      return {
        ...oldData,
        node: node.node + ":" + node.port
      };
    });


    //Get messages and save to a svelte store variable.
    messages.set(await window.api.getMessages(res => {
    }));


    //Go to dashboard if login was successful
    goto("/dashboard");
    myPassword = ""
  });

  //Sets our own address in svelte store
  window.api.receive("addr", async (huginAddr) => {
    console.log("Addr incoming");
    user.update(data => {
      return {
        ...data,
        huginAddress: huginAddr
      };
    });
  });

  $: {
    if (myPassword.length > 1) {
      //Enable add button
      enableLogin = true;

    } else {
      enableLogin = false;
    }
  }

  window.addEventListener('keyup', e => {
        if (enableLogin && e.keyCode === 13) {
            handleLogin()
            enableLogin = false
        }
    })

const openURL = (url) => {
  console.log(url)
  let link = url.target.attributes[0].nodeValue
  window.api.send('openLink', link)
}

</script>
<div class="wrapper" in:fade out:fade="{{duration: 200}}">
  <div class="login-wrapper">
    <div class="login-wrapper">
      {#if wallet}
        <!-- <h1 class="title">Welcome back {$user.username} 👋</h1> -->
        <h3 class="title">Log in to wallet:</h3>
        <p class="wallets">{thisWallet}</p>
        <input type="password" placeholder="Something safe" bind:value={myPassword}>
        <GreenButton text="Log in" enabled={enableLogin} on:click={handleLogin} />
      {:else}
        <FillButton text="Create Account" url="/create-account" />
      {/if}
      {#if !loginStatus}
        <p class="error">{errorMessage}</p>
      {/if}
    </div>
    <!-- <select bind:value={node}>
      {#each $nodelist as node}
        <option value={`${node.url}:${node.port}`}>{node.name}</option>
      {/each}
    </select>
    <button on:click={switchNode}>Connect</button> -->
  </div>
  <div in:fade class="hero">
    <div></div>
    <div>
      <HuginArt/>
    </div>
    <!--
    <div in:fly="{{y: 100}}" class="socials">
      <a link="https://github.com/kryptokrona/hugin-svelte" on:click={(e)=> openURL(e)}>Github</a>
      <a link="https://github.com/kryptokrona/hugin-svelte/issues" on:click={(e)=> openURL(e)}>Support</a>
      <a link="https://hugin.chat"  on:click={(e)=> openURL(e)}>Website</a>
    </div>
    -->
    <div></div>
  </div>
</div>

<style lang="scss">

  .wrapper {
    display: flex;
    height: 100vh;
    color: #fff;
    z-index: 3;
  }

  .login-wrapper {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    width: 50%;
    height: 100vh;
  }

  .title {
    width: 270px;
    margin-top: 0;
    margin-bottom: 30px;
    display: contents;
  }

  .hero {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 50%;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    height: 100vh;
    z-index: 3;
  }

  .socials {
    display: flex;
    gap: 20px
  }

  .show {
    display: block;
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
    font-size: 15px !important;
    width: 85%;
    font-size: 16px;
    height: 40px;
    display: inline-flex;
    position: relative;
    font-family: "Roboto Mono";
    padding-left: 15px;

    &:focus {
      outline: none;
      border: 1px solid var(--title-color);
    }
  }

  .error {
    color: red
  }

  a {
    cursor: pointer;
    font-family: "Roboto Mono";
    color: white;
  }

</style>
