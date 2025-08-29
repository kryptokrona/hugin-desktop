<script>
import { groups } from "$lib/stores/user"
import { get_avatar } from "$lib/utils/hugin-utils"
import { fade } from "svelte/transition"
import { t } from '$lib/utils/translation.js'

</script>

<h2>{t('contacts') || 'Contacts'}</h2>
<div class="settings" in:fade|global>
    <div class="inner blocklist">
        <div class="list-wrapper">
            <h4>{t('blockList') || 'Block list'}</h4>
            {#each $groups.blockList as blocked (blocked.address)}
            {#if blocked.name !== undefined}
                <div class="card">
                    <p class="name">{blocked.name}</p>
                    <br>
                    <p class="unblock" onclick={() => window.api.send('unblock', blocked.address)}>{t('unblock') || 'Unblock'}</p>
                </div>
            {/if}
            {/each}
        </div>
    </div>
</div>

<style >

h2 {
    margin-bottom: 10px;
}

.card {
    display: flex;
    height: 80px;
    padding: 1rem;
    width: 100%;
    color: var(--title-color);
    border-bottom: 1px solid var(--border-color);
    background-color: var(--backgound-color);
    transition: 200ms ease-in-out;
    cursor: pointer;
    opacity: 0.9;

    &:hover {
        color: var(--text-color);
        opacity: 1;
    }
}

.blocklist {
    width: 50%;
    height: 500px;

}

.list-wrapper {
    padding: 10%;
}

p {
    font-family: "Montserrat";
    margin-right: 15px;
}

</style>