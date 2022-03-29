<script>
    import {fly} from 'svelte/transition'
    import {page} from "$app/stores";
    import {user} from "$lib/stores/user.js";


</script>

<div class="leftMenu" in:fly="{{x: 100}}" out:fly="{{x: 100}}">
        {#if $page.url.pathname === '/boards'}
            <div class="add" on:click></div>
            {#each $user.boardsArray as board}
                    <button>{board}</button>
                {/each}
        {/if}
</div>


<style>

    .leftMenu {
        height: 100vh;
        width: 85px;
        background-color: #1d1d1d;
        box-sizing: border-box;
        padding-bottom: 1.5em;
        padding-top: 1em;
        display: flex;
        flex-direction: column;
        align-items: center;
        -webkit-app-region: drag;
        position: fixed;
        right: 0;
        z-index: 100;
        gap: 10px;
    }

    a {
        margin: 0 auto;
    }

    .add {
        height: 50px;
        width: 50px;
        border-radius: 50%;
        background-color: rgba(255, 255, 255, 0.22);
        transition: 250ms ease-in-out;
    }
    .add:hover {

        background-color: rgba(255, 255, 255, 0.4);
    }

</style>