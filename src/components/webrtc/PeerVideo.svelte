<script>
    //To handle true and false, or in this case show and hide.
    import { fade } from 'svelte/transition'
    import { createEventDispatcher, onDestroy, onMount } from 'svelte'
    import { audioLevel } from '$lib/stores/user.js'

    let peerVideo = document.getElementById('peerVideo')
    let peerStream
    let window_max = false
    let window_medium = false
    export let call

    const dispatch = createEventDispatcher()

    // When incoming call and this get mounted we play the ringtone
    onMount(() => {
        console.log('peerVideo call', call)
        console.log('before', call.peerStream)
        peerVideo.srcObject = call.peerStream
        console.log('peerVideo call', call)
        playVideo()
    })

    //When a user clicks answer
    const pauseVideo = () => {
        console.log('pausevideo')
        peerVideo.pause()
    }

    const playVideo = () => {
        console.log('play video')
        peerVideo.play()
    }

    //As a precaution we pause the ringtone again when destroyed
    onDestroy(() => {
        peerVideo.pause()
    })

    let isTalking = false

    $: if (
        $audioLevel.call.some(
            (a) => a.activeVoice == true && a.chat === call.chat
        )
    ) {
        isTalking = true
        console.log('Is talking', call.chat)
    } else {
        isTalking = false
    }

    $: window_medium
    $: window_max
</script>

<div class="card" class:talking={isTalking}>
    <video in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo} />
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
        width: 47.652%;
        height: 47.652%;
        pointer-events: all;
        transition: 0.35s;
        aspect-ratio: 16/9;

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

    .talking {
        border: 1px solid var(--success-color);
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

    h3,
    p {
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
        font-weight: normal;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
    }
</style>
