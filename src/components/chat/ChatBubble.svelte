<script>
    import {fade} from 'svelte/transition'
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    export let message
    export let handleType
    export let msgFrom
    export let ownMsg

</script>

<!-- Takes incoming data and turns it into a bubble that we then use in {#each} methods. -->
{#if ownMsg}
    <div class:type={handleType} class="bubble">
        <img class="avatar"
             src="data:image/png;base64,{get_avatar("SEKReYaGR8MLzRvJEj626B1ybiZTrvyoUFtexaHpEiFL5cynpxKfVeV3BUVAKZqYQyDPQtT26sTAUi47gskf9MTyDHoq1utP4xT")}" alt="">

        <p>{message}</p>
    </div>
{:else}
    <div class:type={handleType} class="bubble">
        <img class="avatar"
             src="data:image/png;base64,{get_avatar(msgFrom)}" alt="">

        <p>{message}</p>
    </div>
{/if}

<style>

    .bubble {
        border-radius: 8px;
        display: flex;
        align-items: center;
        color: rgba(255, 255, 255, 0.8);
        padding: 15px 25px 15px 15px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);;
    }

    .type {
        color: rgba(255, 255, 255, 0.8);
    }

    p {
        margin: 0;
    }

</style>