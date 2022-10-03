<script>

  import VideoIcon from "$components/buttons/VideoIcon.svelte";
  import MicIcon from "$components/buttons/MicIcon.svelte";
  import Screenshare from "$components/buttons/Screenshare.svelte";
  import CallSlash from "$components/buttons/CallSlash.svelte";
  import MessageIcon from "$components/buttons/MessageIcon.svelte";
  import { videoGrid } from "$lib/stores/layout-state.js";

  const keyDown = (e) => {
    if (e.key === "Space") {
      //If muted, push to talk
    } else if (e.key === "Shift" && e.key === "M") {
      //Start/stop mic
    } else if (e.key === "Shift" && e.key === "V") {
      //Start/stop video
    } else if (e.key === "Shift" && e.key === "C") {
      //Open/close chat
    }
  };

</script>

<svelte:window on:keydown={keyDown} />

<div class="wrapper">
  <div>
    <div on:click>
      <p>Time</p>
    </div>
  </div>
  <div class="controls">
    <div class="icon" on:click>
      <VideoIcon/>
    </div>
    <div class="icon" on:click>
      <MicIcon/>
    </div>
    <div class="icon" on:click>
      <Screenshare/>
    </div>
    <div class="icon" on:click>
      <CallSlash/>
    </div>
  </div>
  <div>
    <div class="icon" on:click={() => $videoGrid.showChat = !$videoGrid.showChat}>
      <MessageIcon/>
    </div>
  </div>
</div>

<style lang="scss">
  .wrapper {
    margin-top: 1rem;
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    padding: 0 1rem;
  }

  .controls {
    display: flex;
    gap: 1rem;
    align-items: center;

    .icon {

    }
  }

</style>