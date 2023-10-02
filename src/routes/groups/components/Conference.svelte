<script>
    import MyVideo from '$lib/components/webrtc/MyVideo.svelte'
    import { swarm } from '$lib/stores/user.js'
    import PeerVideo from '$lib/components/webrtc/PeerVideo.svelte'
    import { videoGrid } from '$lib/stores/layout-state.js'
    import { fade, fly } from 'svelte/transition'
    import RtcGroupMessages from '$lib/components/webrtc/RtcGroupMessages.svelte'
    import ConferenceControls from './Conference-Controls.svelte'
   // import Controls from '$lib/components/webrtc/Controls.svelte'
    import {createEventDispatcher, onMount} from 'svelte'
    import {groups, user} from '$lib/stores/user.js'
    import { sleep } from '$lib/utils/utils'
import Button from '$lib/components/buttons/Button.svelte'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import VoiceUser from '$lib/components/chat/VoiceUser.svelte'
import { Moon } from 'svelte-loading-spinners'
    
    let startTone = new Audio('/audio/startcall.mp3')
    let channels = []
    let voice_channel = []
    let connected = false
    let topic = ""    
    let muted = false
    let thisSwarm = {}
    const dispatch = createEventDispatcher()
    const my_address = $user.huginAddress.substring(0,99)
    
    $: thisSwarm = $swarm.active.find(a => a.key === $groups.thisGroup.key)
    $: in_voice = voice_channel.some(a => a.address === my_address)

    $: if (thisSwarm) channels = thisSwarm.channels
    $: if (thisSwarm) topic = thisSwarm.topic
    $: if (thisSwarm) voice_channel = thisSwarm.voice_channel
    let active = thisSwarm

    onMount(async () => {
        $videoGrid.showChat = true
        await sleep(200)
        $swarm.activeSwarm = thisSwarm
    })

    const printThis = (channel) => {
        //if (channel === $swarm.activeChannel.name) return
        // dispatch('print-channel', channel)
        // $swarm.activeChannel = {name: channel, key: thisSwarm.key}
        console.log("Print this channel, deactivated!")
    }
    
    const openRemove = () => {
        $groups.removeGroup = !$groups.removeGroup
    }

    const join_voice_channel = async (video = false, reconnect = false, screen) => {
        if (in_voice) return
        if (!reconnect) startTone.play()
        $swarm.showVideoGrid = true
        console.log("Joining!")
        if (reconnect) {
            //activate_video()
            //await sleep(200)
            $swarm.myVideo = true
        }
        //Leave any active first
        if ($swarm.voice_channel.length) {
            //We already have an active call.  
            if (thisSwarm.voice_connected === true) return
             //Replace this with our new call
            if (!disconnect_from_active_voice()) return
        }
        console.log("Want to Join new voice")
        thisSwarm.voice_channel.push({address: my_address, name: $user.username, key: thisSwarm.key })
        $swarm.voice_channel = thisSwarm.voice_channel
        console.log("voice", voice_channel)
        window.api.send("join-voice", {key: thisSwarm.key, video: $swarm.myVideo})
        //Set to true? here
        thisSwarm.voice_connected = true
        $swarm = $swarm 
        console.log("Should be joined and connected here in this swarm", thisSwarm)
    }

    function disconnect_from_active_voice(reconnect = false) {
        console.log("Disconnect from active voice!")

        if (!reconnect) $swarm.showVideoGrid = false
            //Leave any active first, check if my own address is active in some channel
             //Also remove from voice channel
            let swarms = $swarm.active
            //Remove my own address from swarm active voice channel list in UI
            swarms.forEach(joined => {
                if (joined.voice_channel.some(a => a.address === my_address)) {
                let removed = joined.voice_channel.filter(a => a.address !== my_address) 
                joined.voice_channel = removed
                }
            })
            
            //Check my current active swarm voice channel and remove aswell
            let active = $swarm.voice_channel.find(a => a.address === my_address)
            if (!active) return true

            //Change voice connected status in other channels
            let old = $swarm.active.find(a => a.voice_connected === true)
            if (old) old.voice_connected = false

            
            //Remove from the active voice channel we have
            console.log("Want to exit old voice")
            let remove = $swarm.voice_channel.filter( a => a !== active)
            $swarm.voice_channel = remove
            
            //Stop any active tracks
            if (active && $swarm.myStream) {
                $swarm.myStream.getTracks().forEach((track) => track.stop())
            }
            //Stop any active stream
            if (!old) return true

            if (!reconnect) {
                let endTone = new Audio('/audio/endcall.mp3')
                endTone.play()
            }
            connected = false
            //Send status to backend
            window.api.send("exit-voice", old.key)
            $swarm.myVideo = false
            return true
    }
    
    let drag = false
    let videoCalls = []
    let join = false
    let groupKey = ''
    
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
    let isConnecting = false
    //If so the user is connecting to our call if he is not yet connected in $swarm.call
    $: if ($swarm.call.some(a => thisSwarm?.voice_channel.some(b => b.address === a.chat) && !a.connected && in_voice && a.chat !== my_address)) {
        isConnecting = true
    } else {
        isConnecting = false
    }

    $: console.log("isconeccting", isConnecting)
    
    $: groupKey
    
    $: videoCalls = $swarm.call.filter(a => a.connected === true)
    
    $: console.log('video calls', videoCalls)
    </script>
    
    <div in:fade out:fade class:show="{$swarm.showVideoGrid}" class="layout">
        <!--
        <p on:click={close}>Close</p>
        <p on:click={()=> join = !join}>Join chat</p>
        <div class="exit">
          <div class="join_group" class:hide={!join}><input placeholder="Input group key" type="text" bind:value={groupKey}>
            <FillButton on:click={joinGroupChat} enabled={groupKey.length > 1} disabled={false} text="Join" />
          </div>
        </div>
        -->
        <div class="video-wrapper">
        
            <div class="video-grid">
            {#if in_voice}
            {#if isConnecting}
                <Moon color="#f5f5f5" size="60" unit="px"/>
            {/if}
                    <MyVideo active={active}/>
                {#if videoCalls.length}
                    {#each videoCalls as peer (peer.chat)}
                        <PeerVideo call="{peer}" channel="{thisSwarm?.voice_channel}" />
                    {/each}
                {/if}

            {:else}
                {#if thisSwarm?.voice_channel.length}
            
                    {#each thisSwarm?.voice_channel as peer (peer.address)}
            
                        <PeerVideo call="{peer}" active="{false}" channel="{thisSwarm.voice_channel}"/>
                        
                    {/each}
                {/if}

            {/if}
            </div>
            <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}">
                <ConferenceControls />
            </div>
        </div>
        {#if !$videoGrid.showChat && $swarm.showVideoGrid}
        <div class="fly" in:fly="{{ x: -150 }}">

            <div class="list-wrapper">
                {#each thisSwarm?.voice_channel as user}
                    <VoiceUser voice_user={user} voice_channel={thisSwarm?.voice_channel}/>
                {/each}
            </div>
        </div> 
        {/if}
        <RtcGroupMessages />
    </div>
    
    <style lang="scss">

        .fly {
            width: 17%;
            height: 17%;
        }
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
        @keyframes fadeLayout {
            from {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }
            to {
                opacity: 100%;
                visibility: visible;
            }
        }
        
        pointer-events: all !important;
        animation: fadeLayout ease-out 300ms;
        animation-fill-mode: forwards;
    }
    
    input {
        box-sizing: border-box;
        background-color: transparent;
        border: 1px solid var(--input-border);
        border-radius: 8px;
        padding: 0 1rem;
        height: 35px;
        width: 100%;
        color: white;
    
        &:focus {
            outline: none;
            border: 1px solid rgba(255, 255, 255, 0.6);
        }
    }
    
    .join_group {
        position: absolute;
        display: flex;
    }
    </style>
    