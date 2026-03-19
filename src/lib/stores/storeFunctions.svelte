<script>
    import { onMount, onDestroy } from 'svelte'
    import { get } from 'svelte/store'
    import { rooms, user } from '$lib/stores/user.js'
    import { peers } from '$lib/stores/swarm-state.svelte.js'

    const listeners = [
        { channel: 'peer-disconnected', handler: (data) => peers.onPeerDisconnected(data) },
        { channel: 'swarm-disconnected', handler: (topic) => peers.onSwarmDisconnected(topic) },
        { channel: 'swarm-connected', handler: (data) => peers.onSwarmConnected(data) },
        { channel: 'peer-connected', handler: (data) => peers.onPeerConnected(data) },
        { channel: 'voice-channel-status', handler: (data) => peers.onVoiceStatus(data) },
        { channel: 'channel-created', handler: (data) => peers.onChannelCreated(data) },
        { channel: 'leave-active-voice-channel', handler: () => {
            const usr = get(user)
            if (usr?.myAddress) peers.leaveVoice(usr.myAddress)
        }},
        {
            channel: 'joined-room',
            handler: () => {
                const room = get(rooms)
                const usr = get(user)
                if (!room?.thisRoom?.key) return
                window.api.send('new-swarm', {
                    key: room.thisRoom.key,
                    address: usr.myAddress,
                    name: usr.username,
                })
            },
        },
    ]

    onMount(() => {
        peers.initFromLegacyStores()
        for (const listener of listeners) {
            window.api.receive(listener.channel, listener.handler)
        }
    })

    onDestroy(() => {
        for (const listener of listeners) {
            window.api.removeAllListeners(listener.channel)
        }
    })
</script>
