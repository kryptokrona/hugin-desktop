<script>
    import { fade } from 'svelte/transition'
    export let message
    export let handleType
</script>

<!-- Takes incoming data and turns it into a bubble that we then use in {#each} methods. -->
<div class:type={handleType === 'incoming'} in:fade class="bubble">
    <p>{message}</p>
</div>

<style>

    .bubble {
        background-color: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        padding: 10px;
        border-radius: 8px;
    }

    .type {
        background-color: #5f86f2;
    }

    p {
        margin: 0;
    }

</style>