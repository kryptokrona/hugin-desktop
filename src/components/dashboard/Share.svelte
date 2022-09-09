<script>
  import { fade } from 'svelte/transition'
  import { user } from "$lib/stores/user.js";
  let open;
  let copied;

  function copyThis(copy) {
    navigator.clipboard.writeText(copy);
    buttonGlow()
  }

  const buttonGlow = () => {
    copied = true
    let timer = setTimeout(function() {
      copied = false
      open = false
    }, 1000);
  };

</script>

<div style="display: flex; flex-direction: column">
  <div class="share" class:border_rgb={copied} class:open={open} on:click={() => open = !open}>
    <h5>{copied ? 'Copied' : 'Copy'}</h5>
  </div>
  {#if open}
    <div in:fade class="list layered-shadow">
      <div on:click={() => copyThis($user.huginAddress.substring(0, 99))}>
        <h5>Address</h5>
      </div>
      <div on:click={() => copyThis($user.huginAddress.substring(99, 163))}>
        <h5>Key</h5>
      </div>
      <div on:click={() => copyThis($user.huginAddress)}>
        <h5>Both</h5>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .share {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    width: 120px;
    height: 38px;
    cursor: pointer;
    transition: 200ms;

    &:hover {
      background-color: var(--card-border);
    }
  }

  .open {
    border-color: var(--success-color);
  }

  .list {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 120px;
    padding: 5px;
    margin-top: 45px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;

    div {
      text-align: center;
      border-radius: 5px;
      padding: 10px;
      cursor: pointer;

      &:hover {
        background-color: var(--card-border);
      }
    }
  }
</style>