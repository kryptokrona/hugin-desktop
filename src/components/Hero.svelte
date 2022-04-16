<script>
    import {fade, fly} from 'svelte/transition';
</script>

<div in:fade class="hero">
    <div></div>
    <div in:fly="{{y: 50, delay: 200}}">
        <h2>In this update</h2>
    </div>
    <div in:fly="{{y: 100}}" class="socials">
        <p>Github</p>
        <p>Support</p>
        <p>Website</p>
    </div>
</div>

<style>
    .hero {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 50%;
        border-left: 1px solid rgba(255,255,255, 0.1);
        height: 100vh;
        z-index: 3;
    }

    .socials {
        display: flex;
        gap: 20px
    }
</style>