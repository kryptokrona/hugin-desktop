<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {cubicOut , cubicIn} from "svelte/easing"
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {onDestroy, onMount} from "svelte";
    import {user, webRTC} from "$lib/stores/user.js";
    import {createEventDispatcher} from "svelte";
    import videoIcon from '/static/images/video.svg'


    const dispatch = createEventDispatcher();
    
    export let paused = false
    let endTone = new Audio("/static/audio/endcall.mp3")
    let hangUp = false
    let peer
    let stream
    let calling = true
    let toggle = false
    export let this_call
    let avatar = get_avatar(this_call.chat)
    // When incoming call and this get mounted we play the ringtone
    onMount(() => {
        
    })

    //When a user clicks answer
    const endCall = () => {

        //We delay the answerCall for routing purposes
        window.api.endCall('peer', 'stream', this_call.chat)

        //We pause the ringtone and destroy the popup
        endTone.play()

        dispatch('endCall')
        //Variable to activate visual feedback
        hangUp = true

    }

    //As a precaution we pause the ringtone again when destroyed
    onDestroy(() => {
        endTone.pause()
    })

    const toggleWindow = () => {
      toggle = !toggle
      dispatch('toggleMyWindow')
    }

</script>


<!-- <video class:show={calling} in:fade id="peerVideo" playsinline autoplay bind:this={peerVideo}></video> -->

<div in:fly="{{y: -100, duration:900, easing: cubicOut}}" out:fly="{{y: -100, duration: 900, easing: cubicIn}}" class="card" class:hangUp={hangUp} class:rgb={!hangUp}>
    <audio bind:paused src="/static/audio/startcall.mp3"></audio>
    <div class="inner-card">
        <div class="caller">
            <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
            <p>{this_call.chat}</p>
        </div>
        <audio bind:paused src="/static/audio/startcall.mp3"></audio>
        <div class="options">
            <a class="answer hover" on:click={toggleWindow} class:active={toggle}>
                <img src={videoIcon} alt="toggleMyWindow">
            </a>
            <div class="decline hover" on:click={()=> endCall(peer, stream)} >
                <img src="/static/images/call-slash.svg" alt="">
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .card {
        display: flex;
        position: absolute;
        padding: 1px;
        bottom: 20px;
        right: 105px;
        height: 50px;
        width: 300px;
        background-color: #5f86f2;
        border-radius: 5px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255,255,255, 0.1);
        z-index: 500;
    }

    .inner-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        border-radius: 3px;
        background-color: #202020;
    }

    .hangUp {
      background-color: #5ff281;
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

    .active {
      background: rgba(0,0,0,0.5) !important;
    }

    h3, p {
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
        font-weight: normal;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis
    }

</style>
