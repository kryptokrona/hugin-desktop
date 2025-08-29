<script >
    import { page } from "$app/stores"
    import { rooms, transactions, user } from "$lib/stores/user"
    import { t } from '$lib/utils/translation.js'
    /** @type {{info: any, admin?: boolean}} */
    let { info, admin = false } = $props();

    let inRoom = $derived($page.url.pathname === '/rooms')

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
    <span onclick={toggleBlock} class="action">{t('block') || 'Block'}</span>
    {#if admin}
    <span onclick={toggleBan} class="action">{t('ban') || 'Ban'}</span>
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
    z-index: 1;

    .action {
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;
        color: #f5f5f5;
        border: 1px solid transparent;

        &:hover {
            background-color: var(--card-border);
            border-color: var(--success-color);
        }
    }
}

</style>