<script>
  //To handle true and false, or in this case show and hide.
  import { fade, fly } from "svelte/transition";
  import { cubicOut, cubicIn } from "svelte/easing";
  import { onDestroy, onMount } from "svelte";
  import { user, webRTC } from "$lib/stores/user.js";
  import { createEventDispatcher } from "svelte";
  import { page } from "$app/stores";
  import { draggable } from "@neodrag/svelte";
  import Minus from '/src/components/buttons/Minus.svelte'
  import Plus from '/src/components/buttons/Plus.svelte'
  
  let peerVideo = document.getElementById("peerVideo");
  let peerStream;
  let thisCall;
  let move = false;
  let window_max = false
  let window_medium = false
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

  $: if ($webRTC.peerVideo) thisCall = call.chat;

  const resize = (size) => {
    if (window_medium  && size == 'medium') {
      size = 'max'
    }
    if (window_max && size == 'min') {
      size = 'medium'
    }
    switch (size) {
      case 'min':
      window_max = false
      window_medium = false
      break;
      case 'medium':
      window_max = false
      window_medium = true
      break;
      case 'max':
      window_max = true
      window_medium = false
    }
  }

  $: window_medium
  $: window_max


  $: console.log("$webRTC active call", call);
</script>

<div class="card" use:draggable={{bounds: "parent"}} class:max_window={window_max} class:medium_window={window_medium}
on:mouseenter={(e)=> dispatch('drag')} on:mouseleave={(a)=> dispatch('nodrag')}
>
<video class:toggleVideo={move} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}
       class:hide={move}>
</video>
<div class="fade">
  <div class="toggles">
    <Minus on:click={()=> resize('min')}/>
    <Plus on:click={()=> resize('medium')}/>
  </div>
</div>
</div>
<style lang="scss">

  .card {
    position: relative;
    display: flex;
    background-color: #171717;
    border-radius: 10px;
    box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid var(--card-border);
    z-index: 500;
    height: 203px;
    width: 360px;
    pointer-events: all;
    transition: 0.35s;
    cursor: pointer;

    .fade {
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      bottom: 0;
      width: 100%;
      height: 100px;
      z-index: 501;
      opacity: 0%;
      transition: 200ms ease-in-out;
      border-radius: 0 0 10px 10px;
    }

    &:hover {
      .fade {
        opacity: 100%;
        background-image: linear-gradient(180deg, #00000000, #000000);
        pointer-events: visible;
      }
    }

    .toggles {
      display: flex;
      width: 100%;
      justify-content: space-evenly;
      align-items: center;
    }

    video {
      position: absolute;
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: inherit;
    }
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
    width: 60px !important;
    height: 50px;
    transition: 0.3s;
  }

  .toggleVideo {
    width: 60px !important;
    transition: 0.3s;
  }

  .toggle_window {
    color: white;
    width: 50px;
    height: 20px;
    font-size: 12px;
    font-family: "Montserrat";
    background: royalblue;
    position: absolute;
    display: block;
    z-index: 3;
    bottom: -15px;
    border-radius: 10px;
  }

  .max_window {
    width: 1000px;
    height: 800px;
    transition: 0.35s;
  }
 
 .medium_window {
    width: 650px;
    height: 400px;
    transition: 0.35s;
 }

 .resize {
    color: white;
    font-size: 30px;
    position: relative;
    display: inline-block;
}


</style>
