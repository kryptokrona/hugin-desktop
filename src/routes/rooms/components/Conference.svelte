<script>
   import { run, preventDefault } from 'svelte/legacy';

    import MyVideo from '$lib/components/webrtc/MyVideo.svelte'
    import { pushToTalk, rooms, swarm } from '$lib/stores/user.js'
    import PeerVideo from '$lib/components/webrtc/PeerVideo.svelte'
    import { videoGrid } from '$lib/stores/layout-state.js'
    import { fade, fly } from 'svelte/transition'
    import ConferenceControls from './Conference-Controls.svelte'
    import {groups, user} from '$lib/stores/user.js'
    import { sleep } from '$lib/utils/utils'
    import { Moon } from 'svelte-loading-spinners'
    import BigImage from '$lib/components/popups/BigImage.svelte'
    import { fileViewer } from '$lib/stores/files'
	import { onMount } from 'svelte';
    
    let in_voice = $state(false)
    const my_address = $user.myAddress
    let active = $derived(thisSwarm)
    let thisSwarm = $derived($swarm.voice)
    let talkOn = new Audio('/audio/talk.mp3')
    let talkOff = new Audio('/audio/notalk.mp3')
    $effect(() => {
        if ($swarm.voice_channel.has(my_address)) {
            in_voice = true
        } else in_voice = false
    })

    onMount(async () => {
        $videoGrid.showChat = false
        await sleep(200)
    })

    const printThis = (channel) => {
        //if (channel === $swarm.activeChannel.name) return
        // $swarm.activeChannel = {name: channel, key: thisSwarm.key}
        console.log("Print this channel, deactivated!")
    }
    
    let drag = false
    let videoCalls = $state([])
    let join = false
    let groupKey = $state('')
    
    const dragWindow = () => {
        console.log('dragwindow', drag)
        drag = true
    }
    
    const noDrag = () => {
        drag = false
    }
    const close = () => {
        $swarm.showVideoGrid = false
    }
    
    const joinGroupChat = () => {
        console.log('joining')
        $swarm.groupCall = groupKey
        groupKey = ''
        join = false
    }
    let isConnecting = $state(false)
    //If so the user is connecting to our call if he is not yet connected in $swarm.call
    run(() => {
        if (thisSwarm) {
            if ($swarm.call.some(a => thisSwarm?.voice_channel.has(a.chat) && !a.connected && in_voice && a.chat !== my_address)) {
                isConnecting = true
            } else {
                isConnecting = false
            }
        }
   });
    
    run(() => {
      groupKey
   });
    
    run(() => {
      videoCalls = $swarm.call.filter(a => a.connected === true)
   });

   let pressed = false

   window.api.receive('key-event', event => {
    if (event.state === "DOWN") talk(event)
    else notalk(event)
   })

   function talk(e) {
    if (!check(e)) return
    if (pressed) return
    talkOn.play()
    pressed = true
    setAudio(true)
    console.log("Talking.....")
   }
   
   
   function notalk(e) {
    if (!check(e)) return
    pressed = false
    setAudio(false)
    talkOff.play()
    console.log("No Talking.....")
   }

   function check(e) {
    if ($swarm.call.length === 0) return false
    if (!$pushToTalk.on) return false
    if ($pushToTalk.key !== e.keyCode) return false
    if (!$swarm.audio) return false
    return true
   }

   function setAudio(mode) {
    $swarm.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = mode))
    })
   }

    </script>

<svelte:window onkeyup={notalk} onkeydown={talk} />

    <div in:fade|global out:fade|global class:show="{$swarm.showVideoGrid}" class="layout">
        {#if $fileViewer.enhanceImage}
            <BigImage />
        {/if}


        <div class="video-wrapper">
            <!-- {#if thisSwarm?.connections.length && in_voice}
                <h4 style="color: var(--success-color)">{thisSwarm?.connections.length} Active connections</h4>
            {/if} -->
            <div class:drag={$swarm.showVideoGrid} class="video-grid">
            {#if in_voice && thisSwarm}
                    <MyVideo active={active}/>
                {#if videoCalls.length}
                    {#each videoCalls as peer (peer.chat)}
                        <PeerVideo call="{peer}" channel="{thisSwarm?.voice_channel}" />
                    {/each}
                {/if}
                {#if isConnecting}
                <div class="loader">
                    <Moon color="#f5f5f5" size="60" unit="px"/>
                </div>
                {/if}
            {:else}
            
            {#if thisSwarm}
                {#if thisSwarm?.voice_channel?.size}
            
                {#each [...thisSwarm?.voice_channel.entries()] as [key, peer] (peer.address)}
                        <PeerVideo call={peer} active={false} channel={thisSwarm.voice_channel} />
                {/each}

                {:else}
                 <div class:blink_me={true} in:fly|global={{ x: 150}}>
                        <h4 style="color: var(--info-color)">Click join call to enter...</h4>
                 </div>
                 <!-- {#if thisSwarm?.connections.length}
                    <h4 style="color: var(--success-color)">{thisSwarm?.connections.length} connected</h4>
                 {/if} -->
                {/if}
            {/if}
            {/if}
            </div>
            {#if in_voice}
            <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}">
                <ConferenceControls active={thisSwarm} />
            </div>
            {/if}
        </div>
    </div>
    
    <style lang="scss">
    
    
    .layout {
        display: flex;
        position: absolute;
        opacity: 0;
        gap: 1rem;
        padding: 1.5rem;
        background-color: var(--backgound-color);
        height: 100%;
        width: 100%;
        z-index: 9999;
        transition: all 500ms ease-in-out;
        border-radius: 15px;
        overflow: hidden;
        pointer-events: none;
    }
    .video-wrapper {
        display: flex;
        justify-content: space-between;
        flex-direction: column;
        width: 100%;
        height: 98%;
    }
    
    .video-grid {
        width: 100%;
        height: calc(100% - 73px);
        max-width: 100%;
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
        vertical-align: middle;
        justify-content: center;
        align-items: center;
        align-content: center;
    }
    
    .fade {
        position: absolute;
        top: 0;
        width: 100%;
        height: 40px;
        background: linear-gradient(180deg, #121212, #12121200);
        z-index: 100;
    }
    
    .outer {
        display: flex;
        flex-direction: column-reverse;
        overflow: scroll;
    
        &::-webkit-scrollbar {
            display: none;
        }
    }
    
    .show {
        opacity: 1;
        visibility: visible;
        pointer-events: all !important;
        transition: ease-out 200ms;
    }

    .drag {
        pointer-events: auto;
        -webkit-app-region: drag;
    }
    
    input {
        box-sizing: border-box;
        background-color: transparent;
        border: 1px solid var(--input-border);
        border-radius: 8px;
        padding: 0 1rem;
        height: 35px;
        width: 100%;
        color: var(--text-color);
    
        &:focus {
            outline: none;
            border: 1px solid rgba(255, 255, 255, 0.6);
        }
    }
    
    .join_group {
        position: absolute;
        display: flex;
    }

    .loader {
        margin-left: 50px;
    }

    </style>
    