<script>
    import ChatInput from "/src/components/chat/ChatInput.svelte";
</script>

<!--This is just a wrapper that takes nested components-->
<div class="window">
    <slot></slot>
</div>

<style>

    .window {
        margin-right: 85px;
        display: flex;
        box-sizing: border-box;
        flex-direction: column;
        justify-content: flex-end;
        background-color: #333333;
        width: 100%;
        height: 100vh;
        padding: 15px;
        gap: 10px;
        transition: 250ms ease-in-out all;
    }

</style>