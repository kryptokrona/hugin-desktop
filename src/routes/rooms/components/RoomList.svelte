<script>
import {createEventDispatcher, onDestroy, onMount} from 'svelte'
import {fade, fly} from 'svelte/transition'
import {roomMessages} from '$lib/stores/roommsgs.js'
import { misc, notify, swarm, rooms} from '$lib/stores/user.js'
import Plus from '$lib/components/icons/Plus.svelte'
import RemoveGroup from '$lib/components/chat/RemoveGroup.svelte'
import {sleep} from '$lib/utils/utils.js'
import {flip} from 'svelte/animate'
import Room from './Room.svelte'

let roomList = []
let room = ''
let roomName
$: roomList

//This group name
$: roomName = $rooms.thisRoom?.name
$: show_groups = true
	
const dispatch = createEventDispatcher()
const nogroup = {
        nick: 'No contacts',
        chat: 'Hugin Rooms',
        key:  $misc.welcomeAddress,
        msg: 'Click the + icon',
        name: 'Private Rooms',
    }
    
onMount( async () => {
    await printRooms()
    checkRoom()
    filterActiveHugins()
    
})

onDestroy(() => {
    window.api.removeAllListeners('roomMsg')
})

//Listen for sent message to update conversation list
window.api.receive('roomMsg', () => {
    filterActiveHugins()
    printRooms()
})
window.api.receive('peer-connected', () => {
    filterActiveHugins()
})

window.api.receive('banned', (key) => {
    printRooms()
    filterActiveHugins()
    checkRoom()
})
//Check active room status
const checkRoom = () => {
    //If we have an active room
    if ($rooms.thisRoom.chat) {
        printRoom($rooms.thisRoom)
        return
    }
    //If we have rooms but no active, print the first.
    if ($rooms.roomArray.length && !$rooms.thisRoom.chat) {
        $rooms.thisRoom = $rooms.roomArray[0]
        printRoom($rooms.thisRoom)
        return
    }
    //IF we have no groups and no active room. Set default
    if (!$rooms.thisRoom.chat || !$rooms.roomArray.length) {
        setEmptyRoom()
        printRoom(nogroup)
        return
    }
}

//Display empty room for new accounts
const setEmptyRoom = () => {
    $rooms.roomArray.push(nogroup)
    roomList = $rooms.roomArray
}

//Print chosen room key
const printRoom = async (room) => {
    $rooms.activeHugins = []
    const active = $swarm.active.find(a => a.key === room.key)
    $swarm.activeSwarm = active
    dispatch('printRoom', room)
    await sleep(150)
    readMessage(room)
}

//Function to get all users in a room.
async function filterActiveHugins() {
   const users = await window.api.getRoomUsers($swarm.activeSwarm?.key)
   const all = []
    for (const u of users) {
        const user = {address: u.address, room: u.room, name: u.name}
        make_avatar(u.avatar, u.address)
        all.push(user)
    }
    $rooms.activeHugins = all
    

}

const make_avatar = (data, address) => {
    if (!data || data.length === 0) return
    if ($rooms.avatar.some(a => a.address === address)) return
    const blob = new Blob( [ data ]);
    const avatar = URL.createObjectURL( blob );
    const usr = {avatar, address}
    $rooms.avatars.push(usr)
    $rooms.avatars = $rooms.avatars
}
//Print our conversations from DBs
async function printRooms() {
    roomList = await window.api.getRooms()

    rooms.update((current) => {
        return {
            ...current,
            roomArray: roomList,
        }
    })


    filterActiveHugins()
}

//Remove active group
const removeRoom = async () => {
    window.api.removeRoom($rooms.thisRoom.key)
    let filter = $rooms.roomArray.filter((a) => a.key !== $rooms.thisRoom.key)
    $rooms.roomArray = filter

    if ($rooms.roomArray.length) {
        $rooms.thisRoom = $rooms.roomArray[0]
        await printRooms()
    } else {
        $rooms.roomArray = []
        setEmptyRoom()
        $rooms.thisRoom = nogroup
    }
    $rooms.removeRoom = false
    dispatch('removeRoom')
    await sleep(100)
    filterActiveHugins()
}

//Read message
function readMessage(e) {
    const clear = $notify.unread.filter(unread => unread.group !== e.key)
    $notify.unread = clear

    roomList = roomList
    filterActiveHugins()
}

function sendPM() {
    // Add friend request here?
}


//Add group
const addRoom = () => {
    $rooms.addRoom = true
}

const addChannel = () => {
    $swarm.newChannel = true
}

//Set group key
$: if ($rooms.thisRoom?.key) {
    room = $rooms.thisRoom.key
}

function flipper(node, {
		delay = 0,
		duration = 200
	}) {
		return {
			delay,
			duration,
			css: (t, u) => `
				transform: rotateY(${1 - (u * 180)}deg);
				opacity: ${1 - u};
			`
		};
	}

    // const back = () => {
    //     $swarmroom.showGroups = true
    // }
</script>

<div class="wrapper" in:fly="{{ y: 50 }}"  out:fly="{{ y: -50 }}">
    <div class="top" in:fly="{{ y: 50 }}"  out:fly="{{ y: -50 }}">
        {#if show_groups}
            <h2>Rooms</h2>
            <br />
            <div class="buttons">
                <Plus on:click="{addRoom}" />
            </div>
        {:else}
            <!-- <p class="back" on:click={back}>Back</p>
            <h2>Room</h2>
            <br /> -->
            <!-- <div class="buttons">
                <Plus on:click="{addChannel}" />
            </div> -->
        {/if}
       
    </div>
            <div class="list-wrapper"  in:fly="{{ y: 50 }}">
                {#each roomList as room (room.key)}
                    <div animate:flip="{{duration: 250}}">
                        <Room r="{room}" on:print="{() => printRoom(room)}" />
                    </div>
                {/each}
            </div>
</div>


{#if $rooms.removeRoom}
    <RemoveGroup r={true}
        on:click="{() => ($rooms.removeRoom = false)}"
        on:remove="{() => removeRoom($rooms.thisRoom)}"
    />
{/if}



<style lang="scss">



.nickname {
    margin: 0;
    word-break: break-word;
    display: contents;
    font-family: 'Montserrat' !important;
    font-size: 13px;
    font-weight: bold;
}

.wrapper {
    width: 100%;
    max-width: 280px;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
}

.list-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100% - 103px);
    overflow: scroll;
}

.wrapper::-webkit-scrollbar,
.list-wrapper::-webkit-scrollbar {
    display: none;
}

.top {
    height: 85px;
    top: 0;
    width: 100%;
    max-width: 280px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.card {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    width: 100%;
    color: white;
    border-bottom: 1px solid var(--border-color);
    transition: 177ms ease-in-out;
    cursor: pointer;

    &:hover {
        background-color: #333333;
    }
}

.avatar {
    height: 30px;
}

h4 {
    margin: 0;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    font-family: 'Montserrat';
    text-overflow: ellipsis;
}

h2 {
    margin: 0;
    color: #fff;
    font-family: 'Montserrat';
    font-weight: bold;
    font-size: 22px;
}

p {
    margin: 0;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    font-size: 12px;
    margin-top: 5px;
    text-overflow: ellipsis;
}

.active_hugins {
    padding: 1rem;
    color: white;
    border-bottom: 1px solid var(--border-color);
}

.add {
    font-size: 15px;
    color: white;
}

.content {
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.remove {
    display: inline-block;
}

.buttons {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
}

.hide {
    width: 0px;
}

.back {
    cursor: pointer;
}
</style>
