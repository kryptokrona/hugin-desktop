<script>
import { groups } from "$lib/stores/user"
import { get_avatar } from "$lib/utils/hugin-utils"
import { fade } from "svelte/transition"

</script>

<h2>Contacts</h2>
<div class="settings" in:fade>
    <div class="inner blocklist">
        <div class="list-wrapper">
            <h4>Block list</h4>
            {#each $groups.blockList as blocked (blocked.address)}
                <div class="card">
                    <img
                        class="avatar"
                        src="data:image/png;base64,{get_avatar(blocked.address)}"
                        alt=""
                    />
                    <p class="name">{blocked.name}</p>
                    <br />
                    <p class="unblock" on:click={() => window.api.send('unblock', blocked.address)}>Unblock</p>
                </div>
            {/each}
        </div>
    </div>
</div>

<style lang="scss">

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
        color: white;
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

</style>