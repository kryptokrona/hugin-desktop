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
        $rooms.showBlockInfo = !$rooms.showBlockInfo
        if (!$rooms.showBlockInfo) return
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
        display: grid; 
        position: fixed; 
        margin-top: 20px;
        background-color: var(--card-background);
        border-radius: 3px;
        border: 1px solid var(--card-border);
        padding: 5px;
        z-index: 9999;

        span {
            color: white;
            cursor: pointer;
            padding: 2px;
        }

    }
    

</style>