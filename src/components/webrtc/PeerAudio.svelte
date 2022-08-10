<script>
    //To handle true and false, or in this case show and hide.
    import {onDestroy, onMount} from "svelte";
    import {user, webRTC} from "$lib/stores/user.js";

    let peerAudio = document.getElementById('peerAudio')

    export let audioCall

    // When incoming call and this get mounted we play the ringtone
    onMount(() => {
        console.log('peerVideo call', audioCall);
        console.log('before', audioCall.peerStream)
        peerAudio.srcObject = audioCall.peerStream
        playAudio()

    })

    //When a user clicks answer
    const pauseVideo = () => {
      console.log('pausevideo');
      peerVideo.pause()

    }

    const playVideo = () => {
      console.log('play video');
      peerVideo.play()
    }

    //As a precaution we pause the ringtone again when destroyed
    onDestroy(() => {
      peerVideo.pause()
    })

</script>

<audio autoplay bind:this={peerAudio}></audio>
<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<style lang="scss">


</style>
