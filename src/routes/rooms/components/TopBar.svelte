<script>
    import { run } from 'svelte/legacy';

import Bell from "$lib/components/icons/Bell.svelte"
import Groupcall from "$lib/components/icons/Groupcall.svelte"
import Lightning from "$lib/components/icons/Lightning.svelte"
import Lock from "$lib/components/icons/Lock.svelte"
import AddToCall from '$lib/components/icons/AddToCall.svelte'
import Tooltip from "$lib/components/popups/Tooltip.svelte"
import { misc, notify, rooms, swarm } from "$lib/stores/user"
import { isLatin } from "$lib/utils/utils"
import Dots from '$lib/components/icons/Dots.svelte'
import FileSync from "$lib/components/icons/FileSync.svelte"

let roomName = $state()
let asian = $state(false)
let room = $state('')
let admin = $state(false)
let thisSwarm = $state(false)

let isThis = $derived($rooms.thisRoom?.key === $swarm.activeSwarm?.key)
run(() => {
        if (isThis && $swarm.activeSwarm) thisSwarm = $swarm.activeSwarm
    });

run(() => {
        if (thisSwarm) admin = thisSwarm.admin
    });

run(() => {
        if ($rooms.thisRoom?.key) {
        room = $rooms.thisRoom.key
    }
    });

const toggleNotification = () => {
    if (muteGroup) {
        const filter = $notify.off.filter(a => a !== roomName)
        $notify.off = filter
        window.api.successMessage('Activated notifications.')
    } else {
        window.api.errorMessage('Notifications turned off.')
        $notify.off.push(roomName)
    }
    $notify = $notify
    window.api.send('group-notifications', $notify.off)
}

const toggleSyncImages = () => {
    if (syncImages) {
        const filter = $misc.syncImages.filter(a => a !== thisSwarm.topic)
        $misc.syncImages = filter
        window.api.errorMessage('Image syncing deactivated.')
    } else {
        window.api.successMessage('Activated image syncing for this room.')
        $misc.syncImages.push(thisSwarm.topic)
    }
    $misc = $misc
    window.api.send('sync-images', $misc.syncImages)
}

run(() => {
        roomName = $rooms.thisRoom?.name
    });

run(() => {
        if (roomName) {
        if (!isLatin(roomName)) asian = true
        else asian = false
    }
    });

let muteGroup = $derived($notify.off.some(a => a === roomName))
let syncImages = $derived($misc.syncImages.some(a => a === thisSwarm.topic))

function copyThis(copy) {
    const msg = 'You copied a Room invite key'
    window.api.successMessage(msg)
    const linkName = roomName.replace(/ /g, '-');
    const invite = 'hugin://' + linkName + '/' + copy
    navigator.clipboard.writeText(invite)
}

function toggleActions() {
    console.log("Toggle admin bar")
}

</script>

<div class="top" style="position: absolute; top: 0; left: 0; width: 100%; padding: 15px; border-bottom: 1px solid var(--border-color); height: 57px">
    <div style="display: flex; padding-bottom: 10px">
        <h3 title={roomName} class:asian style="font-size: 17px; padding-bottom: 2px; max-width: 200px; cursor: pointer; display: inline-block; overflow: hidden; text-overflow: ellipsis" onclick={() => copyThis(room)}>{roomName}</h3>
    <div style="display: inline-block; margin-left: auto">
        <Tooltip title="Invite key">
            <div onclick={() => copyThis(room)}>
        <AddToCall />
            </div>
        </Tooltip>
          
        <div style="cursor: pointer; display: inline-block; width: 25px;" onclick={toggleNotification}>
            {#if !muteGroup}
                <Bell active={true}/>
            {:else}
                <Bell active={false}/>
            {/if}
        </div>

        <div style="cursor: pointer; display: inline-block; width: 25px;" onclick={toggleSyncImages}>
            <FileSync sync={syncImages} />
        </div>

        <!-- <div style="cursor: pointer; display: inline-block; width: 25px;" on:click={toggleActions}>
            {#if admin}
                    <p>Admin panel toggle here!</p>
                <Dots/>
            {/if}
        </div> -->
    </div>
</div>
</div>