<script>
    import { fade } from 'svelte/transition';
    import { messages } from "$lib/stores/messages.js";
    import ChatBubble from "/src/components/chat/ChatBubble.svelte";
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";

    let message
    const sendMsg = (e) => {
        message = e.detail.text
        messages.update(oldMsg => {
            return [...oldMsg, message]
        })
       window.api.sendMsg(message, 'SEKReThN49gfAWNJQvV9JwbiHvqj8LqAzUg4nr5ieWqSFPgirPZGnmqhWn5ULkxepuN7yK7RjyDh4dgiB56mcQHt1tqfhvQUfGq', '55544c5abf01f4ea13b15223d24d68fc35d1a33b480ee24b4530cb3011227d56')
    }
</script>

<main in:fade>
    <div class="list">
        <h1>Messages</h1>
    </div>
    <ChatWindow>
        {#each $messages as message}
            <ChatBubble message={message}/>
        {/each}
        <ChatInput on:message={sendMsg}/>
    </ChatWindow>
</main>

<style>
    h1 {
        color: white;
        margin: 0
    }

    main {
        display: flex;
        margin-left: 85px;
    }

    .list {
        width: 30%;
    }
</style>
