<script>
    import {fade} from 'svelte/transition';
    import {messages} from "$lib/stores/messages.js";
    import ChatBubble from "/src/components/chat/ChatBubble.svelte";
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import {onMount} from "svelte";
    import ChatList from "/src/components/chat/ChatList.svelte";

    let timestamp = Date.now();
    let savedMsg
    let conversation

    //Get msgs from DB and save in store
    onMount(async () => {
        savedMsg = await window.api.getMessages()
        messages.set(savedMsg)
        console.log("FROM DB", $messages)
    })

    const filterMsgs = async clicked => {
        $messages = savedMsg
        conversation = clicked
        $messages = $messages.filter(x => x.conversation === clicked)
        return $messages
    }

    const sendMsg = e => {
        let msg = e.detail.text
        const message = {msg, conversation: conversation, type: 'outgoing', time: timestamp}
        messages.update(current => {
            return[...current, message]
        })

        //window.api.sendMsg(msg, conversation, timestamp)
        console.log("store", $messages)
    }

</script>

<main in:fade>
    <ChatList on:conversation={e => filterMsgs(e.detail.conversation)}/>
    <ChatWindow>
        {#each $messages as message}
            <ChatBubble handleType={message.type} message={message.msg.msg}/>
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
