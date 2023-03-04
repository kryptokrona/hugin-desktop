<script>
    import { onMount } from "svelte"
    import { download, fileViewer } from '$lib/stores/files'
    import Button from "../buttons/Button.svelte"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
    import { fade } from "svelte/transition"
    import { user } from '$lib/stores/user.js'
    import Progress from "$lib/components/chat/Progress.svelte"

    export let file

    let video = false
    let videoTypes = ['.mp4', '.webm', '.avi', '.webp', '.mov','.wmv', '.mkv', '.mpeg']
    let downloadDone = false
    let downloading = false
    let thisFile
    let clicked = false

    onMount(() => {   
        if (videoTypes.some(a => file.fileName.endsWith(a)))
        {
            console.log('Found video format')
            video = true
            return
        }
    })

   $: {
        downloading = $download.some(a => file.fileName === a.fileName && file.time === a.time)
        downloadDone = $download.some(a => downloading && a.progress === 100)
    }

    $: if (downloadDone) {
         if (!video) loadFile(file)
    }
    
    const focusImage = (image) => {
        $fileViewer.focusImage = file.path
        $fileViewer.enhanceImage = true
    }

    async function loadFile(file) {
        let arr = await window.api.loadFile(file.path)
        if (arr === "File" || arr === "File not found") return arr
        let blob = new Blob( [ arr ]);
        let imageUrl = URL.createObjectURL( blob );
        thisFile = imageUrl
    }
    
    const downloadFile = (file) => {
        clicked = true
        window.api.download(file.fileName, $user.activeChat.chat)
    };


</script>

<div class="file" in:fade="{{ duration: 150 }}">
    {#if !downloadDone && !downloading}
         {#if !clicked}
        <Button on:click={downloadFile(file)} disabled={false} text="Download file {file.fileName}"/>
        {:else}
        <p class="message finish" in:fade>Connecting</p>
        {/if}
    {:else if downloading && !downloadDone}
        <p class="message" in:fade>Downloading</p>
        <div in:fade>
        <Progress file={file} send={false}/>
        </div>
    {:else if downloadDone}
        {#if !video}
                {#if thisFile === "File"}
                <p>{file.name}</p>
                {:else if thisFile === "File not found"}
                <p class="message error">File not found</p>
                {:else}
                <div style="-webkit-user-drag: none;" on:click={focusImage}>
                    <img
                        in:fade="{{ duration: 150 }}"
                        src="{thisFile}"
                        alt=""
                    />
                </div>
                {/if}
        {:else if video}
            <VideoPlayer src={file} />
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

.finish {
    color: var(--success-color);
}
</style>