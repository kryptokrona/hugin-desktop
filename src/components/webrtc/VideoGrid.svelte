<script>
  import MyVideo from "./MyVideo.svelte";
  import { webRTC } from "$lib/stores/user.js";
  import PeerVideo from "$components/webrtc/PeerVideo.svelte";

  let drag = false
  let videoCalls = []
  const dragWindow = () => {
    console.log('dragwindow', drag)
    drag = true
  }

  const noDrag = () => {
    drag = false
  }

  $: videoCalls = $webRTC.call.filter(a => a.peerVideo === true)

  $: console.log('video calls', videoCalls)

</script>

<div class:drag={drag} class="grid">
  {#if  $webRTC.myVideo}
    <MyVideo 
        on:drag={dragWindow}
        on:nodrag={noDrag}/>
  {/if}

  {#if videoCalls.length}
    {#each videoCalls as peer (peer.chat)}
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
