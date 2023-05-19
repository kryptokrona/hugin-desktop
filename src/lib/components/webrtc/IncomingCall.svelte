<script>
//To handle true and false, or in this case show and hide.
import { fly } from 'svelte/transition'
import { cubicIn, cubicOut } from 'svelte/easing'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { notify, user, webRTC } from '$lib/stores/user.js'
import { goto } from '$app/navigation'
import CallIcon from '$lib/components/icons/CallIcon.svelte'
import CallSlash from '$lib/components/icons/CallSlash.svelte'

export let paused = false
export let thisCall
let avatar
let ringtone = new Audio('/audio/ringtone.mp3')
let invite = false
let answered = false
let video = true

const dispatch = createEventDispatcher()
// When incoming call and this get mounted we play the ringtone
onMount(() => {
    ringtone.play()
    avatar = get_avatar(thisCall.chat)
    console.log('this call!', thisCall)
    if (thisCall.type === 'groupinvite') {
        invite = true
    }
    video = $webRTC.devices.some((a) => a.kind == 'videoinput')
    if (video) return
    video = false
})

//When a user clicks answer
const handleAnswer = async () => {
    dispatch('answerCall')
    await goto('/messages')
    //Variable to activate visual feedback
    answered = true
    let caller = $user.contacts.find((a) => a.chat === thisCall.chat)
    console.log('caller', caller)
    let offchain = false
    let message = thisCall.msg
    if ($webRTC.groupCall) {
        offchain = true
    }
     //If video call incoming and no video device is plugged in
     if (thisCall.msg.substring(0, 1) == 'Δ' && !video) {
        //Pretend its a voice call and answer only with audio
        message = thisCall.msg.replace("Δ", "Λ")
    }
  
    //We delay the answerCall for routing purposes
    window.api.answerCall(message, thisCall.chat, caller.key, offchain)

    //We pause the ringtone and destroy the popup
    ringtone.pause()
}

//As a precaution we pause the ringtone again when destroyed
onDestroy(() => {
    ringtone.pause()
})

const declineCall = () => {
    let filterArr = $webRTC.incoming.filter((a) => a.chat !== thisCall.chat)
    $webRTC.incoming = filterArr
}
</script>

<div
    in:fly="{{ y: -200, duration: 400, easing: cubicOut }}"
    out:fly="{{ y: -200, duration: 400, easing: cubicIn }}"
    class="card"
    class:answered
>
    <audio bind:paused src="/audio/static_ringtone.mp3"></audio>
    <div class="inner-card">
        <div class="caller">
            <img class="avatar" src="data:image/png;base64,{avatar}" alt="" />
            <p class="name">{thisCall.name}</p>
            {#if invite}<p>wants to join the call</p>{:else}<p>is calling</p>{/if}
        </div>
        <div class="options">
            <div class="answer hover" on:click="{handleAnswer}">
                <CallIcon />
            </div>
            <div class="decline hover" on:click="{declineCall}">
                <CallSlash />
            </div>
        </div>
    </div>
</div>

<style lang="scss">
.card {
    display: flex;
    position: absolute;
    right: 50px;
    top: 20px;
    padding: 3px;
    height: 70px;
    width: 350px;
    flex-direction: column;
    box-sizing: border-box;
    border-radius: 5px;
    box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 99999;
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
    font-family: 'Montserrat';
}

.name {
    font-weight: bold;
    margin-right: 5px;
}
</style>
