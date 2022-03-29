<script>
    import { fade, fly } from 'svelte/transition'
    export let message

</script>

<div in:fly="{{y: 50}}" class="bubble">
    <p>{message}</p>
</div>

<style>

    .bubble {
        background-color: rgba(255, 255, 255, 0.15);
        color: #ffffff;
        padding: 20px;
        border-radius: 10px;
    }

    p {
        margin: 0;
    }

</style>