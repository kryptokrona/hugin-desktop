<script>
     import {boards, groups, notify, user, webRTC, messageWallet, beam, misc, swarm, rooms} from '$lib/stores/user.js'
    import { roomMessages } from './roommsgs'

     window.api.receive('peer-disconnected', async (data)  => { 
        peer_disconnected(data)
    })

    window.api.receive('swarm-disconnected', async (topic)  => { 
        swarm_disconnected(topic)
    })

    window.api.receive('swarm-connected', async (data)  => { 
        swarm_connected(JSON.parse(data))
    })

    window.api.receive('peer-connected', async (data)  => { 
        peer_connected(data)
    })

    window.api.receive('voice-channel-status', async (data)  => { 
        voice_channel_status(data)
    })

    window.api.receive('channel-created', async (data)  => { 
        new_channel(data)
    })

    window.api.receive('joined-room', async (data) => {
        console.log("Joining room!")
        connecto_to_swarm()
    })

    const connecto_to_swarm = async () => {

    window.api.send("new-swarm", {
        key: $rooms.thisRoom.key, 
        address: $user.myAddress,
        name: $user.username
    })
}

    function swarm_connected(data) {
        console.log( 'Swarm connected', data)
        data.voice_channel = new Map()
        $swarm.active.push(data)
        updateActiveSwarm()
    }

    function peer_connected(data) {
        console.log("Data", data)
        let joined = $swarm.active.find(a => a.topic === data.topic)
        if (!joined) return
        // if (data.channels) {
        //     let known_channels = joined.channels
        //     for (const channel of data.channels) {
        //         if (known_channels.some(a => a.name === channel)) continue
        //         let c = {name: channel}
        //         known_channels.push(c)
        //     }

        //     joined.channels = known_channels
        // }
        
        add_user(data, joined)
    }

    const make_avatar = async (data, address, key, name) => {
        if (data || data.length > 0) {
            const blob = new Blob( [ data ]);
            const avatar = URL.createObjectURL( blob );
            const user = {avatar, address}

            //Replace with updated avatar.
            if ($rooms.avatars.some(a => a.address === address)) {
                $rooms.avatars = $rooms.avatars.filter(a => a.address !== address)
            }

            $rooms.avatars.push(user)
            $rooms.avatars = $rooms.avatars
        }
        window.api.send('save-room-user', {address, avatar: data, room: key, name})
    }

    async function add_user(data, joined) {
        const avatar = await make_avatar(data.avatar, data.address, joined.key, data.name)
        const user = {
            message: "Joined the lobby",
            grp: joined.key,
            reply: false,
            address: data.address,
            time: parseInt(data.time),
            name: data.name,
            hash: data.time,
            joined: true,
            channel: "Chat room",
            hash: await window.api.createGroup(),
        }
        //Do this to hacky trick to trigger reactivity in RoomHugins for updating the online list
        $rooms.activeHugins.push(user)
        $rooms.activeHugins.pop()
        $rooms.activeHugins = $rooms.activeHugins

        //Add connection to the active swarm
        joined.connections.push(user)
        // $roomMessages.push(user)
        // $roomMessages = $roomMessages
        updateActiveSwarm()
        
        voice_channel_status(data)
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
        if (joined.voice_channel.has(data.address)) {
            joined.voice_channel.delete(data.address)
        }

        // if ($swarm.call.some(a => a.chat === data.address)) {
        //     let filter = $swarm.call.filter(a => a.chat !== data.address)
        //     $swarm.call = filter
        // }
        voice_channel_status(data)
        //Update store
        updateActiveSwarm()
    }

    function swarm_disconnected(topic) {
        //Remove the active topic from list
        let removed = $swarm.active.filter(a => a.topic !== topic)
        //Remove from voice channel also
        let disconnected = $swarm.active.find(a => a.topic === topic)
        disconnected.voice_channel.delete($user.myAddress)
        //Update active swarm store
        $swarm.active = removed
        updateActiveSwarm()
    }

    function voice_channel_status(data) {
        let active = $swarm.active.find(a => a.topic === data.topic)
        if (!active) return
        let joined = active.voice_channel.has(data.address)
        let connected = active.connections.find(a => a.address === data.address)
        //First connection status
        if (data.voice === true && !joined) {
            connected.name = data.name
            active.voice_channel.set(data.address, data)
        } else if (data.voice === true && joined) { 
            //Update voice channel status
            active.voice_channel.delete(data.address)
            updateActiveSwarm()
            active.voice_channel.set(data.address, data)
        } else if (data.voice === false) {
           active.voice_channel.delete(data.address)
        } 

        console.log("active.voice_channel", active.voice_channel)
        console.log("$swarm.voice_channel ", $swarm.voice_channel )
        
        //We are only active in one voice channel, if someone disconnects. Update status.
        if ($swarm?.voice_channel.size) {
            const inchannel = $swarm.voice_channel.get($user.myAddress)
            console.log("inchannel", inchannel)
            if (inchannel && (inchannel.key === data.key) || (inchannel.topic === data.topic)) {
                $swarm.voice_channel = active.voice_channel
            }
        }
        
       updateActiveSwarm()
    }

    function new_channel(data) {
        let active = $swarm.active.find(a => a.key === data.key)
        active.channels.unshift(data)
        updateActiveSwarm()
    }

    function updateActiveSwarm() {
        $swarm.active = $swarm.active
    }
    
       
</script>