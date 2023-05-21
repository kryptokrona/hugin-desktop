<script>
import {createEventDispatcher} from 'svelte'
import {fade} from 'svelte/transition'
import {get_avatar} from '$lib/utils/hugin-utils.js'
import {groups, swarm, user} from '$lib/stores/user.js'

export let group
let channels = []
let voice_channel = []

$: channels

$: if (thisSwarm) voice_channel = thisSwarm.voice_channel

const dispatch = createEventDispatcher()

const printThis = (group) => {
    if (group.key === $groups.thisGroup.key) return
    dispatch('print')
}

const openRemove = () => {
    $groups.removeGroup = !$groups.removeGroup
}

$: swarmGroup = $swarm.active.some(a => a.key === group.key)

$: thisSwarm = $swarm.active.find(a => a.key === group.key)

$: if (thisSwarm) channels = thisSwarm.channels

const createNewChannel = () => {
    //Add to channels and notify others in the swarm
}

const exitVoiceChannel = (key) => {
    let leave = voice_channel.find(a => a.address === $user.huginAddress.substring(0,99))
    voice_channel.pop(leave)
    window.api.send("exit-voice", group.key)
    thisSwarm.voice_connected = false
    //We also need to leave the $swarm.voice_channel which is the _one_ and only active call at a time.
}

const joinVoiceChannel = () => {

    console.log("Joining!")
    //Leave any active first
    if ($swarm.voice_channel.length) {
        //We already have an active call.
        //Replace this with our new call
        if (!disconnectFromActiveVoice()) return
    }
    console.log("Want to Join new voice")
    voice_channel.push({address: $user.huginAddress.substring(0,99), name: $user.username, key: group.key })
    $swarm.voice_channel = voice_channel
    console.log("voice", voice_channel)
    window.api.send("join-voice", group.key)
    //Set to true? here
    thisSwarm.voice_connected = true
    console.log("Should be joined and connected here in this swarm", thisSwarm)
}

$: console.log("This swarm", thisSwarm)
$: console.log("$swarm.voice_channel", $swarm.voice_channel)

const disconnectFromActiveVoice = () => {
    console.log("Disconnect from old!")
        //Leave any active first
        let active = $swarm.voice_channel.find(a => a.address === $user.huginAddress.substring(0,99))
        if (group.key === active.key) return false
        console.log("Want to exit old voice")
        $swarm.voice_channel.pop(active)
        $swarm.voice_channel = $swarm.voice_channel
        let old = $swarm.active.find(a => a.voice_connected === true)
        old.voice_connected = false
        window.api.send("exit-voice", old.key)
        return true
}

</script>

<div
    class="card"
    in:fade
    out:fade
    class:active="{$groups.thisGroup.key === group.key}"
    class:swarm="{swarmGroup}"
    on:click="{(e) => printThis(group)}"
>
    {#if group.new}
        <div class:unread="{group.new}"></div>
    {/if}

    <img class="avatar" on:click={openRemove} src="data:image/png;base64,{get_avatar(group.key)}" alt="" />
    <div class="content">
        <h4>{group.name}</h4>
        <div class="text">
            <p class="from">{group.nick}:</p>
            <p>{group.msg}</p>
        </div>
    </div>
</div>

{#if swarmGroup}
<div class="swarm_info">
  <div class="channels">
    <div class="voice-channel">
    <p>Channels</p>
    <p class="voice" on:click={joinVoiceChannel}>#Radio room</p>
        <br>
    {#each voice_channel as user}
            <p>{user.name}</p>
        {/each}
    </div>
    {#each channels as channel}
        <p>{channel.name}</p>{channel.type}
    {/each}

  </div>
</div>
{/if}
<style lang="scss">

    .voice {
        cursor: pointer;
    }
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
        color: white;
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

.unread {
    animation: border_rgb 30s infinite;
    background-color: white;
    width: 5px;
    height: 2px;
    border-radius: 30%;
    left: 340px;
    margin-top: 25px;
    position: absolute;
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

.swarm {
    background-color: var(--success-color);
}

.swarm_info {
    color: white;
    height: 100px;
    border-bottom: 1px solid var(--border-color);
}
</style>
