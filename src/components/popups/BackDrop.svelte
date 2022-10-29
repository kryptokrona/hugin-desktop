<script>
    //To handle true and false, or in this case show and hide.
    import { fade } from 'svelte/transition'
</script>

<div in:fade={{ duration: 100 }} out:fade={{ duration: 170 }} class="backdrop">
    <h2>Drop file here</h2>
</div>

<style lang="scss">
    .backdrop {
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        width: 100%;
        height: 100%;
        background-color: rgba(10, 10, 10, 0.8);
        -webkit-backdrop-filter: blur(9px);
        backdrop-filter: blur(9px);
        margin-right: 85px;
        z-index: 101;
        pointer-events: none;
    }

    .wrapper {
        width: 100%;
    }

    h2 {
        color: white;
        font-family: 'Montserrat';
        font-size: 22px;
    }
</style>
