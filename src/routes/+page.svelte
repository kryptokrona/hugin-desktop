<script>
  import { fade, fly } from "svelte/transition";
  import FillButton from "/src/components/buttons/FillButton.svelte";
  import { user, misc, groups } from "$lib/stores/user.js";
  import { onMount, onDestroy } from "svelte";
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

  window.api.receive("wallet-started", async (node, my_groups) => {
    //Set contacts to store
    user.update(data => {
      return {
        ...data,
        loggedIn: true,
      }

    });

    //Set chosen node from last startup in store
    misc.update(oldData => {
      return {
        ...oldData,
        node: node.node + ":" + node.port
      };
    });
    
    console.log('adding groups', my_groups)
    groups.update(oldData => {
      return {
        ...oldData,
        groupArray: my_groups
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

  const enter = (e) => {
    if (enableLogin && e.keyCode === 13) {
      handleLogin();
      enableLogin = false;
    }
  }

  function goTo(restore) {
    if (restore) {
      $user.restore = true;
    } else {
      $user.restore = false;
    }
    goto('/create-account')
  }

</script>
<svelte:window on:keyup|preventDefault={enter} />
<div class="wrapper" in:fade out:fade="{{duration: 200}}">
  {#if wallet}
    <div class="login-wrapper">
      <div>
        <h2 class="title">Sign into your account</h2>
        <input type="password" placeholder="Password" bind:value={myPassword}>
        <FillButton text="Log in" enabled={enableLogin} on:click={handleLogin} />
      </div>
    </div>
    <div in:fade class="hero">
      <div></div>
      <div>
        <HuginArt />
        <div in:fly="{{y: 100}}" class="socials">
          <p on:click={()=> openURL('https://github.com/kryptokrona/hugin-desktop')}>Github</p>
          <p on:click={()=> openURL("https://github.com/kryptokrona/hugin-desktop/issues")}>Support</p>
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
        <FillButton disabled={false} text="Create Account" on:click={() => goTo(false)} />
        <FillButton disabled={false} text="Restore Account" on:click={() => goTo(true)} />
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

    div {
      max-width: 200px;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
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
    gap: 55px;
    cursor: pointer;
  }

  .show {
    display: block;
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

  .error {
    color: red
  }

  a {
    cursor: pointer;
    font-family: "Roboto Mono";
    color: white;
  }

</style>
