<script>
    import { fade } from 'svelte/transition';
    import ChatBubble from "/src/components/chat/ChatBubble.svelte";
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import {onDestroy, onMount} from "svelte";
    import ChatList from "/src/components/chat/ChatList.svelte";

    let timestamp = Date.now();
    let allMsgs = []
    let msgs = []
    let sendTo

    onMount( async () => {
        allMsgs = await window.api.getMessages()
        console.log(allMsgs)
        getMsgs(allMsgs.conversation)
    })

    const getMsgs = async conversation => {
            sendTo = conversation
            msgs = allMsgs.messages.filter(x => x.conversation === conversation)
            console.log("REQUESTED MSGS")
            return msgs
    }

    const sendMsg = e => {
        console.log(e.detail.text)
        let msg = e.detail.text
        const message = {msg, conversation: sendTo, type: 'outgoing', time: timestamp}
        console.log(message)
    }

    onDestroy(() => {
        allMsgs = []
    })

</script>

<main in:fade>
    <ChatList on:conversation={e => getMsgs(e.detail.conversation)}/>
    <ChatWindow>
        {#each msgs as message}
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
