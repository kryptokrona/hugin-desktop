<script>
    import { fade } from 'svelte/transition'
    import { mediaSettings, videoSettings } from '$lib/stores/mediasettings'
    import Screenshare from '$lib/components/icons/Screenshare.svelte'
    import Button from '../buttons/Button.svelte'
    import { sleep } from '$lib/utils/utils'
    import { swarm } from '$lib/stores/user.js'
    let open
    let changed
    let add = false
    let screenSources = []

    $: screenSources = $mediaSettings.screenSources
    
    function pickSource(src) {
        $videoSettings.loading = true
        $videoSettings.screenshare = true
        $mediaSettings.screenId = src
        window.api.send('pick-screen-source', src)
        buttonGlow()
    }

   async function stop() {
        $videoSettings.loading = true
        $videoSettings.screenshare = false
        $videoSettings.active = false
        $videoSettings.myVideo = false
        $mediaSettings.screenId = "none"
        console.log("Stop called")
        if ($swarm.call.length === 0) {
            $swarm.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
            console.log("Mysream ended")
        }

        console.log("Mysream ")

        $swarm.call.forEach((a) => {
            a.myStream.getVideoTracks().forEach((track) => (track.enabled = !track.enabled))
        })
        await sleep(200)
        $videoSettings.loading = false
    }
    
    const buttonGlow = () => {
        changed = true
        let timer = setTimeout(function () {
            changed = false
            open = false
        }, 1000)
    }
    
    $: activeDevice = $mediaSettings.screenId
    
    </script>
    
    <div style="display: flex; flex-direction: column" on:click={() => open = !open}>
        
        <Screenshare/>
        {#if open}
            <div in:fade class="list layered-shadow">
                {#each screenSources as src}
                    <div on:click="{() => pickSource(src.id)}">
                        <h5 class:picked={activeDevice === src.id}>{src.name}</h5>
                        <img src={src.img} />
                    </div>
                {/each}
                    {#if $videoSettings.screenshare}
                        <Button text="Stop" disabled={false} on:click={() => stop()}/>
                    {/if}
            </div>
        {/if}
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
        bottom: 100px;
        left: 100px;
        width: 50%;
        gap: 0.5rem;
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        background-color: var(--card-background);
        border: 1pxsolidvar--card-border;
        border-radius: 0.4rem;
        z-index: 999;
        max-height: 400px;
        div {
            text-align: center;
            border-radius: 5px;
            padding: 10px;
            cursor: pointer;
            overflow: hidden;
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
    
    .picked {
        color: var(--success-color);
    }
    </style>
    