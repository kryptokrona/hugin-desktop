<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {cubicOut , cubicIn} from "svelte/easing"
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {onDestroy, onMount} from "svelte";
    import {user} from "$lib/stores/user.js";

    export let paused = false
    let avatar = get_avatar($user.call.sender)
    let ringtone = new Audio("/static/audio/static_ringtone.mp3")

    let answered = false

    // When incoming call and this get mounted we play the ringtone
    onMount(() => {
        ringtone.play()
    })

    //When a user clicks answer
    const handleAnswer = () => {

        //Variable to activate visual feedback
        answered = true

        //We delay the answerCall for routing purposes
        window.api.answerCall($user.call.msg, $user.call.sender)

        //We pause the ringtone and destroy the popup
        ringtone.pause()

    }

    //As a precaution we pause the ringtone again when destroyed
    onDestroy(() => {
        ringtone.pause()
    })

</script>


<div in:fly="{{y: -200, duration:800, easing: cubicOut}}" out:fly="{{y: -200, duration: 800, easing: cubicIn}}" class="card" class:answered={answered} class:rgb={!answered}>
    <audio bind:paused src="/static/audio/static_ringtone.mp3"></audio>
    <div class="inner-card">
        <div class="caller">
            <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
            <p>{'SEKReYaGR8MLzRvJEj626B1ybiZTrvyoUFtexaHpEiFL5cynpxKfVeV3BUVAKZqYQyDPQtT26sTAUi47gskf9MTyDHoq1utP4xT'}</p>
        </div>
        <div class="options">
            <a class="answer hover" on:click={handleAnswer} href="/webrtc">
                <img src="/static/images/call.svg" alt="">
            </a>
            <div class="decline hover" on:click>
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
        top: 20px;
        right: 105px;
        height: 50px;
        width: 300px;
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

    .answered {
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

    h3, p {
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
        font-weight: normal;
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis
    }
</style>