<script>
    import toast_ from 'svelte-5-french-toast';

    /** @type {{toast: any}} */
    let { toast } = $props();
</script>

<span>
    Check your balance. Try adding more to your account and wait a couple of minutes.
    <!-- <button on:click={() => window.api.send('optimize')}>Optimize</button>
    <button on:click={() => toast_.dismiss(toast.id)}>Dismiss</button> -->
</span>

<style>

</style>