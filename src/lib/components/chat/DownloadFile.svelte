<script>
    import { onMount } from "svelte"
    import { download, fileViewer } from '$lib/stores/files'
    import Button from "../buttons/Button.svelte"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
    import { fade } from "svelte/transition"
    import { user } from '$lib/stores/user.js'

    export let file
    let image = ""
    let video = false
    let videoTypes = ['.mp4', '.webm', '.avi', '.webp', '.mov','.wmv', '.mkv']
    let downloadDone = false
    let downloading = false

    onMount(() =>
    {   
        if (videoTypes.some(a => file.fileName.endsWith(a)))
        {
            console.log('Found video format')
            video = true
            return
        }
    })

   $: {
        downloading = $download.some(a => file.fileName === a.fileName && file.time === a.time)
        downloadDone = $download.some(a => file.fileName === a.fileName && file.time === a.time && a.progress === 100)
    }

    const focusImage = (image) => {
        $fileViewer.focusImage = file.path
        $fileViewer.enhanceImage = true
    }

    async function loadFile(file) {
        file = $download.find(a => a.fileName === file.fileName && a.time === file.time)
        let arr = await window.api.loadFile(file.path)
        if (arr === "File") return arr
        let blob = new Blob( [ arr ]);
        let imageUrl = URL.createObjectURL( blob );
        return imageUrl
    }

    
    const downloadFile = (file) => {
        window.api.download(file.fileName, $user.activeChat.chat)
    };


</script>

<div class="file" in:fade="{{ duration: 150 }}">
    {#if !downloadDone && !downloading}
        <Button on:click={downloadFile(file)} disabled={false} text="Download file {file.fileName}"/>
    {:else if !downloadDone && downloading}
        <p class="message">Downloading file</p>
    {:else if downloadDone}
        <p class="message done" in:fade>File downloaded</p>
        {#if !video}
            {#await loadFile(file, true) then thisFile}
                {#if thisFile === "File"}
                <p>{file.name}</p>
                {:else if thisFile === "File not found"}
                <p class="message error">File not found</p>
                {:else}
                <div on:click={focusImage}>
                    <img
                        in:fade="{{ duration: 150 }}"
                        src="{thisFile}"
                        alt=""
                    />
                </div>
                {/if}
            {/await}
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

</style>