<script>
  import { run } from 'svelte/legacy';

//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { onDestroy, onMount } from 'svelte'
import { audioLevel, user, swarm, rooms } from '$lib/stores/user.js'
import Minus from '../icons/Minus.svelte'
import Plus from '../icons/Plus.svelte'
import {layoutState, videoGrid} from '$lib/stores/layout-state.js'
import { get_avatar } from '$lib/utils/hugin-utils'
import VoiceUserIcon from '../icons/VoiceUserIcon.svelte'
import { audioSettings } from '$lib/stores/mediasettings'
import MuteIcon from '../icons/MuteIcon.svelte'
import Screenshare from '../icons/Screenshare.svelte'
let peerVideo = $state(document.getElementById('peerVideo'))
let peerAudio = $state()
let peerStream
let thisWindow = $state(false)
let windowCheck = $state(false)
let audio = false
let status = $state({})
  /** @type {{active?: boolean, call: any, channel?: any}} */
  let { active = true, call, channel = [] } = $props();

// When incoming call and this get mounted we play the ringtone
onMount(() => {
    if (!active) return
    peerVideo.srcObject = call.peerStream
    peerAudio.srcObject = call.peerStream
    $videoGrid.peerVideos.push({chat: call.chat, size: 1})
    $videoGrid.peerVideos = $videoGrid.peerVideos
    thisWindow = $videoGrid.peerVideos.find(a => a.chat === call.chat)
    playVideo()
    windowCheck = true
})

run(() => {
    status = channel?.find(a => a.address === call.chat)
  });

async function setName() {
    if (!active) {
        return channel.find(a => call.address === a.address)
    }
    else if ($swarm.call.length) return channel.find(a => call.chat === a.address)
    else return $user.contacts.find(a => a.chat === call.chat)
}

const playVideo = () => {
    peerVideo.play()
}

window.api.receive('set-audio-input-group', (src, input) => {
        console.log('want to change in peervideo', src)
        if (input) return
        changeAudioSource(src, input)
})

window.api.receive('set-audio-input', (src, input) => {
        console.log('want to change in peervideo', src)
        if (input) return
        changeAudioSource(src, input)
})
    

const changeAudioSource = async (src, input) => {
    $audioSettings.audioOutput = src
    if (peerVideo === null) return
    peerVideo.setSinkId(src)
}

//As a precaution we pause the ringtone again when destroyed
onDestroy(() => {
   // peerVideo.pause()
})
let isTalking = $state(false)

run(() => {
    if ($audioLevel.call.some((a) => a.activeVoice == true && a.chat === call.chat)) {
      isTalking = true
  } else {
      isTalking = false
  }
  });

let address = $derived(active ? call.chat : call.address)

run(() => {
    if (thisWindow && windowCheck) {
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
  });

const resize = (size) => {
    if (!active) return
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

  let showWindow = $state(false)

  run(() => {
    thisWindow
  });
    
  run(() => {
    if ($swarm.showVideoGrid) {
        showWindow = true
    } else if ($videoGrid.showVideoGrid) showWindow = true
    else showWindow = false
  });

  let many = $state(false)

  run(() => {
    if ($swarm.call.length > 4) {
      many = true
    } else many = false
  });

  const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
    }
</script>

<div class="card" in:fly|global={{ x: -150}} out:fly|global={{ x: 150}} class:many={many} class:show={showWindow} class:talking="{isTalking}" class:min={thisWindow.size === 1 && !many} class:hide={thisWindow.size === 0} class:max={thisWindow.size === 2} class:medium={thisWindow.size === 3}>

    <video in:fade|global id="peerVideo" playsinline autoplay bind:this="{peerVideo}"></video>
    <audio autoplay  bind:this="{peerAudio}"></audio>
    {#await setName() then contact}
    <div class="status">
        <div class:in_call="{true}"></div>
        <div class="name">{contact.name}</div>
        <div class="voicestatus">
            {#if status?.audioMute}
                <MuteIcon size={"20px"}/>
            {/if}
        </div>
    </div>
    {/await}
    {#await check_avatar(address)}
        {:then avatar}
        {#if avatar}
            <img
              style=" object-fit: cover;"
                class="custom-avatar"
                src="{avatar}"
                alt=""
            />
        {:else}
            {#if !active}
            <img src="data:image/png;base64,{get_avatar(call.address, 'png', true)}" alt="" />
            {:else}
            <img src="data:image/png;base64,{get_avatar(call.chat, 'png', true)}" alt="" />
            {/if}
        {/if}
        {/await}
  
    <div in:fade|global class="fade">
        <div class="toggles">
          <Minus on:click={()=> resize('min')}/>
          <Plus on:click={()=> resize('medium')}/>
        </div>
      </div>
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
    transition: 0.35s;
    aspect-ratio: 16/9;
    pointer-events: none;

    video {
        position: absolute;
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: inherit;
        z-index: 5;
    }
}

.status {
    display: flex;
    top: 90%;
    margin-left: 10px;
    border-radius: 5px;
    height: 20px;
    width: 10px;
    padding: 5px;
    gap: 5px;
    line-height: 9px;
    font-family: "Montserrat";
    width: fit-content;
    position: relative;
    opacity: 0.9;
    border-radius: 50%;
    z-index: 5;
}
img {
    width: 200px;
    height: 200px;
    position: absolute;
    left: calc(50% - 100px);
    top: calc(50% - 100px);
    z-index: 4;
}
.caller {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 10px;
}

.many {
    height: 30.52% !important;
    width: 30.52% !important;
}

.in_call {
    padding: 5px;
    height: 10px;
    width: 10px;
    font-family: "Montserrat";
    width: fit-content;
    background: var(--success-color);
    opacity: 0.9;
    border-radius: 50%;
    z-index: 5;
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
    font-family: "Montserrat";
    position: relative;
    opacity: 0.8;
    color: white;
    z-index: 5;
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
      margin-bottom: -5px;
    
    &:hover {
        opacity: 0.9;
        background-image: linear-gradient(180deg, var(--fade-color), var(--fade-to-color));
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

.show {
    pointer-events: all !important;
}

.voicestatus {
    bottom: 5px;
    display: block;
    position: relative;
    left: 5px;
}

</style>
