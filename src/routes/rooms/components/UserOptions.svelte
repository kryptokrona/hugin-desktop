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
            address: msgFrom,
            name: nickname
        }
    }

    const toggleBan = () => {
        $rooms.showBlockInfo = !$rooms.showBlockInfo
        if (!$rooms.showBlockInfo) return
        $rooms.ban = {address: info.address}
    }

</script>

<div style="display: grid; position: fixed; margin-top: 20px;">
    <p on:click={toggleBlock} class="action">Block</p>
    {#if admin}
    <p on:click={toggleBan} class="action">Ban</p>
    {/if}
</div>

<style lang="scss">
    

</style>