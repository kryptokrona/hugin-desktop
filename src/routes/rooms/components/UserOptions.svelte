<script >
    import { rooms, user } from "$lib/stores/user"
    export let info
    export let admin = false

    const toggleBlock = () => {
        if ($user.block) {
            $user.block = false
            return
        }
        $user.block = {
            address: info.address,
            name: info.name
        }
    }

    const toggleBan = () => {
        $rooms.showBanInfo = !$rooms.showBanInfo
        if (!$rooms.showBanInfo) return
        $rooms.ban = {
            address: info.address,
            name: info.name
        }
    }

</script>

<div class="menu">
    <span on:click={toggleBlock} class="action">Block</span>
    {#if admin}
    <span on:click={toggleBan} class="action">Ban</span>
    {/if}
</div>

<style lang="scss">

.menu {
    position: absolute;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 120px;
    padding: 5px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;

    .action {
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;
        color: #f5f5f5;

        &:hover {
            background-color: var(--card-border);
        }
    }
}

</style>