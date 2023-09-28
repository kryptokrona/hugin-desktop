<script>
    import { fade } from 'svelte/transition'
    import { swarm } from '$lib/stores/user.js'
    
    let open
    let changed
    let audioInput = $swarm.devices.filter((a) => a.kind == 'audioinput')
    let audioOutput = $swarm.devices.filter((a) => a.kind == 'audiooutput')
    function pickSource(src) {
        console.log('pick', src)
        window.api.changeAudioSource(src.deviceId, true, input)
        buttonGlow()
    }
    
    const buttonGlow = () => {
        changed = true
        let timer = setTimeout(function () {
            changed = false
            open = false
        }, 1000)
    }

    let input = true
    
    </script>
    
    <div style="display: flex; flex-direction: column">

        {#if input}
            {#if open}
        <div in:fade class="list layered-shadow">
            <div>
                <h5 on:click={() => input = !input}>{input ? "Microphone" : "Speaker"}</h5>
            </div>
            {#each audioInput as src}
                <div on:click="{() => pickSource(src)}">
                    <h5>{src.label}</h5>
                </div>
            {/each}
        </div>
        {/if}
        {:else}
            {#if open}
                <div in:fade class="list layered-shadow">
                    <div>
                        <h5 on:click={() => input = !input}>{input ? "Microphone" : "Speaker"}</h5>
                    </div>
                    {#each audioOutput as src}
                        <div on:click="{() => pickSource(src)}">
                            <h5>{src.label}</h5>
                        </div>
                    {/each}
                </div>
            {/if}
            
        {/if}
            <div class="share" class:border_rgb="{changed}" class:open on:click="{() => (open = !open)}">
                <h5>Audio</h5>
            </div>
    </div>

    <style lang="scss">
    .share {
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        border-radius: 0.4rem;
        width: 120px;
        height: 38px;
        cursor: pointer;
        transition: 200ms;
    
        &:hover {
            background-color: var(--card-border);
        }
    }
    
    .open {
        border-color: var(--success-color);
    }
    
    .list {
        position: absolute;
        bottom: 85px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        width: 120px;
        padding: 5px;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        border-radius: 0.4rem;
        z-index: 999;
    
        div {
            text-align: center;
            border-radius: 5px;
            padding: 10px;
            cursor: pointer;
    
            &:hover {
                background-color: var(--card-border);
            }
        }
    }
    </style>
    