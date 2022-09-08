<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { groupMessages } from "$lib/stores/groupmsgs.js";
  import { groups } from "$lib/stores/user.js";
  import { get_avatar } from "$lib/utils/hugin-utils.js";
  import Exit from "/src/components/buttons/Exit.svelte";
  import Group from "/src/components/chat/Group.svelte";
  import Plus from "/src/components/buttons/Plus.svelte";
  import RemoveGroup from "/src/components/chat/RemoveGroup.svelte";
  import ListButton from "/src/components/buttons/ListButton.svelte";

  let new_message_sound = new Audio("/static/audio/message.mp3");
  const dispatch = createEventDispatcher();
  let activeHugins = [];
  let contacts = [];
  let msgkey;
  let newArray = []
  let groupArray = []
  let showActive = false
  //Get message updates and trigger filter
  let group = ""
  let groupName
  onMount(()=> {
    printGroups()
  })
  $: if ($groups.thisGroup.key) {
    group = $groups.thisGroup.key
  }
  groupMessages.subscribe(() => {
    
    filterActiveHugins($groupMessages);
  });

  
  //Listen for sent message to update conversation list
  window.api.receive("groupMsg", () => {
    printGroups()
  });

  const sendPM = (user) => {
    console.log("User", user);
    console.log
  };

  const printGroup = (grp) => {
    console.log('print group!', grp)
    dispatch("printGroup", grp)
  };

  const showList = () => {
    showActive = !showActive
  }


  //Function to filer array of active users on board.
  function filterActiveHugins(arr) {
    let uniq = {};
    activeHugins = arr.filter(obj => !uniq[obj.key] && (uniq[obj.key] = true));
    console.log('active hugins',activeHugins)
  }

  $: activeHugins;
  $: groupArray = $groups.groupArray
  

  //Print our conversations from DBs
  async function printGroups() {

    newArray = await window.api.getGroups();
    if (groupArray.length) {
      if (newArray[0].timestamp != groupArray[0].timestamp && newArray[0].sent == 0 && $groups.thisGroup.key != groupArray[0].chat) {

        newArray[0].new = true;

        new_message_sound.play();
        }
      }
    

    console.log('newArray', newArray)
    let my_groups = await checkNew();

    console.log("conv", my_groups);

    groups.update(current => {
      return {
        ...current,
        groupArray: my_groups
      };
      
      filterActiveHugins($groupMessages);
    });


  console.log("Printing conversations", newArray);
}

const removeGroup = async () => {
  console.log($groups.thisGroup.key)
  window.api.removeGroup($groups.thisGroup.key)
  let filter = $groups.groupArray.filter(a => a.key !== $groups.thisGroup.key)
  $groups.groupArray = filter
  console.log('array', $groups.groupArray)
  await printGroups()
  if ($groups.groupArray.length) {

    $groups.thisGroup = $groups.groupArray[0]
  } else {
    $groups.groupArray = []
    let nogroup = {name: "Private groups", chat: "verysecretkeyinchat", key: "verysecretkeyinchat", msg: "Click the add icon"}
    $groups.groupArray.push(nogroup)
    $groups.thisGroup = nogroup
  }
  $groups.removeGroup = false
  console.log('want to print', $groups.thisGroup)
  dispatch("removeGroup")
}

function readMessage(e) {

console.log("reading this");

groupArray = groupArray.map(function(a) {

  if (e.new && a.key == e.key) {
    console.log("reading this", a);
    a.new = false;
  }
  return a;

});

groupArray = groupArray;
}

$ : groupArray;

async function checkNew() {
    let filterNew = [];
    newArray.forEach(function(a) {

      groupArray.some(function(b) {
        console.log("checking?");
        if (b.new && a.chat === b.chat) {
          console.log("old new, keep new", b);
          a.new = true;
        }
      });
      filterNew.push(a);
      console.log("pushin");
    });

    console.log("conversations filtered and set", filterNew);

    return filterNew;
  }

  function copyThis(copy) {
    navigator.clipboard.writeText(copy);
  }

  
  const addGroup = () => {
    $groups.addGroup = true
  }

  const openRemove = () => {
    $groups.removeGroup =! $groups.removeGroup
  }


  $: groupName = $groups.thisGroup.name

</script>

{#if $groups.removeGroup}
<RemoveGroup on:click={openRemove} on:remove={()=> removeGroup($groups.thisGroup)}/>
{/if}

<div class="wrapper">
  <div class="top">
    <h2>Groups</h2><br>
    <div class="buttons">
      <Exit on:remove={openRemove}/>
      <ListButton on:click={showList}/>
      <Plus on:click={addGroup}/>
    </div><br>
  </div>
  {#if showActive}
  <div class="active_hugins">
    <h4>Active Hugins</h4>
  </div>
  <div class="list-wrapper">
   
    {#each activeHugins as user}
      <div class="card" on:click={(e) => sendPM(user)}>
        <img class="avatar"
             src="data:image/png;base64,{get_avatar(user.address)}" alt="">
        <p class="nickname">{user.name}</p><br>
      </div>
    {/each}
  </div>
    {:else}
    <div class="list-wrapper">
      {#each $groups.groupArray as group}
        <Group {group} on:print={()=> printGroup(group)}/>
      {/each}
    </div>
    {/if}

</div>

<style lang="scss">

  .nickname {
    margin: 0;
    word-break: break-word;
    display: contents;
    font-family: "Montserrat" !important;
    font-size: 13px;
    font-weight: bold;
  }


  .wrapper {
    width: 100%;
    max-width: 280px;
    z-index: 3;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
  }

  .list-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: scroll;
  }
  
  .wrapper::-webkit-scrollbar, .list-wrapper::-webkit-scrollbar {
      display: none;
    }

  .top {
    height: 100px;
    top: 0;
    width: 100%;
    max-width: 280px;
    padding: 20px;
    display: block;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    z-index: 9;
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
    font-family: "Montserrat";
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
    display: flex;
    gap: 10px;
    cursor: pointer;
    justify-content: space-between;
  }

</style>
