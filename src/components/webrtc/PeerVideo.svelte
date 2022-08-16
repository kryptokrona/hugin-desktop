<script>
  //To handle true and false, or in this case show and hide.
  import { fade, fly } from "svelte/transition";
  import { cubicOut, cubicIn } from "svelte/easing";
  import { onDestroy, onMount } from "svelte";
  import { user, webRTC } from "$lib/stores/user.js";
  import { createEventDispatcher } from "svelte";
  import { page } from "$app/stores";
  import { draggable } from "@neodrag/svelte";

  let peerVideo = document.getElementById("peerVideo");
  let peerStream;
  let thisCall;
  let move = false;
  let boards = false;
  export let call;

  const dispatch = createEventDispatcher();

  const moveVideo = (e) => {
    dispatch("move", {
      index
    });
  };

  // When incoming call and this get mounted we play the ringtone
  onMount(() => {
    console.log("peerVideo call", call);
    console.log("before", call.peerStream);
    peerVideo.srcObject = call.peerStream;
    console.log("peerVideo call", call);
    playVideo();

  });

  //When a user clicks answer
  const pauseVideo = () => {
    console.log("pausevideo");
    peerVideo.pause();

  };

  const playVideo = () => {
    console.log("play video");
    peerVideo.play();
  };

  //As a precaution we pause the ringtone again when destroyed
  onDestroy(() => {
    peerVideo.pause();
  });


  const toggleWindow = () => {
    hide = !hide;
  };

  $: if ($webRTC.peerVideo) thisCall = call.chat;

  $: if ($page.url.pathname === "/messages" && $user.activeChat.chat == thisCall) {
    boards = false;
    move = false;
  } else if ($page.url.pathname === "/boards") {
    move = true;
    boards = true;
  } else {
    boards = false;
    move = true;
  }


  $: console.log("$webRTC active call", call);
</script>

<audio src={peerStream}></audio>
<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<video class:toggleVideo={move} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}
       class:hide={move} class:boards={boards}
       use:draggable={{bounds: "parent"}}>
  <!-- <div class="options">
      <img src="/static/images/call.svg" alt="">
  </div>
    <div class="decline hover" on:click={pauseVideo} >
        <img src="/static/images/call-slash.svg" alt="">
    </div>
</div> -->
</video>

<style lang="scss">

  video {
    background-color: #171717;
    border-radius: 5px;
    box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.1);
    z-index: 500;
    height: 225px;
    width: 300px;
  }

  .caller {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
  }

  .options {
    display: flex;
  }

  .answer {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 15px;
    transition: 250ms ease-in-out;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .decline {
    display: flex;
    justify-content: center;
    gap: 10px;
    padding: 15px;
    transition: 250ms ease-in-out;
    border-left: 1px solid rgba(255, 255, 255, 0.1);
  }

  .hover:hover {
    background-color: rgba(255, 255, 255, 0.1);
    cursor: pointer;
  }

  h3, p {
    margin: 0;
    color: rgba(255, 255, 255, 0.8);
    font-weight: normal;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis
  }

  .hide {
    width: 200px;
    height: 150px;
    top: 500px;
    left: 120px;
    transition: 0.3s;
  }

  .toggleVideo {
    width: 200px !important;
    transition: 0.3s;
  }

  .boards {
    left: 120px;
  }


</style>
