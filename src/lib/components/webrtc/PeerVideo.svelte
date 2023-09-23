<script>
//To handle true and false, or in this case show and hide.
import { fade } from 'svelte/transition'
import { createEventDispatcher, onDestroy, onMount } from 'svelte'
import { audioLevel, user } from '$lib/stores/user.js'
import Minus from '../icons/Minus.svelte'
import Plus from '../icons/Plus.svelte'
import {layoutState, videoGrid} from '$lib/stores/layout-state.js'
let peerVideo = document.getElementById('peerVideo')
let peerStream
let thisWindow = false
let windowCheck = false
let audio = false
export let call

const dispatch = createEventDispatcher()

// When incoming call and this get mounted we play the ringtone
onMount(() => {
    console.log('peerVideo call', call)
    console.log('before', call.peerStream)
    peerVideo.srcObject = call.peerStream
    $videoGrid.peerVideos.push({chat: call.chat, size: 1})
    $videoGrid.peerVideos = $videoGrid.peerVideos
    thisWindow = $videoGrid.peerVideos.find(a => a.chat === call.chat)
    console.log('This window', thisWindow)
    playVideo()
    windowCheck = true
})

async function setName() {
    return $user.contacts.find(a => a.chat === call.chat)
}

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

$: if ($audioLevel.call.some((a) => a.activeVoice == true && a.chat === call.chat)) {
    isTalking = true
} else {
    isTalking = false
}

$:  if (thisWindow && windowCheck) {
        console.log('This window reactive')
        if ($videoGrid.peerVideos.some(a => a.size === 2 && a.chat !== call.chat) && thisWindow.size > 0) {
            thisWindow.size = 0
            $videoGrid.showChat = false
            $videoGrid.hideMyVideo = true
            
        }
        //Multiview reset test
        if ($videoGrid.multiView && thisWindow.size !== 1) {
            thisWindow.size = 1
            $videoGrid.showChat = false
            $videoGrid.hideMyVideo = false
        }
    }

const resize = (size) => {
    $videoGrid.multiView = false
     //Right now we only have two modes, medium and min
     //Medium is fullscreen
    //Reset size one step if maxsize is set
    if (thisWindow.size === 2  && size == 'medium') {
        return
    }
      //Reset size to multiview if we minimize one fullscreen
    if (thisWindow.size === 2 && size == 'min') {
        $videoGrid.multiView = true
    }
    
    //Size switch
    switch (size) {
      case 'min':
      $videoGrid.hideMyVideo = false
      thisWindow.size = 1
      break;
      case 'medium':
      $videoGrid.hideMyVideo = true
      thisWindow.size = 2
    }

    $videoGrid.peerVideos.some(function (a) 
     { 
         if (a.chat === call.chat) 
             {
             console.log(' find update size', thisWindow.size)
             a.size = thisWindow.size
            }
    })

    $videoGrid.peerVideos = $videoGrid.peerVideos
    console.log('Updating resize thiswindow', thisWindow.size)
  }

  let showMenu = false

  $: thisWindow


</script>

<div class="card" class:talking="{isTalking}" class:min={thisWindow.size === 1} class:hide={thisWindow.size === 0} class:max={thisWindow.size === 2} class:medium={thisWindow.size === 3}>
    {#if audio}
    <audio autoplay bind:this="{peerVideo}"></audio>
    {:else}
    <video in:fade id="peerVideo" playsinline autoplay bind:this="{peerVideo}"></video>
    {#await setName() then contact}
    <div class="name">{contact.name}</div>
    {/await}
    <div in:fade class="fade">
        <div class="toggles">
          <Minus on:click={()=> resize('min')}/>
          <Plus on:click={()=> resize('medium')}/>
        </div>
      </div>
    {/if}
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
    pointer-events: none;

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

.name {
    left: 10px;
    top: 90%;
    border-radius: 5px;
    height: 25px;
    padding: 5px;
    line-height: 15px;
    font-family: "Montserrat";
    width: fit-content;
    background: white;
    position: relative;
    opacity: 0.6;
    color: black;
}

.fade {
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      bottom: 0;
      width: 100%;
      height: 100px;
      z-index: 501;
      opacity: 0;
      transition: 200ms ease-in-out;
      border-radius: 0 0 10px 10px;
    
    &:hover {
        opacity: 0.9;
        background-image: linear-gradient(180deg, #00000000, #000000);
        pointer-events: visible;
    }
    .toggles {
      display: flex;
      width: 100%;
      justify-content: space-evenly;
      align-items: center;
      cursor: pointer;
    }

}

.max {
    width: 95%;
    height: 95%;
}

.hide {
    display: none;
}

.min {
    width: 47.652% !important;
    height: 47.652% !important;
}

</style>
