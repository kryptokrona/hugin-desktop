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
    let from
    let active_contact
    let savedMsg = []
    let key
    let data
    let contact
    let codec
    let stream
    //Get messages on mount
    onMount(async () => {
        //Get messages and save to a variable.
        messages.set(await window.api.getMessages(res => {
            savedMsg = res
        }))
        //Log to verify
        console.log('FROM ELECTRON DB', savedMsg)
        //If we have an active chat in store we show that conversation
        if ($user.activeChat) {
            filterMsgs($user.activeChat)
        }
    })
    const filterMsgs = active => {
        from = active.from
        key = active.k
        active_contact = from + key;
        savedMsg = $messages.filter(x => x.from === from)
    }
    //Chat to add
    const handleAddChat = e => {
        //Add input to message arr
        messages.update(current => {
            return [e.detail, ...current]
        })
        //Prepare send function and filter
        filterMsgs(e.detail)
        console.log("Conversation to add", e.detail)
        //Close popup
        wantToAdd = false
    }
    //Update messages live if users keep chat mounted
    $: {
        window.api.receive('newMsg', data => {
            messages.update(() => data.messages)
            savedMsg = $messages
            console.log('UPDATED MSG', savedMsg)
        })
    }

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
    <ChatList on:conversation={e => filterMsgs(e.detail)} on:click={openAdd} />
    <ChatWindow>
        {#each savedMsg as message}
            <ChatBubble handleType={message.sent} message={message.msg} ownMsg={message.sent} msgFrom={message.from}/>
        {/each}

        <ChatInput on:message={sendMsg}/>
    </ChatWindow>
</main>

<style>

    main {
        display: flex;
        margin-left: 85px;
        height: 100vh;
        overflow: hidden;
    }

    .button {
        background: magenta;
        color: white;
        position: center;
        top: 5px;
    }

</style>
