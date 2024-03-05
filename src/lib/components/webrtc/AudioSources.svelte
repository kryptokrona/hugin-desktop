<script>
    import { fade } from 'svelte/transition'
    import { audioSettings, mediaSettings } from '$lib/stores/mediasettings.js'
    export let conference = false
    let open
    let changed
    let audioInput = $mediaSettings.devices.filter((a) => a.kind == 'audioinput')
    let audioOutput = $mediaSettings.devices.filter((a) => a.kind == 'audiooutput')

    function pickSource(src, input) {
        console.log('pick', src)
        console.log("Confere", conference)
        window.api.changeAudioSource(src.deviceId, conference, input)
        buttonGlow()
    }
    
    const buttonGlow = () => {
        changed = true
        let timer = setTimeout(function () {
            changed = false
            open = false
        }, 1000)
    }

    let pickedInput
    let pickedOutput

    $: {
        pickedInput = $audioSettings.audioInput
        pickedOutput = $audioSettings.audioOutput
    }

    let input = true
    
    </script>
    
<div style="display: flex; flex-direction: column">


    {#if open}
        <div in:fade class="list layered-shadow">

            <div>
                <h4>Microphone</h4>
            </div>

                {#each audioInput as src}
                    <div on:click="{() => pickSource(src, true)}">
                        <h5 class:picked={pickedInput === src.deviceId}>{src.label}</h5>
                    </div>
                {/each}

            <div>
                <h4>Speakers</h4>
            </div>
            
                {#each audioOutput as src}
                    <div on:click="{() => pickSource(src, false)}">
                        <h5 class:picked={pickedOutput === src.deviceId}>{src.label}</h5>
                    </div>
                {/each}
        </div>
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

    .picked {
        color: var(--success-color);
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
        width: 300px;
        padding: 5px;
        background-color: var(--card-background);
        border: 1px solid var(--card-border);
        border-radius: 0.4rem;
        z-index: 999;
        max-height: 500px;
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

    .list {
        --scrollbarBG: transparent;
        --thumbBG: #3337;
        overflow: auto;
        scrollbar-width: thin;
        scrollbar-color: var(--thumbBG) var(--scrollbarBG);
    }

    .list::-webkit-scrollbar {
        width: 8px;
    }

    .list::-webkit-scrollbar-track {
        background: var(--scrollbarBG);
    }

    .list::-webkit-scrollbar-thumb {
        background-color: var(--thumbBG);
        border-radius: 3px;
        border: 3px solid var(--scrollbarBG);
    }
    </style>
    