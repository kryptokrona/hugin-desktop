<script>
    //To handle true and false, or in this case show and hide.
    import { fade, fly } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import { swarm } from '$lib/stores/user'
    
    const dispatch = createEventDispatcher()

    const enter = (e) => {
        window.localStorage.setItem('swarm-info', true)
        dispatch('join-room')
        $swarm.showInfo = false
    }
    
    </script>
    
    <svelte:window on:keyup|preventDefault="{enter}" />
    
    
    <div in:fade="{{ duration: 100 }}" out:fade="{{ duration: 100 }}" class="backdrop" on:click|self>
    
        <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
                <div >
                <p>This feature is still experimental! 
                    Join rooms only with friends.
                    
                </p>
                    <FillButton
                    text="{"Join"}"
                    disabled="{false}"
                    enabled="{true}"
                    on:click="{() => enter()}"
                />
        </div>
    
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
        backdrop-filter: blur(8px);
        z-index: 103;
        border-radius: 15px;
    }
    
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
    