<script>
  import MyVideo from "./MyVideo.svelte";
  import { webRTC, user } from "$lib/stores/user.js";
  import PeerVideo from "$components/webrtc/PeerVideo.svelte";
  import { fade } from "svelte/transition";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";
  import RtcGroupMessages from "$components/webrtc/RtcGroupMessages.svelte";

  let drag = false
  let videoCalls = []
  let join = false
  let groupKey = ""

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

  const joinGroupChat = () => {
      console.log('joining')
      $webRTC.groupCall = groupKey
      groupKey = ""
      join = false
    }

  $: groupKey

  $: videoCalls = $webRTC.call.filter(a => a.peerVideo === true)

  $: console.log('video calls', videoCalls)

</script>




<div class:hide={!$webRTC.showVideoGrid} class="grid">

  <RtcGroupMessages />


  <div class="wrapper">
    <div class="videogrid">
    <p on:click={close}>Close</p>
    <p on:click={()=> join = !join}>Join chat</p>
    <div class="exit">

      <div class="join_group" class:hide={!join}><input placeholder="Input group key" type="text" bind:value={groupKey}>
        <GreenButton on:click={joinGroupChat} enabled={groupKey.length > 1} disabled={false} text="Join" />
      </div>
    </div>
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
  </div>

</div>
<style lang="scss">
  .grid {
      box-sizing: border-box;
      position: absolute;
      display: flex;
      height: 100vh;
      width: 100%;
      z-index: 499;
      pointer-events: all;
      background: rgba(0,0,0,0.94);
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
    bottom: 10px;
    right: 25px;
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

  .left_side {
    display: flex;
    flex-direction: column;
    width: 100%;
  }

  .wrapper {
    max-width: 100%;
    display: flex;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
  }

  .hide {
    display: none
  }

  .videogrid {
    width: 100%;
    display: flex;
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
