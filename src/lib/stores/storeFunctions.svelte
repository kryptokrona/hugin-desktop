<script>
     import {boards, groups, notify, user, webRTC, messageWallet, beam, misc, swarm} from '$lib/stores/user.js'

     window.api.receive('peer-disconnected', async (data)  => { 
        peer_disconnected(data)
    })

    window.api.receive('swarm-disconnected', async (topic)  => { 
        swarm_disconnected(topic)
    })

    window.api.receive('swarm-connected', async (data)  => { 
        swarm_connected(data)
    })

    window.api.receive('peer-connected', async (data)  => { 
        peer_connected(data)
    })

    window.api.receive('voice-channel-status', async (data)  => { 
        voice_channel_status(data)
    })

    function swarm_connected(data) {
        console.log( 'Swarm connected', data)
        $swarm.active.push(data)
        updateActiveSwarm()
    }

    function peer_connected(data) {
        let joined = $swarm.active.find(a => a.topic === data.topic)
        joined.connections.push(data)
        updateActiveSwarm()
    }

    function peer_disconnected(data) {
        console.log("Peer disconnected!", data)
        //Find joined topic, and remove user from list of connections
        let joined = $swarm.active.find(a => a.topic === data.topic)
        if (!joined) return
        let still_active = joined.connections.filter(a => a.address !== data.address)
        console.log("Still active", still_active)
        joined.connections = still_active
        
        //Also remove from voice channel
        if (joined.voice_channel.some(a => a.address === data.address)) {
            let removed = joined.voice_channel.filter(a => a.address !== data.address) 
            joined.voice_channel = removed
        }

        //Update store
        updateActiveSwarm()
    }

    function swarm_disconnected(topic) {
        //Remove the active topic from list
        let removed = $swarm.active.filter(a => a.topic !== topic)
        //Remove from voice channel also
        let disconnected = $swarm.active.find(a => a.topic === topic)
        let still_active = disconnected.voice_channel.filter(a => a.address !== $user.huginAddress.substring(0,99))
        //Then update that voicechannel list
        still_active.voice_channel = still_active
        //Update active swarm store
        $swarm.active = removed
    }

    function voice_channel_status(data) {
        console.log("Update voice channel data", data)
        let status = $swarm.active.find(a => a.topic === data.topic)
        if (!status) return
        if (data.voice === true) {
            let user = status.connections.find(a => a.address === data.address)
            user.name = data.name
            status.voice_channel.push(data)
            
        } else {
           let still_active = status.voice_channel.filter(a => a.address !== data.address)
           status.voice_channel = still_active
        }
        
       updateActiveSwarm()
    }

    function updateActiveSwarm() {
        $swarm.active = $swarm.active
    }
    
       
</script>