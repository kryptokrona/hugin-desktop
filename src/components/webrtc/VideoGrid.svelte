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
  const close = () => {
    $webRTC.showVideoGrid = false
  }

  $: videoCalls = $webRTC.call.filter(a => a.peerVideo === true)

  $: console.log('video calls', videoCalls)

</script>


<div class:drag={drag} class="grid">
  <div class="exit" on:click={close}><p>Close</p></div>
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

<style lang="scss">
    .grid {
        box-sizing: border-box;
        position: absolute;
        height: 100vh;
        width: 100%;
        z-index: 499;
        pointer-events: all;
        background: rgba(0,0,0,0.9);
    }

    .drag {
      pointer-events: visible;
    }

    p {
      font-family: "Montserrat";
      font-size: 17px;
      cursor: pointer;
      color: #c9c5c5;
      &:hover {
        color: white;
      }
    }

    .exit {
      align-content: center;
    display: flex;
    position: absolute;
    bottom: 10px;
    right: 25px;
    }
</style>
