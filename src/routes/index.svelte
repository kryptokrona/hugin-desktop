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
  import { openURL } from "$lib/utils/utils.js";

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

    $user.username = window.localStorage.getItem("userName");

    if (!$user.username) $user.username = "Anon";

    window.api.receive("wallet-exist", async (data, walletName) => {
      wallet = data;
      if (walletName === undefined) return;
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
      };
    });
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
      };
    });

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
    myPassword = "";
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

  window.addEventListener("keyup", e => {
    if (enableLogin && e.keyCode === 13) {
      handleLogin();
      enableLogin = false;
    }
  });

</script>
<div class="wrapper" in:fade out:fade="{{duration: 200}}">
  {#if wallet}
    <div class="login-wrapper">
      <h2 class="title">Sign into your account</h2>
      <!--<p class="wallets">{thisWallet}</p>-->
      <input type="password" placeholder="Password" bind:value={myPassword}>
      <GreenButton text="Log in" enabled={enableLogin} on:click={handleLogin} />
    </div>
    <div in:fade class="hero">
      <div></div>
      <div>
        <HuginArt />
        <div in:fly="{{y: 100}}" class="socials">
          <p on:click={()=> openURL('https://github.com/kryptokrona/hugin-svelte')}>Github</p>
          <p on:click={()=> openURL("https://github.com/kryptokrona/hugin-svelte/issues")}>Support</p>
          <p on:click={()=> openURL("https://hugin.chat")}>Website</p>
        </div>
      </div>
      <div></div>
    </div>
  {:else}
    <div in:fade class="hero">
      <div></div>
      <div class="center">
        <HuginArt />
        <GreenButton disabled={false} text="Create Account" on:click={() => goto('/create-account')} />
      </div>
      <div></div>
    </div>
  {/if}
  {#if !loginStatus}
    <p class="error">{errorMessage}</p>
  {/if}
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
    width: 100%;
    height: 100vh;
  }

  .title {
    width: 200px;
    margin-top: 0;
    margin-bottom: 30px;
    text-align: center;
  }

  .hero {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
    height: 100vh;
    z-index: 3;

    .center {
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 2rem;
      align-items: center;
    }
  }

  .socials {
    display: flex;
    gap: 20px
  }

  .show {
    display: block;
  }

  input {
    background-color: var(--backgound-color);
    border: 1px solid var(--border-color);
    border-radius: 0.4rem;
    color: var(--title-color);
    padding: 0 10px;
    margin-bottom: 20px;
    width: 100%;
    max-width: 200px;
    font-size: 1rem;
    height: 40px;
    font-family: "Roboto Mono", monospace;

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
