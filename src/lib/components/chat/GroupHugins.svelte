<script>
    import {fade} from 'svelte/transition'
    import {groups} from '$lib/stores/user.js'
    import {get_avatar} from '$lib/utils/hugin-utils.js'
    import {layoutState} from '$lib/stores/layout-state.js'
    import {flip} from 'svelte/animate'

    import { page } from '$app/stores'
    import Exit from '$lib/components/icons/Exit.svelte'

    let activeHugins = []
    let group = ''
    let groupName


function sendPM() {
    // Add friend request here?
}

const clickbutton = () => {
    console.log('Click this for somethin?')
}

function copyThis(copy) {
    let msg = 'You copied a group key'
    window.api.successMessage(msg)
    navigator.clipboard.writeText(copy)
}

//Set group key
$: if ($groups.thisGroup.key) {
    group = $groups.thisGroup.key
}

//This group name
$: groupName = $groups.thisGroup.name

//Active hugins
$: activeHugins = $groups.activeHugins

$: activeList = activeHugins.filter(a => a.grp !== a.address)

</script>


<div class="wrapper" in:fade out:fade class:hide="{$layoutState.hideGroupList}">
    <div class="top">
        <h2 style="cursor: pointer;" on:click={() => copyThis($groups.thisGroup.key)}>{groupName}</h2>
        <br />
        <br />
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
    transition: 200ms ease-in-out;
    margin-right: -125px;
}
</style>
