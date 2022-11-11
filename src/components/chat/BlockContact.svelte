<script>
    //To handle true and false, or in this case show and hide.
    import { fade, fly } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte'
    import { user } from '$lib/stores/user'
    import FillButton from '../buttons/FillButton.svelte'

    const blockContact = () => {
        window.api.send('block', $user.block.address, $user.block.name)
        $user.block = false
    }
    </script>
    
    <div in:fade="{{ duration: 100 }}" out:fade="{{ duration: 80 }}" class="backdrop" on:click={() => $user.block = false}>
        <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
            <h3 in:fade>Block contact?</h3>
            
                <FillButton 
                    red={true} 
                    text="Block" 
                    disabled={false}
                    on:click={blockContact} />
        </div>
    </div>
    
    <style lang="scss">
    .backdrop {
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        top: 0;
        bottom: 0;
        left: 0;
        width: 100%;
        background-color: var(--backdrop-color);
        z-index: 103;
    }
    
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
        color: white;
        font-family: 'Montserrat';
    }
    </style>
    