<script>
    import { run, preventDefault, self } from 'svelte/legacy';

    import { fade, fly } from 'svelte/transition'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import {swarm, groups} from '$lib/stores/user.js'

    
    let enableAdd = $state(false)
    let thisSwarm = $derived($swarm.active.find(a => a.key === $groups.thisGroup.key))
    let name = $state('')

    let {
        onNewChannel
    } = $props()
    
    run(() => {
        name
    });

    const enter = (e) => {
        if (enableAdd && name.length > 0 && e.keyCode === 13) {
            new_channel()
        }
    }
    
    const checkError = () => {
        let error = false
        let errorMessage
        if (thisSwarm.channels.some((g) => g.name === name)) {
            errorMessage = 'Channel already exists'
            error = true
        }

        if (name.length < 1) error = true
        if (error) {
            window.api.errorMessage(errorMessage)
            return true
        }
        return false
    }
    
    // Dispatch the inputted data
    const new_channel = async () => {
        let error = checkError()
        if (error) return
        // Dispatch the inputted data
        onNewChannel({
            name: name
        })


        window.api.send("new-channel", {name, key: $groups.thisGroup.key})
    
        window.api.successMessage('Channel created')
        $swarm.newChannel = false
    }

    run(() => {
        if (name.length > 0) enableAdd = true
            else enableAdd = false
    }); 

    
    </script>
    
    <svelte:window onkeyup={preventDefault(enter)} />
    
    
    <div in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 100 }}" class="backdrop" onclick={self(() => $swarm.newChannel = false)}>
    
        <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="card">
                <div >
                <p>Channel name</p>
                <input placeholder="Name the channel" type="text" bind:value="{name}" />
                    <FillButton
                    text="{"Create"}"
                    disabled="{false}"
                    enabled="{enableAdd}"
                    on:click|once="{() => new_channel()}"
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
    
    input {
        box-sizing: border-box;
        background-color: transparent;
        border: 1px solid var(--input-border);
        border-radius: 8px;
        padding: 0 1rem;
        height: 35px;
        width: 100%;
        color: white;
        transition: 200ms ease-in-out;
    
        &:focus {
            outline: none;
            border: 1px solid rgba(255, 255, 255, 0.6);
        }
    }
    
    .avatar {
        width: 40px;
        height: 40px;
    }
    
    .key-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
    }
    
    p {
        font-size: 12px;
        color: white;
        font-family: 'Montserrat';
    }
    </style>
    