<div class="top-bar">
    <div class="traffic">
        <div onclick={() => window.api.send('close')} class="light"></div>
        <div onclick={() => window.api.send('min')} class="light"></div>
    </div>
    <div class="top-drag draggable"></div>
</div>

<style lang="scss">

  .top-bar {
    position: fixed;
    top: 0;
    display: flex;
    width: 365px;
    z-index: 9999;
  }

  .traffic {
    display: flex;
    gap: 5px;
    padding: 10px;
  }

  .top-drag {
    height: 25px;
    width: 100%;
  }

  .light {
    width: 13px;
    height: 13px;
    border-radius: 20px;
    background-color: var(--border-color);
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
