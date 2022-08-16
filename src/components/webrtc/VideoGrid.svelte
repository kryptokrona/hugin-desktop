<script>
  import MyVideo from "./MyVideo.svelte";
  import { webRTC } from "$lib/stores/user.js";
  import PeerVideo from "$components/webrtc/PeerVideo.svelte";


</script>

<div class="grid">
  <MyVideo />
  <MyVideo />
  <!--{#if $webRTC.call}
    {#each $webRTC.call as peer}
      <PeerVideo call={peer} />
    {/each}
  {/if}-->
</div>

<style>
    .grid {
        box-sizing: border-box;
        position: absolute;
        height: 100vh;
        width: 100%;
        z-index: 499;
    }
</style>
