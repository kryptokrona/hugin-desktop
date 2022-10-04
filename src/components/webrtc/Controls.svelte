<script>
  import VideoIcon from "$components/buttons/VideoIcon.svelte";
    import VideoSlash from "/src/components/buttons/VideoSlash.svelte";
    import MicIcon from "$components/buttons/MicIcon.svelte";
    import MuteIcon from "/src/components/buttons/MuteIcon.svelte";
    import Screenshare from "$components/buttons/Screenshare.svelte";
    import CallSlash from "$components/buttons/CallSlash.svelte";
    import MessageIcon from "$components/buttons/MessageIcon.svelte";
    import { videoGrid } from "$lib/stores/layout-state.js";
    import { webRTC } from "$lib/stores/user.js";
    import Sources from "$components/chat/Sources.svelte";
  
  
    let muted = false;
    let video = true
    //Share screen
    const switchStream = async () => {
        await window.api.shareScreen(false)
    }
    
    //End call with all peers
    const endCall = () => {
      $webRTC.call.forEach(a => {
        window.api.endCall("peer", "stream", a.chat)
      })
      //We pause the ringtone and destroy the popup
    };
  
    const toggleAudio = () => {
      muted = !muted;
      $webRTC.myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled)
    };
  
    const toggleVideo = () => {
    video = !video;
    $webRTC.myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled)
    };

</script>

<div class="wrapper layered-shadow">
  <div>
    <div on:click>
      <p>Time</p>
    </div>
  </div>
  <div class="controls">
    <div class="icon" on:click={() => toggleVideo()}>
    {#if !video}
      <VideoSlash/>
    {:else}
      <VideoIcon/>
    {/if}
    </div>
    <div class="icon" on:click={toggleAudio} >
    {#if !muted}
      <MicIcon/>
    {:else}
      <MuteIcon/>
    {/if}
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