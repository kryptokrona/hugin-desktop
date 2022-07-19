<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {cubicOut , cubicIn} from "svelte/easing"
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {onDestroy, onMount} from "svelte";
    import {user, webRTC} from "$lib/stores/user.js";
    import {createEventDispatcher} from "svelte";
    let myVideo = document.getElementById('myVideo')
    let video = false
    let show = true
    const dispatch = createEventDispatcher();

    // When incoming call and this get mounted we play the ringtone
    onMount( async () => {

          myVideo.srcObject = $webRTC.myStream
          myVideo.play();
          console.log('MyVidya', myVideo);

    })

    onDestroy(() => {
    })


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

    $: console.log('$webRTC.', $webRTC);
    console.log('mypeer',$webRTC.myPeer);

    $: video = $webRTC.myVideo
    $: console.log('$webRTC.', $webRTC);
</script>

<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div in:fly="{{y: -100, duration:900, easing: cubicOut}}" out:fly="{{y: -100, duration: 900, easing: cubicIn}}" class="card">
  <div class="inner-card">
  <video muted in:fade id="myVideo" playsinline autoplay bind:this={myVideo}></video>
  <!-- <div class="options">
    <div class="answer hover" on:click={playVideo} >
        <img src="/static/images/call.svg" alt="">
    </div>
      <div class="decline hover" on:click={pauseVideo} >
          <img src="/static/images/call-slash.svg" alt="">
      </div>
    </div> -->
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
        left: 33%;
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
            width: 300px;
            z-index: 99999;
            position: absolute;
        }

        #myVideo {

        }

</style>
