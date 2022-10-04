<script>
  import VideoIcon from "$components/buttons/VideoIcon.svelte";
  import MicIcon from "$components/buttons/MicIcon.svelte";
  import Screenshare from "$components/buttons/Screenshare.svelte";
  import CallSlash from "$components/buttons/CallSlash.svelte";
  import MessageIcon from "$components/buttons/MessageIcon.svelte";
  import { videoGrid } from "$lib/stores/layout-state.js";
  import { webRTC } from "$lib/stores/user.js";
  import Sources from "$components/chat/Sources.svelte";

  const switchStream = async () => {
    if (!$webRTC.screen_stream) {
      await window.api.shareScreen(false)
    } else {
      window.api.setCamera()
    }

  }

  const endCall = () => {
    //We delay the answerCall for routing purposes
    $webRTC.call.forEach(a => {
      window.api.endCall("peer", "stream", a.chat)
    })
    //We pause the ringtone and destroy the popup
  };

  const toggleWindow = () => {
    $webRTC.showVideoGrid = !$webRTC.showVideoGrid
  }

</script>

<div class="wrapper layered-shadow">
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
    <div class="icon" on:click={switchStream}>
      <Screenshare/>
    </div>
    <div class="icon" on:click={endCall}>
      <CallSlash/>
    </div>
    {#if $webRTC.myStream}
      <Sources/>
    {/if}
  </div>
  <div class="icon">
    <p on:click={() => $videoGrid.showVideoGrid = !$videoGrid.showVideoGrid}>Hide</p>
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