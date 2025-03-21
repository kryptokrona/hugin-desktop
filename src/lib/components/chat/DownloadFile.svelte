<script>
    import { onMount } from "svelte"
    import { download, fileViewer, remoteFiles } from '$lib/stores/files'
    import Button from "../buttons/Button.svelte"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
    import { fade } from "svelte/transition"
    import { groups, user } from '$lib/stores/user.js'
    import Progress from "$lib/components/chat/Progress.svelte"
    import { sleep } from "$lib/utils/utils"
    import AudioPlayer from "./AudioPlayer.svelte"

    export let file
    export let group = false
    export let rtc = false

    
    let downloadDone = false
    let downloading = false
    let clicked = false
    let downloaders = []
    
    let video = false
    let audio = false
    let image = false
    let saved = false
    let data

    const NOT_FOUND = "File not found"
    const OTHER = "File"

    onMount(async () => {
        if (file.saved) saved = true
        await loadFile(file)
    })

   $: {
        downloading = $download.some(a => file.time === a.time)
        downloadDone = $download.some(a => (downloading && a.progress === 100))
    }
   

    $: if (downloadDone) {
        awaitLoad(file)
    }

    async function awaitLoad(file) {
        await sleep(100)
        await loadFile(file)
    }

    const checkType = (type) => {
        switch (type){
            case 'audio': audio = true
            break;
            case 'video': video = true
            break;
            case 'image': image = true
        }
    }
    
    const focusImage = (image) => {
        $fileViewer.focusImage = file.path
        $fileViewer.enhanceImage = true
        $fileViewer.size = file.size
        $fileViewer.hash = file.hash
        $fileViewer.topic = file.topic
    }

    async function loadFile(file) {
        let load = []
        if (file.path === "storage") {
            load = await window.api.loadStoredFile(file.hash, file.topic)
        } else {
            load = await window.api.loadFile(file.path, file.size)
        }
        const [arr, type] = load
        if (!found(arr)) return
        let blob = new Blob( [ arr ]);
        data = URL.createObjectURL( blob );
        checkType(type)
    }

    const found = (file) => {
        switch (file) {
            case OTHER: 
            data = OTHER
            return false
            case NOT_FOUND: 
            data = NOT_FOUND
            return false
        }
        return true
    }
    
    const downloadFile = (file) => {
        clicked = true
        const thisFile = $remoteFiles.find(a => a.fileName === file.fileName && file.time === a.time)
        window.api.send('group-download', thisFile)
    };


</script>

<div class="file" class:group in:fade="{{ duration: 150 }}">
    {#if !downloadDone && !downloading && !saved}
         {#if !clicked}
        <p class="message" in:fade>{file.fileName}</p>
        <Button on:click|once={downloadFile(file)} disabled={false} text="Download file"/>
        {:else}
        <p class="message loading blink_me" in:fade>Connecting</p>
        {/if}
    {:else if downloading && !downloadDone}
        <p class="message done blink_me" in:fade>Downloading</p>
        <div in:fade>
            <Progress file={file} send={false}/>
        </div>
    {:else if !downloading && !downloadDone && !saved && data === (OTHER || NOT_FOUND)} 
        <p class="message" in:fade>{file.fileName}</p>

    {/if}
        
    {#if downloadDone || saved}
        {#if !video}
            {#if data === (OTHER || NOT_FOUND)}
                {#if !saved}
                <div in:fade>
                    <Progress file={file} send={false}/>
                </div>
                {/if}
            <p class="message done">File downloaded!</p>
            <p class="message">{file.fileName}</p>
            {:else if data === NOT_FOUND}
            <p class="message error">{NOT_FOUND}</p>
            {:else if image}
            <div style="-webkit-user-drag: none;" on:click={focusImage}>
                <img
                    in:fade="{{ duration: 150 }}"
                    src="{data}"
                    alt=""
                />
            </div>
            {:else if audio}
                <AudioPlayer src={data} />
            {/if}
        {:else if video}
            <VideoPlayer src={file} />
        {/if}
    {/if}
</div>

<style lang="scss">

.file {
    background: none !important;
    background: none !important;
    max-width: 300px;
    display: block;
    img {
        max-width: 70%;
    }
}

.message {
    margin: 0;
    word-break: break-word;
    font-family: 'Montserrat', sans-serif;
    font-weight: 400;
    color: var(--text-color);
    font-size: 15px;
    user-select: all;
    margin-bottom: 5px;
}

    
.done {
    color: var(--success-color) !important;
}

.error {
    color: var(--warn-color) !important; 
}

.finish {
    color: var(--success-color);
}

.loading {
    color: var(--alert-color)  !important;
}

.group {
    margin-left: 30px;
}

</style>