<script>
    import { fade } from 'svelte/transition';
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";

</script>

<main in:fade>
    <ChatWindow>
        <ChatInput/>
    </ChatWindow>
    <div class="list">

    </div>
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
        width: 350px;
    }
</style>
