<script>
    import toast_ from 'svelte-french-toast';

    export let toast;
</script>

<span>
    Failed to send. Press Optimize to create more message inputs and wait a couple of minutes.
    <button on:click={() => window.api.send('optimize')}>Optimize</button>
    <button on:click={() => toast_.dismiss(toast.id)}>Dismiss</button>
</span>

<style>

</style>