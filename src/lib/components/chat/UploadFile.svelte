<script>
    import { onMount } from "svelte"
    import { upload, fileViewer } from '$lib/stores/files'
    import { fade } from "svelte/transition"
    import VideoPlayer from "./VideoPlayer.svelte"
    export let file
    let uploadDone = false
    let image = ""
    let video = false
    let videoTypes = ['.mp4', '.webm', '.avi', '.webp', '.mkv', '.mov','.wmv', '.mkv']
    onMount( async () =>
    {   
        if (videoTypes.some(a => file.path.endsWith(a)))
        {
            console.log('Found video format')
            video = true
            return
        }
        loadFile(file)
    })

    $: {
        uploadDone = $upload.some(a => file.name === a.fileName && file.time === a.time && a.progress === 100)
    }

    const focusImage = (image) => {
        $fileViewer.focusImage = file.path
        $fileViewer.enhanceImage = true
    }

    async function loadFile(file) {
        let arr = await window.api.loadFile(file.path)
        if (arr === "File") return arr
        let blob = new Blob( [ arr ]);
        image = URL.createObjectURL( blob );
    }


</script>

<div class="file" in:fade="{{ duration: 150 }}">
    {#if !uploadDone}
        <p class="message">Sending file</p>
    {:else if uploadDone}
        <p class="message done" in:fade>File sent</p>
    {/if}
    {#if image === "File"}
        <p>{file.name}</p>
    {:else if image === "File not found"}
        <p class="message error">File not found</p>
    {:else}
        {#if video}
            <VideoPlayer src={file}/>
        {:else}
        <div on:click={focusImage}>
            <img
                in:fade="{{ duration: 150 }}"
                src="{image}"
                alt=""
            />
        </div>
        {/if}
    {/if}
</div>

<style lang="scss">

.file {
    background: none !important;
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
    }

    
.done {
    color: var(--success-color) !important;
}

.error {
    color: var(--warn-color) !important; 
}


</style>