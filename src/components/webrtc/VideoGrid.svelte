<script>
  import MyVideo from "./MyVideo.svelte";
  import { webRTC, user } from "$lib/stores/user.js";
  import PeerVideo from "$components/webrtc/PeerVideo.svelte";
  import { videoGrid } from "$lib/stores/layout-state.js";
  import { fade } from "svelte/transition";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";
  import RtcGroupMessages from "$components/webrtc/RtcGroupMessages.svelte";
  import Controls from "$components/webrtc/Controls.svelte";

  let drag = false;
  let videoCalls = [];
  let join = false;
  let groupKey = "";

  const dragWindow = () => {
    console.log("dragwindow", drag);
    drag = true;
  };

  const noDrag = () => {
    drag = false;
  };
  const close = () => {
    $webRTC.showVideoGrid = false;
  };

  const joinGroupChat = () => {
    console.log("joining");
    $webRTC.groupCall = groupKey;
    groupKey = "";
    join = false;
  };

  $: groupKey;

  $: videoCalls = $webRTC.call.filter(a => a.peerVideo === true);

  $: console.log("video calls", videoCalls);


</script>

<div in:fade out:fade class:hide={!$videoGrid.showVideoGrid} class="layout">

  <!--
  <p on:click={close}>Close</p>
  <p on:click={()=> join = !join}>Join chat</p>
  <div class="exit">
    <div class="join_group" class:hide={!join}><input placeholder="Input group key" type="text" bind:value={groupKey}>
      <GreenButton on:click={joinGroupChat} enabled={groupKey.length > 1} disabled={false} text="Join" />
    </div>
  </div>
  -->
  <div class="video-wrapper">
    <div class="video-grid">
      {#if $webRTC.myVideo}
        <MyVideo />
        <MyVideo />
        <MyVideo />
      {/if}

      {#if videoCalls.length}
        {#each videoCalls as peer (peer.chat)}
          <PeerVideo call={peer} />
        {/each}
      {/if}
    </div>
    <Controls />
  </div>

  {#if $videoGrid.showChat}
    <RtcGroupMessages />
  {/if}
</div>


<style lang="scss">

  .layout {
    display: flex;
    position: absolute;
    gap: 1rem;
    padding: 1rem;
    background-color: var(--backgound-color);
    height: 100%;
    width: 100%;
    z-index: 9999;
  }

  .video-wrapper {
    display: flex;
    justify-content: space-between;
    flex-direction: column;
    width: 100%;
  }

  .video-grid {
    width: 100%;
    height: calc(100% - 73px);
    max-width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    vertical-align: middle;
    justify-content: center;
    align-items: center;
    align-content: center;
  }

  .fade {
    position: absolute;
    top: 0;
    width: 100%;
    height: 40px;
    background: linear-gradient(180deg, #121212, #12121200);
    z-index: 100;
  }

  .outer {
    display: flex;
    flex-direction: column-reverse;
    overflow: scroll;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .hide {
    display: none
  }


  input {
    box-sizing: border-box;
    background-color: transparent;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0 1rem;
    height: 35px;
    width: 100%;
    color: white;
    transition: 200ms ease-in-out;

    &:focus {
      outline: none;
      border: 1px solid rgba(255, 255, 255, 0.6);
    }
  }

  .join_group {
    position: absolute;
    display: flex;
  }


</style>
