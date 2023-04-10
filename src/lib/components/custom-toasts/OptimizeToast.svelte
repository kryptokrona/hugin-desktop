<script>
    import toast_ from 'svelte-french-toast';

    export let toast;
</script>

<span>
    Check your balance. Press <b>Optimize</b> once and wait a couple of minutes.
    <button on:click={() => window.api.send('optimize')}>Optimize</button>
    <button on:click={() => toast_.dismiss(toast.id)}>Dismiss</button>
</span>

<style>

</style>