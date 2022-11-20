<script>
    import toast_ from 'svelte-french-toast';

    export let toast;
</script>

<span>
    Failed to send, want to optimize?
    <button on:click={() => window.api.send('optimize')}>Optimize</button>
    <button on:click={() => toast_.dismiss(toast.id)}>Dismiss</button>
</span>

<style>

</style>