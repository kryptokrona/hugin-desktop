<script>
    import { fade } from 'svelte/transition'
    export let message

</script>

<div in:fade class="bubble">
    <p>{message}</p>
</div>

<style>

    .bubble {
        background-color: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        padding: 20px;
        border-radius: 10px;
    }

</style>