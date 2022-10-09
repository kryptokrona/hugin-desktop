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
  import VideoSources from "$components/chat/VideoSources.svelte";
  import AudioSources from "/src/components/chat/AudioSources.svelte";
  import Contacts from "/src/components/chat/Contacts.svelte";
  import { onMount } from "svelte";
  import { calcTime } from "$lib/utils/utils.js";
  import HideVideoGrid from "$components/buttons/HideVideoGrid.svelte";

  let muted = false;
  let video = true;
  let startTime = Date.now();
  let time = '0:00:00'

  onMount(() => {
    setInterval(() => {
      let currentTime = Date.now();
      let ms = currentTime - startTime;
      time = calcTime(ms)
    }, 1000)
  });

  //Share screenpmn
  const switchStream = async () => {
    if (!$webRTC.screenshare) {
    await window.api.shareScreen(false);
    $webRTC.screenshare = true
    }
  };

  //End call with all peers
  const endCall = () => {
    $webRTC.call.forEach(a => {
      window.api.endCall('peer', "stream", a.chat);
    });
    //We pause the ringtone and destroy the popup
  };

  const toggleAudio = () => {
    muted = !muted;
    $webRTC.myStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
  };

  const toggleVideo = () => {
    video = !video;
    $webRTC.myStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
  };


</script>

<div class="wrapper layered-shadow">
  <div>
    <div on:click>
      <p>{time}</p>
    </div>
  </div>
  <div class="controls">
    <div class="icon" on:click={() => toggleVideo()}>
      {#if !video}
        <VideoSlash />
      {:else}
        <VideoIcon grid={true}/>
      {/if}
    </div>
    <div class="icon" on:click={toggleAudio}>
      {#if !muted}
        <MicIcon />
      {:else}
        <MuteIcon />
      {/if}
    </div>
    <div class="icon" on:click={switchStream}>
      <Screenshare />
    </div>
    <div class="icon" on:click={endCall}>
      <CallSlash />
    </div>
    <div class="icon">
    {#if $webRTC.myStream}
      <VideoSources />
    {/if}
  </div>
  <div class="icon">
      <Contacts />
  </div>
  <!-- <div class="icon">
      <AudioSources />
  </div> -->
  </div>
  <div class="icon" on:click={() => $videoGrid.showVideoGrid = false}>
    <HideVideoGrid/>
  </div>
  <div>
    <div class="icon" on:click={() => $videoGrid.showChat = !$videoGrid.showChat}>
      <MessageIcon />
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
      cursor: pointer;
    }
  }

</style>