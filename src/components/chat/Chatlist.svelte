<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { messages } from "$lib/stores/messages.js";
  import { user } from "$lib/stores/user.js";
  import AddCircle from "/src/components/buttons/AddCircle.svelte"
  import Contact from "/src/components/chat/Contact.svelte";
  import { layoutState } from "$lib/stores/layout-state.js";

  const dispatch = createEventDispatcher();

  let filterArr = [];
  let nickname;
  let newArray;

  onMount(async () => {

    newArray = await window.api.getConversations();
    filterArr = newArray;
    if ($user.activeChat) return;
    sendConversation(newArray[0]);

  });

  //Get message updates and trigger filter
  messages.subscribe(() => {
    console.log(
      " messages subscribe logg?"
    );
    //   console.log('$messages', $messages);
    //         console.log('Printing conversations');
    //           printConversations()
  });

  //Listen for sent message to update conversation list
  window.api.receive("sent", data => {
    printConversations();
  });

  //Listen for sent message to update conversation list
  window.api.receive("newMsg", () => {
    printConversations();
  });

  //Listen for sent message to update conversation list
  window.api.receive("saved-addr", data => {
    printConversations();
  });

  async function checkNew() {
    let filterNew = [];
    newArray.forEach(function(a) {
      filterArr.some(function(b) {
        if (b.new && a.chat === b.chat) {
          console.log("old new, keep new", b);
          a.new = true;
        }
      });
      filterNew.push(a);
    });

    console.log("conversations filtered and set", filterNew);

    return filterNew;
  }


  //Print our conversations from DBs
  async function printConversations() {

    newArray = await window.api.getConversations();

    //If it is not the same message and not our active chat, add unread boolean
    if (newArray[0].timestamp !== filterArr[0].timestamp && newArray[0].sent === 0 && $user.activeChat.chat !== newArray[0].chat) {
      newArray[0].new = true;
    }

    let conversations = await checkNew();
    $user.contacts = conversations
    console.log("conv", conversations);

    console.log("Printing conversations");
    //If we have no active chat we take the latest known message and dispatch.
    if (!$user.activeChat) {
      console.log("no userchat", $user.activeChat);
      console.log(newArray);

      sendConversation(newArray[0]);
    }

    filterArr = conversations;
  }

  //Dispatches the clicked conversation to parent
  function sendConversation(message) {
    readMessage(message);
    let chat = message.chat;
    let msgkey = message.key;
    let name = message.name;
    let active_chat = { chat: chat, k: msgkey, name: name };
    user.update(user => {
      return {
        ...user,
        activeChat: active_chat
      };
    });
    dispatch("conversation", active_chat);
    printConversations();
  }

  function readMessage(e) {

    console.log("reading this");

    filterArr = filterArr.map(function(a) {

      if (e.new && a.chat == e.chat) {
        console.log("reading this", a);
        a.new = false;
      }
      return a;

    });

    filterArr = filterArr;
  }

  $ : filterArr;

</script>

<div class="wrapper" class:hide={$layoutState.hideChatList === true}>
  <div class="top">
    <h2>Messages</h2>
    <AddCircle on:click={()=> dispatch('open')} />
  </div>
  <div class="list-wrapper">
    {#each filterArr as message (message.timestamp)}
      <Contact on:openRename={(e)=> dispatch('openRename')} on:rename={(a) => dispatch('rename', a)} contact={message}
               on:thisContact={(e)=> sendConversation(e.detail.contact)} />
    {/each}
  </div>
</div>

<style lang="scss">

  .top {
    top: 0;
    width: 100%;
    padding: 20px;
    height: 85px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
  }

  .wrapper {
    width: 100%;
    height: 100%;
    max-width: 280px;
    border-right: 1px solid var(--border-color);
    z-index: 3;
    transition: all 0.3s ease-in-out;
  }

  .list-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100% - 103px);
    overflow-x: scroll;
  }

  .wrapper::-webkit-scrollbar, .list-wrapper::-webkit-scrollbar {
    display: none;
  }

  h2 {
    margin: 0;
    color: var(--title-color);
    font-size: 22px;

  }

  .add-icon {
    background-color: transparent;
    border: none;
    cursor: pointer;
    padding: 5px;
    border-radius: 5px;
    transition: 250ms ease-in-out;

    &:hover {
      opacity: 50%;
      padding: 5px;
    }
  }

  .hide {
    margin-left: -281px;
  }

</style>
