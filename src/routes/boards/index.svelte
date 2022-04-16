<script>
    import { fade } from 'svelte/transition';
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";

</script>

<main>
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
        margin-right: 85px;
        z-index: 3;
    }

    .list {
        width: 350px;
        border-left: 1px solid rgba(255,255,255,0.1);
    }
</style>
