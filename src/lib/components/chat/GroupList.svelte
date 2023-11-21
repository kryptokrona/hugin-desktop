<script>
    import {createEventDispatcher, onDestroy, onMount} from 'svelte'
    import {fade, fly} from 'svelte/transition'
    import {groupMessages} from '$lib/stores/groupmsgs.js'
    import {groups, swarm} from '$lib/stores/user.js'
    import Group from '$lib/components/chat/Group.svelte'
    import Plus from '$lib/components/icons/Plus.svelte'
    import RemoveGroup from '$lib/components/chat/RemoveGroup.svelte'
    import {layoutState, swarmGroups} from '$lib/stores/layout-state.js'
    import {sleep} from '$lib/utils/utils.js'
    import {flip} from 'svelte/animate'

    let activeHugins = []
    let newArray = []
    let groupList = []
    let group = ''
    let groupName
    const dispatch = createEventDispatcher()
    const nogroup = {
            nick: 'No contacts',
            chat: 'Hugin Groups',
            key: 'SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1',
            msg: 'Click the + icon',
            name: 'Private groups',
        }

    
onMount( async () => {
    await printGroups()
    filterActiveHugins($groupMessages)
    checkGroup()
})

onDestroy(() => {
    window.api.removeAllListeners('groupMsg')
})

//Listen for sent message to update conversation list
window.api.receive('groupMsg', () => {
    filterActiveHugins($groupMessages)
    printGroups()
})

//Check active group status
const checkGroup = () => {
    //If we have an active group
    if ($groups.thisGroup.chat) {
        printGroup($groups.thisGroup)
        return
    }
    //If we have groups but no active, print the first.
    if ($groups.groupArray.length && !$groups.thisGroup.chat) {
        $groups.thisGroup = $groups.groupArray[0]
        printGroup($groups.thisGroup)
        return
    }
    //IF we have no groups and no active group. Set default
    if (!$groups.thisGroup.chat) {
        setEmptyGroup()
        printGroup(nogroup)
        return
    }
}

//Display empty group for new accounts
const setEmptyGroup = () => {
    $groups.groupArray.push(nogroup)
    groupList = $groups.groupArray
}

//Print chosen group key
const printGroup = async (grp) => {
    dispatch('printGroup', grp)
    await sleep(150)
    readMessage(grp)
}

//Function to filer array of active users on board.
function filterActiveHugins(arr) {
    let uniq = {}
    $groups.activeHugins = arr.filter((obj) => !uniq[obj.address] && (uniq[obj.address] = true))
}

//Print our conversations from DBs
async function printGroups() {
    let groupmessages = await window.api.getGroups()
    let uniq = {}
    newArray = groupmessages.filter((obj) => !uniq[obj.key] && (uniq[obj.key] = true))

    if (groupList.length) {
        if (
            newArray[0].timestamp !== groupList[0].timestamp &&
            newArray[0].sent === 0 &&
            $groups.thisGroup.key !== newArray[0].chat
        ) {
            newArray[0].new = true
        }
    }

    let my_groups = await checkNew()

    groups.update((current) => {
        return {
            ...current,
            groupArray: my_groups,
        }
    })

    groupList = my_groups

    filterActiveHugins($groupMessages)
}

//Remove active group
const removeGroup = async () => {
    console.log($groups.thisGroup.key)
    window.api.removeGroup($groups.thisGroup.key)
    let filter = $groups.groupArray.filter((a) => a.key !== $groups.thisGroup.key)
    $groups.groupArray = filter

    if ($groups.groupArray.length) {
        $groups.thisGroup = $groups.groupArray[0]
        await printGroups()
    } else {
        $groups.groupArray = []
        setEmptyGroup()
        $groups.thisGroup = nogroup
    }
    $groups.removeGroup = false
    dispatch('removeGroup')
    await sleep(100)
    filterActiveHugins($groupMessages)
}

//Read message
function readMessage(e) {

    groupList = groupList.map(function (a) {
        if (e.new && a.key === e.key) {
            a.new = false
        }
        return a
    })

    groupList = groupList
    filterActiveHugins($groupMessages)
}

$: groupList

//Check new messages
async function checkNew() {
    let filterNew = []
    newArray.forEach(function (a) {
        groupList.some(function (b) {
            if (b.new && a.chat === b.chat) {
                a.new = true
            }
        })
        filterNew.push(a)
    })

    return filterNew
}

function sendPM() {
    // Add friend request here?
}


//Add group
const addGroup = () => {
    $groups.addGroup = true
}

const addChannel = () => {
    $swarm.newChannel = true
}

//Set group key
$: if ($groups.thisGroup.key) {
    group = $groups.thisGroup.key
}

//This group name
$: groupName = $groups.thisGroup.name

$: active_swarm = $swarm.active.some(a => groupList.map(b=>b.key).includes(a.key))


//Active hugins
$: activeHugins

$: show_groups = true
	
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

    const back = () => {
        $swarmGroups.showGroups = true
    }

</script>

<div class="wrapper" in:fade>
    <div class="top" in:fly="{{ y: 50 }}"  out:fly="{{ y: -50 }}">
        {#if show_groups}
            <h2>Groups</h2>
            <br />
            <div class="buttons">
                <Plus on:click="{addGroup}" />
            </div>
        {:else}
            <p class="back" on:click={back}>Back</p>
            <h2>Rooms</h2>
            <br />
            <!-- <div class="buttons">
                <Plus on:click="{addChannel}" />
            </div> -->
        {/if}
       
    </div>
            <div class="list-wrapper"  in:fly="{{ y: 50 }}">
                {#each groupList as group (group.key)}
                    <div animate:flip="{{duration: 250}}">
                        <Group group="{group}" on:print="{() => printGroup(group)}" />
                    </div>
                {/each}
            </div>
</div>


{#if $groups.removeGroup}
    <RemoveGroup
        on:click="{() => ($groups.removeGroup = false)}"
        on:remove="{() => removeGroup($groups.thisGroup)}"
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
