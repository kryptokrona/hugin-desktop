<script>
    //Don't know if we can handle date here, to print today, yesterday etc in chat.
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
        background-color: #202020;
        width: 100%;
        height: 100vh;
        overflow: hidden;
    }

    .window::-webkit-scrollbar {
    display: none;
    }

</style>