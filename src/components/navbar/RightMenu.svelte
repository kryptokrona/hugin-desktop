<script>
    import {fly} from 'svelte/transition'
    import {page} from "$app/stores";
</script>

<div class="leftMenu" in:fly="{{x: 100}}" out:fly="{{x: 100}}">
    <div class="top">
        {#if $page.url.pathname === '/boards'}
            <button>Home</button>
        {/if}
    </div>
    <div class="bottom">
    </div>
</div>


<style>

    .leftMenu {
        height: 100vh;
        width: 85px;
        background-color: #1d1d1d;
        box-sizing: border-box;
        padding-bottom: 1.5em;
        padding-top: 3em;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        -webkit-app-region: drag;
        position: fixed;
        right: 0;
        z-index: 100;
    }

    .top {

    }

    .bottom {
        display: flex;
        flex-direction: column;
        gap: 15px
    }

    a {
        margin: 0 auto;
    }

</style>