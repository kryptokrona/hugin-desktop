<script>
  import MyVideo from "./MyVideo.svelte";
  import { webRTC } from "$lib/stores/user.js";
  import PeerVideo from "$components/webrtc/PeerVideo.svelte";

  let drag = false

  const dragWindow = () => {
    console.log('dragwindow', drag)
    drag = true
  }

  const noDrag = () => {
    drag = false
  }

</script>

<div class:drag={drag} class="grid">
  {#if  $webRTC.myVideo}
    <MyVideo 
        on:drag={dragWindow}
        on:nodrag={noDrag}/>
  {/if}

  {#if  $webRTC.peerVideo}
    {#each $webRTC.call as peer}
      <PeerVideo 
            on:drag={dragWindow}
            on:nodrag={noDrag}
            call={peer} />
      
    {/each}
  {/if}
</div>

<style>
    .grid {
        box-sizing: border-box;
        position: absolute;
        height: 100vh;
        width: 100%;
        z-index: 499;
        pointer-events: none;
    }

    .drag {
      pointer-events: visible;
    }
</style>
