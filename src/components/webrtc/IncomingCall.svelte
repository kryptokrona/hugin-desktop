<script>
    //To handle true and false, or in this case show and hide.
    import {fly} from "svelte/transition";
    import {cubicOut , cubicIn} from "svelte/easing"
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {onDestroy, onMount} from "svelte";
    import {user, webRTC} from "$lib/stores/user.js";
    import {createEventDispatcher} from "svelte";
    import { goto } from "$app/navigation";
    import CallIcon from "/src/components/buttons/CallIcon.svelte";
    import CallSlash from "/src/components/buttons/CallSlash.svelte";

    export let paused = false
    export let thisCall
    let avatar
    let ringtone = new Audio("/static/audio/ringtone.mp3")

    let answered = false
    const dispatch = createEventDispatcher();
    // When incoming call and this get mounted we play the ringtone
    onMount(() => {
        ringtone.play()
         avatar = get_avatar(thisCall.chat)
    })

    //When a user clicks answer
    const handleAnswer = () => {

        goto("/messages")
        dispatch('answerCall')
        //Variable to activate visual feedback
        answered = true

        let caller = $user.contacts.filter(a => a.chat === thisCall.chat)
        console.log('caller', caller)
         //We delay the answerCall for routing purposes
         window.api.answerCall(thisCall.msg, thisCall.chat, caller[0].key)
        
        //We pause the ringtone and destroy the popup
        ringtone.pause()

    }

    //As a precaution we pause the ringtone again when destroyed
    onDestroy(() => {
        ringtone.pause()
    })

    const declineCall = () => {
    let filterArr = $webRTC.call.filter(a => a.chat !== thisCall.chat)
    $webRTC.call = filterArr
    }

</script>


<div in:fly="{{y: -200, duration:800, easing: cubicOut}}" out:fly="{{y: -200, duration: 800, easing: cubicIn}}" class="card" class:answered={answered} class:rgb={!answered}>
    <audio bind:paused src="/static/audio/static_ringtone.mp3"></audio>
    <div class="inner-card">
        <div class="caller">
            <img class="avatar" src="data:image/png;base64,{avatar}" alt="">
            <p>{'SEKReYaGR8MLzRvJEj626B1ybiZTrvyoUFtexaHpEiFL5cynpxKfVeV3BUVAKZqYQyDPQtT26sTAUi47gskf9MTyDHoq1utP4xT'}</p>
        </div>
        <div class="options">
            <div class="answer hover" on:click={handleAnswer}>    
            <CallIcon />
            </div>
            <div class="decline hover" on:click={declineCall}>
            <CallSlash />
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
