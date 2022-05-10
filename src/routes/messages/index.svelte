<script>
    import {fade} from 'svelte/transition';
    import {onMount} from "svelte";
    import {messages} from "$lib/stores/messages.js";
    import ChatBubble from "/src/components/chat/ChatBubble.svelte";
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import ChatList from "/src/components/chat/ChatList.svelte";
    import AddChat from "/src/components/chat/AddChat.svelte";
    import {user} from "$lib/stores/user.js";
    let video
    let audio
    let chat
    let active_contact
    let savedMsg = []
    let key
    let data
    let contact
    let codec
    let stream
    //Get messages on mount
    onMount(async () => {

        //If we have an active chat in store we show that conversation
        if ($user.activeChat) {
            printConversation($user.activeChat)
        }
    })

    //Prints conversation from active contact
    const printConversation = (active) => {

      console.log('printing conversation', active);
        chat = active.chat
        key = active.k
        active_contact = chat + key;
        savedMsg = $messages.filter(x => x.chat === chat)
    }
    //Chat to add
    const handleAddChat = e => {
        //Add input to message arr
        messages.update(current => {
            return [e.detail, ...current]
        })
        //Prepare send function and filter
        printConversation(e.detail)
        console.log("Conversation to add", e.detail)
        //Close popup
        wantToAdd = false
    }
        //Update messages live if users keep chat mounted
          const printMessage = (data) =>  {
          savedMsg.unshift(data)
          savedMsg = savedMsg
          messages.update(() => savedMsg)
    }


    $: {
          window.api.receive('newMsg', data => {
          if (data.chat === chat) {
            printMessage(data)
          }
        })


    }

    $ : savedMsg

    $: active_contact

    //Send message to store and DB
    const sendMsg = e => {
        let msg = e.detail.text
        console.log(e)
        window.api.sendMsg(msg, active_contact)
    }

    //Default value should be false to hide the AddChat form.
    let wantToAdd = false
    const openAdd = () => {
        wantToAdd = !wantToAdd
    }


</script>

{#if wantToAdd}
    <AddChat on:click={openAdd} on:addChat={e =>handleAddChat(e)}/>
{/if}

<main in:fade>
    <ChatList on:conversation={(e) => printConversation(e.detail)} on:click={openAdd} />
    <div class="rightside">
        <ChatWindow>
            {#each savedMsg as message}
                <ChatBubble handleType={message.sent} message={message.msg} ownMsg={message.sent} msgFrom={message.chat}/>
            {/each}
        </ChatWindow>
        <ChatInput on:message={sendMsg}/>
    </div>
</main>

<style lang="scss">

    main {
        display: flex;
        margin-left: 85px;
        height: 100vh;
        overflow: hidden;
        z-index: 3;
    }

    .rightside {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      box-sizing: border-box;
      width: 100%;
      margin-right: 85px;
    }

</style>
