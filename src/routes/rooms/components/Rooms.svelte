<script>
    import { onMount} from 'svelte'
    import {swarm, user} from '$lib/stores/user.js'
    import { videoSettings, video } from '$lib/stores/mediasettings'

    let {
        onPrintChannel
    } = $props()

    onMount(async () => {
        // await sleep(200)
    })

    const printThis = (channel) => {
        //if (channel === $swarm.activeChannel.name) return
        
        //$swarm.activeChannel = {name: channel, key: thisSwarm.key}
        onPrintChannel(channel)
    }

    window.api.receive('leave-active-voice-channel', async () => {
        disconnect_from_active_voice()
    })

    function disconnect_from_active_voice(reconnect = false) {
        console.log("Disconnect from active voice!")
        let endTone = new Audio('/audio/endcall.mp3')
        endTone.play()
        const my_address = $user.myAddress
        if (!reconnect) $swarm.showVideoGrid = false
            //Leave any active first, check if my own address is active in some channel
            //Remove my own address from swarm active voice channel list in UI
            $swarm.active.forEach(joined => {
                if (joined.voice_channel.has(my_address)) {
                joined.voice_channel.delete(my_address)
                }
            })

            if ($swarm.myStream) {
                try {
                    $swarm.myStream.getTracks().forEach((track) => track.stop())
                } catch(e) {
                    console.log("Error stopping tracks.")
                }
            }

            //Check my current active swarm voice channel and remove aswell
            let active = $swarm.voice_channel.has(my_address)
            if (!active) return true

            $swarm.voice = false
            
            //Remove from the active voice channel we have
            console.log("Want to exit old voice")
            $swarm.voice_channel = new Map()
        
            //Reset state if we are / were alone in the channel
            if ($swarm.call.length === 0) {
                $videoSettings.myVideo = false
                $video.play = false
                $videoSettings.screenshare = false
                $swarm.myStream = false
                $videoSettings.active = false
            }
        
            //Send status to backend
            window.api.send("exit-voice", active.key)
            $videoSettings.myVideo = false
            $swarm = $swarm
            return true
    }
    
    
    // const showMessages = () => {
    //     $swarm.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
    // }

</script>


<style lang="scss">

    .card {
        display: flex;
        height: 80px;
        padding: 1rem;
        width: 100%;
        color: var(--title-color);
        border-bottom: 1px solid var(--border-color);
        background-color: var(--backgound-color);
        transition: 200ms ease-in-out;
        cursor: pointer;
        opacity: 0.9;

        &:hover {
            color: var(--text-color);
            opacity: 1;
            background-color: var(--card-border);
            border-bottom: 1px solid transparent;
        }
    }
    
    .avatar {
        margin-bottom: 10px;
        opacity: 0.92;
        cursor: pointer;
    }

    .svg {
        margin-top: 5px;
    }
    
    .content {
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        overflow: hidden;
    }
    
    h4 {
        margin: 0;
        white-space: nowrap;
        max-width: 180px;
        overflow: hidden;
        font-family: 'Montserrat', sans-serif;
        text-overflow: ellipsis;
        font-weight: bold;
    }
    
    p {
        margin: 5px 0 0 0;
        white-space: nowrap;
        max-width: 200px;
        overflow: hidden;
        font-size: 12px;
        text-overflow: ellipsis;
        font-family: 'Montserrat', sans-serif;
    }

    .active {
        background-color: var(--border-color);
        border-bottom: 1px solid transparent;
    }
    
    .from {
        font-weight: bold;
        display: inline-table;
    }
    
    .text {
        display: flex;
        gap: 4px;
    }
    
    .swarm_info {
        color: var(--text-color);
    }

    .voice {
        cursor: pointer;
        display: contents;
        font-size: 15px;
        font-family: "Roboto Mono";
        padding: 10px;
        margin-left: 10px;
    }

    .channel {
        cursor: pointer;
        font-size: 15px;
        font-family: "Roboto Mono";
    }

    .list-wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: calc(100% - 103px);
        overflow: hidden;
    }

    .disconnect {
        color: var(--warn-color);
        font-size: 14px;
        cursor: pointer;
        opacity: 0.8;
        margin-bottom: 5px;
        margin-left: 8px;
        &:hover {
            opacity: 0.95;
        }
    }

    .text-channels {
        display: block;
        position: relative;
        padding: 10px;
        margin: 10px;
    }

    .this-channel {
        position: absolute;
        background-color: var(--background-color);
        border-radius: 2px;
        height: 16px;
        width: 3px;
        left: -10px;
        box-shadow: 0 0 10px white;
        margin-top: 13px;
        transition: 0.2s;
}

.create {
    font-size: 20px;
    cursor: pointer;
    opacity: 0.85;
    &:hover {
        opacity: 1
    }
}

.dot {
    position: absolute;
    background-color: var(--warn-color);
    border-radius: 50%;
    height: 5px;
    width: 5px;
    left: 2px;
    margin-top: 17px;
    box-shadow: 0 0 10px white;
}

.voice-controls {
    display: flex;
    justify-content: space-around;
    margin-bottom: 10px;
    margin-top: 10px;
}


</style>