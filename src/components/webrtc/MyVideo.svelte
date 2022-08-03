<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {cubicOut , cubicIn} from "svelte/easing"
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {onDestroy, onMount} from "svelte";
    import {user, webRTC} from "$lib/stores/user.js";
    import {createEventDispatcher} from "svelte";
    import {page} from "$app/stores";
    let myVideo = document.getElementById('myVideo')
    let video = false
    let hide = true
    let hover = false
    let chatWindow = true
    let thisCall
    const dispatch = createEventDispatcher();

    // When incoming call and this get mounted we play the ringtone
    onMount( async () => {

          myVideo.srcObject = $webRTC.myStream
          myVideo.play();
          console.log('MyVidya',  $webRTC.myStream);
          console.log('MyVidya call',  $webRTC.call);

    })

    onDestroy(() => {
    })

    //Hover functions
    function enter() {
        hover = true;
    }

    function leave() {
        hover = false;
    }


    //When a user clicks answer
    const pauseVideo = () => {
      console.log('pausevideo');
      myVideo.pause()

    }

    const playVideo = () => {
      console.log('play video');
      myVideo.play()
    }

    //As a precaution we pause the ringtone again when destroyed
    onDestroy(() => {
    })
    
    const toggleWindow = () => {
        hide = !hide
    }

    $: if ($webRTC.myVideo) thisCall = $webRTC.call[0].sender

    $: if ($page.url.pathname === '/messages' && $user.activeChat.chat == thisCall.substring(0,99)) {
        chatWindow = true
        hide = false
    } else {
        chatWindow = false
        hide = true
    }

    $: video = $webRTC.call[0].myVideo

    $: console.log('$webRTC.', $webRTC);
</script>

<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div on:mouseenter={enter} on:mouseleave={leave} class:toggle={!chatWindow} class:hide={hide} in:fly="{{y: -100, duration:200, easing: cubicOut}}" out:fly="{{y: -100, duration: 200, easing: cubicIn}}" class="card">
  <div class="inner-card">

    
  <video  class:toggleVideo={hide} muted in:fade id="myVideo" playsinline autoplay bind:this={myVideo}></video>
 
  <!-- <div class="options">
    <div class="answer hover" on:click={playVideo} >
        <img src="/static/images/call.svg" alt="">
    </div>
      <div class="decline hover" on:click={pauseVideo} >
          <img src="/static/images/call-slash.svg" alt="">
      </div>
    </div> -->
    {#if hover}
    <p  class="toggle_window" on:click={toggleWindow}>Hide</p>
    {/if}
  </div>
  


</div>
<style lang="scss">
    .card {
        display: flex;
        position: absolute;
        padding: 1px;
       
        top: 30px;
        height: 225px;
        width: 300px;
        left: 35%;
        
        background-color: #5f86f2;
        border-radius: 5px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255,255,255, 0.1);
        z-index: 200;
    }

    .inner-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        border-radius: 3px;
        background-color: #202020;
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
        border-left: 1px solid rgba(255,255,255,0.1);
    }



    .decline {
        display: flex;
        justify-content: center;
        gap: 10px;
        padding: 15px;
        transition: 250ms ease-in-out;
        border-left: 1px solid rgba(255,255,255,0.1);
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


    video {
        z-index: 99999;
        position: absolute;
    }

    #myVideo {
        width: 300px;
        z-index: 2;
    }

    .hide {
        width: 60px !important;
        height: 50px;
    }

    .toggleVideo {
        width: 60px !important;
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

    .toggle {
        left: 1%;
        top: 250px;
        width: 50px;
        height: 20px;
    }

</style>
