<script>
    import { fade } from 'svelte/transition'
    export let message
    export let handleType

</script>

<div class:type={handleType === 'incoming'} in:fade class="bubble">
    <p>{message}</p>
</div>

<style>

    .bubble {
        background-color: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        padding: 20px;
        border-radius: 10px;
    }

    .type {
        background-color: #5f86f2;
    }

    p {
        margin: 0;
    }

</style>