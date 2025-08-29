<script>
    //To handle true and false, or in this case show and hide.
    import { fade, fly } from 'svelte/transition'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import { rooms, swarm } from '$lib/stores/user'
    import Backdrop from '$lib/components/layouts/Backdrop.svelte'
    import { t } from '$lib/utils/translation.js'
    
    let {
        onClose
    } = $props()

    const ban = () => {
        window.api.send('ban-user', {address: $rooms.ban.address, key: $rooms.thisRoom.key})
        window.api.successMessage(t('bannedUser') || 'Banned user')
        $rooms.ban = {}
        close()
    }

    const close = () => {
       onClose()
    }
    
    </script>
    
    
    <Backdrop onClose={close}>

    
        <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="card">
            <h3 in:fade|global>{t('banUserQuestion', { name: $rooms.ban.name }) || `Ban ${$rooms.ban.name}?`}</h3>

                <FillButton
                    red={true}
                    text={t('ban') || 'Block'}
                    disabled={false}
                    on:click|once="{ban}" />
        </div>

    
    </Backdrop>
    
    <style lang="scss">

    h3 {
        margin: 0;
        color: var(--title-color);
    }

    .card {
        background-color: var(--backgound-color);
        border: 1px solid var(--card-border);
        padding: 20px;
        border-radius: 8px;
        width: 250px;
        height: 125px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
    }

    p {
        font-size: 12px;
        color: var(--text-color);
        font-family: 'Montserrat';
    }
    </style>
    