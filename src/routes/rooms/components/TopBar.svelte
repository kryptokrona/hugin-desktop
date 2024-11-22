<script>
import Bell from "$lib/components/icons/Bell.svelte"
import Groupcall from "$lib/components/icons/Groupcall.svelte"
import Lightning from "$lib/components/icons/Lightning.svelte"
import Lock from "$lib/components/icons/Lock.svelte"
import AddToCall from '$lib/components/icons/AddToCall.svelte'
import Tooltip from "$lib/components/popups/Tooltip.svelte"
import { notify, rooms, swarm } from "$lib/stores/user"
import { isLatin } from "$lib/utils/utils"
import Dots from '$lib/components/icons/Dots.svelte'

let roomName
let asian = false
let room = ''
let admin = false

$: if ($rooms.thisRoom?.key) {
    room = $rooms.thisRoom.key
}

const toggleNotification = () => {
    if (muteGroup) {
        const filter = $notify.off.filter(a => a !== roomName)
        $notify.off = filter
    } else {
        $notify.off.push(roomName)
    }
    $notify = $notify
    window.api.send('group-notifications', $notify.off)
}

$: roomName = $rooms.thisRoom?.name

$: if (roomName) {
    if (!isLatin(roomName)) asian = true
    else asian = false
}

$: muteGroup = $notify.off.some(a => a === roomName)


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

let thisSwarm = false

$: isThis = $rooms.thisRoom?.key === $swarm.activeSwarm?.key
$: if (isThis && $swarm.activeSwarm) thisSwarm = $swarm.activeSwarm

$: if (thisSwarm) admin = thisSwarm.admin

</script>

<div class="top" style="position: absolute; top: 0; left: 0; width: 100%; padding: 15px; border-bottom: 1px solid var(--border-color); height: 57px">
    <div style="display: flex; padding-bottom: 10px">
        <h3 title={roomName} class:asian style="padding-bottom: 2px; max-width: 200px; cursor: pointer; display: inline-block; overflow: hidden; text-overflow: ellipsis" on:click={() => copyThis(room)}>{roomName}</h3>
    <div style="display: inline-block; margin-left: auto">
        <Tooltip title="Invite key">
            <div on:click={() => copyThis(room)}>
        <AddToCall />
            </div>
        </Tooltip>
          
        <div style="cursor: pointer; display: inline-block; width: 25px;" on:click={toggleNotification}>
            {#if !muteGroup}
                <Bell active={true}/>
            {:else}
                <Bell active={false}/>
            {/if}
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