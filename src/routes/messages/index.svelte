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
    let box
    //Get messages on mount
    onMount(async () => {

      user.update(data => {
        return {
          ...data,
          replyTo: {reply: false},
        }
      })

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
        let active_chat = {chat: chat, k: key, name: active.name}
        user.update(user => {
            return{
                ...user,
               activeChat: active_chat
            }
        })
        savedMsg = $messages.filter(x => x.chat === chat)
        scrollDown()

    }
    //Chat to add
    const handleAddChat = e => {

      let addContact = e.detail.chat + e.detail.k
      //Send contact to backend and to saveContact()
        window.api.addChat(addContact, e.detail.name)
        console.log('event', e.detail)
        //Add input to message arr
        let newMessage = e.detail
        //Prepare send function and filter
        printConversation(newMessage)
        //Close popup
        wantToAdd = false
    }
      //Update messages live if users keep chat mounted
    const printMessage = (data) =>  {
          savedMsg.push(data)
          savedMsg = savedMsg
          scrollDown()
    }

    const saveToStore = (data) => {

      messages.update(current => {
          return [...current, data]
      })
    }
    //Listen for new message private messages saved in DB
      window.api.receive('newMsg', data => {
      console.log('new message', data);
      console.log('userchat', $user.activeChat.chat)

      saveToStore(data)
      if (data.chat === $user.activeChat.chat) {
        printConversation(data)
      } else {

        saveToStore(data)
        console.log('not this conversation');
      }
    })


    $: active_contact

    //Send message to store and DB
    const sendMsg = e => {

        let msg = e.detail.text
        let myaddr = $user.huginAddress.substring(0,99)
        let myMessage = {chat: chat, msg: msg, sent: true, t: Date.now()}

        window.api.sendMsg(msg, active_contact)
        printMessage(myMessage)
    }

    //Default value should be false to hide the AddChat form.
    let wantToAdd = false
    const openAdd = () => {
        wantToAdd = !wantToAdd
    }

    $ : savedMsg

	function scrollDown() {
	box.scrollIntoView({behavior: "smooth", block: "end", inline: "nearest"})
	}
</script>

{#if wantToAdd}
    <AddChat on:click={openAdd} on:addChat={e =>handleAddChat(e)}/>
{/if}
<main in:fade>
    <ChatList on:conversation={(e) => printConversation(e.detail)} on:click={openAdd} />
    <div class="rightside">'

    <div class="chat_window" bind:this={box}>
        <ChatWindow>


            {#each savedMsg as message}
                <ChatBubble handleType={message.sent} message={message.msg} ownMsg={message.sent} msgFrom={message.chat} timestamp={message.t}/>
            {/each}

        </ChatWindow>
    </div>
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

    .chat_window {
      display: grid;
    }

</style>
