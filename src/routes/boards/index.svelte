<script>
    import { fade } from 'svelte/transition';
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";

</script>

<main in:fade>
    <div class="list">

    </div>
    <ChatWindow>
        <ChatInput/>
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
        width: 40%;
    }
</style>
