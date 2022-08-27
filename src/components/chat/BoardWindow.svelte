<script>
  //Don't know if we can handle date here, to print today, yesterday etc in chat.

</script>


<!--This is just a wrapper that takes nested components-->
<div class="window">
  <slot></slot>
</div>

<style>

    .window {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        padding: 1rem;
        box-sizing: border-box;
        overflow-y: scroll;
        overflow-x: hidden;
        width: 100%;
        z-index: 3;
    }

    .window::-webkit-scrollbar {
        display: none;
    }

</style>
