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

    let savedMsg = []
    let from
    let key

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

    //Filter clicked conversation
    const filterMsgs = active => {
        from = active.from
        key = active.k
        savedMsg = $messages.filter(x => x.from === from)

        //Remember which conversation we clicked on
        user.update(user => {
            return {
                ...user,
                activeChat: {from: active.from, k: active.k}
            }
        })
    }

    //Update messages live if user keeps chat mounted
    $: {
        window.api.receive('newMsg', data => {
            messages.update(() => data.messages)
            savedMsg = $messages
        })
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

    //Send message to store and DB
    const sendMsg = e => {
        let msg = e.detail.text
        console.log(e)
        window.api.sendMsg(msg, from, key)
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
    <ChatList on:conversation={e => filterMsgs(e.detail)} on:click={openAdd}/>
    <ChatWindow>
        {#each savedMsg as message}
            <ChatBubble handleType={message.sent} message={message.msg}/>
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

</style>
