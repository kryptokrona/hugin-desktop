<script>
    import {fade, fly} from 'svelte/transition'
    import {groups, user, webRTC, notify} from '$lib/stores/user.js'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import {layoutState} from '$lib/stores/layout-state.js'
    import { standardGroups } from '$lib/stores/standardgroups.js'
    import FillButton from '../buttons/FillButton.svelte'
    import { isLatin, sleep } from '$lib/utils/utils'
    import Dots from '../icons/Dots.svelte'
    import Bell from '../icons/Bell.svelte'

    let activeHugins = []
    let group = ''
    let groupName
    let asian = false

    const standardGroup = "SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1"
    
    //Settings list
    const groupSetting = [
       {name: 'Notifications'} 
    ]

function sendPM() {
    // Add friend request here?
}

function copyThis(copy) {
    let msg = 'You copied a group key'
    window.api.successMessage(msg)
    navigator.clipboard.writeText(copy)
}

const myAddress = $user.myAddress

//Set group key
$: if ($groups.thisGroup.key) {
    group = $groups.thisGroup.key
}

//Active users in p2p chat
let activeUsers = []

//This group name
$: groupName = $groups.thisGroup.name

$: if (groupName) {
    if (!isLatin(groupName)) asian = true
    else asian = false
}

//Active hugins
$: activeHugins = $groups.activeHugins

$: activeList = activeHugins.filter(a => a.grp !== a.address)

$: muteGroup = $notify.off.some(a => a === groupName)

let timeout = false

const toggleNotification = () => {
    if (muteGroup) {
        const filter = $notify.off.filter(a => a !== groupName)
        $notify.off = filter
    } else {
        $notify.off.push(groupName)
    }
    $notify = $notify
    window.api.send('group-notifications', $notify.off)
}

let firstConnect = false
let loading = false

</script>

<div class="wrapper" out:fly="{{ x: 100 }}" class:hide="{$layoutState.hideGroupList}">
    <div class="top">
        <h2 class:asian style="cursor: pointer;" on:click={() => copyThis(group)}>{groupName}</h2>    
        <br />
        
        <div style="cursor: pointer; display: flex; width: 25px;" on:click={toggleNotification}>
            {#if !muteGroup}
                <Bell active={true}/>
            {:else}
                <Bell active={false}/>
            {/if}
        </div>
    </div>
        <div class="list-wrapper">
            {#each activeList as user}     
            
                    <div in:fade class="card" on:click="{() => sendPM(user)}">
                        <img
                            class="avatar"
                            src="data:image/png;base64,{get_avatar(user.address)}"
                            alt=""
                        />
                        <p class="nickname">{user.name}</p>
                        <br />
                      
                    </div>
            {/each}
        </div>

</div>

<style lang="scss">

.connectto {
    color: var(--success-color);
    margin-left: 5px;
}

.disconnect {
    color: var(--warn-color);
    margin-left: 5px;
}

.connect {
    display: flex;
    cursor: pointer;
    opacity: 0.8;
    width: 170px;
    &:hover {
        opacity: 1;
    }
}

.nickname {
    margin: 0;
    word-break: break-word;
    display: contents;
    font-family: 'Montserrat' !important;
    font-size: 12px;
}

.wrapper {
    width: 100%;
    max-width: 280px;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
    max-width: 210px;
    border-left: 1px solid var(--border-color);
    border-right: none;
    margin-right: 85px;
}

.list-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100% - 103px);
    overflow: scroll;
    padding-bottom: 20px;
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
    display: inline-table;
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
    transition: 200ms ease-in-out;
    margin-right: -125px;
}

.unread {
    background-color: var(--success-color);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    position: relative;
}

.notification {
    font-family: "Montserrat";
    font-size: 15px;
    color: var(--success-color);
    font-weight: 500;

}

.muted {
    color: var(--warn-color) !important;
}

.list {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 200px;
    padding: inherit;
    background-color: var(--card-color);
    border-radius: 0.4rem;
    z-index: 999;
    right: 18px;
    div {
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;

        &:hover {
            background-color: var(--card-border);
        }
    }
}

.asian {
    font: menu;
    font-size: 20px !important;
    font-weight: 500;
}
</style>