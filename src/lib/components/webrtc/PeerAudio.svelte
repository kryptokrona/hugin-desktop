<script>
//To handle true and false, or in this case show and hide.
import { onDestroy, onMount } from 'svelte'

let peerAudio = $state(document.getElementById('peerAudio'))

    /** @type {{audioCall: any}} */
    let { audioCall } = $props();

// When incoming call and this get mounted we play the ringtone
onMount(() => {
    console.log('Audio call', audioCall)
    console.log('Stream', audioCall.peerStream)
    peerAudio.srcObject = audioCall.peerStream
    playAudio()
})

//When a user clicks answer
const pauseVideo = () => {
    console.log('pausevideo')
    peerAudio.pause()
}

const playAudio = () => {
    console.log('play audio')
    peerAudio.play()
}

//As a precaution we pause the ringtone again when destroyed
onDestroy(() => {
    peerAudio.pause()
})
</script>

<audio autoplay bind:this="{peerAudio}"></audio>

<!-- <video class:show={calling} in:fade|global id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->
<style lang="scss">
</style>
