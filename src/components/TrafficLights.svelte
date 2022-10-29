<div class="traffic">
    <div on:click={() => window.api.send('close')} class="light"></div>
    <div on:click={() => window.api.send('min')} class="light"></div>
</div>

<style lang="scss">

  .traffic {
    position: fixed;
    display: flex;
    gap: 5px;
    padding: 10px;
    z-index: 999;
  }

  .light {
    width: 13px;
    height: 13px;
    border-radius: 20px;
    background-color: #454545;
    transition: 200ms ease-in-out;
    cursor: pointer;

    &:first-child {
      &:hover {
        background-color: var(--warn-color);
      }
    }

    &:last-child {
      &:hover {
        background-color: var(--alert-color);
      }
    }
  }
</style>