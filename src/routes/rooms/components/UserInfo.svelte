<script>
    //To handle true and false, or in this case show and hide.
    import { fade, fly } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import { rooms, swarm } from '$lib/stores/user'
    import Backdrop from '$lib/components/layouts/Backdrop.svelte'
    export let user

    const dispatch = createEventDispatcher()
    
    const ban = () => {
        window.api.send('ban-user', {address: user.address, key: $rooms.thisRoom.key})
        window.api.successMessage('Banned user')
        $rooms.showUserInfo = false
    }

    const close = () => {
        $rooms.showUserInfo = false
    }
    
    </script>
    
    
    <Backdrop on:close={close}>
    
        <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
                <div >
                    <p>Ban
                    <br>
                    {user.name}
                        
                    </p>
                        <FillButton
                        red="{true}"
                        text="{"Ban"}"
                        disabled="{false}"
                        enabled="{true}"
                        on:click|once="{ban}"
                        />
                        <br>
                        <br>
                </div>
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
        padding: 30px;
        border-radius: 8px;
        width: 250px;
        height: 300px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
    }
    
    p {
        font-size: 15px;
        color: white;
        font-family: 'Montserrat';
    }
    </style>
    