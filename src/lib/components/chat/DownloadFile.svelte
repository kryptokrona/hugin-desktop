<script>
    import { onMount } from "svelte"
    import { download, fileViewer, remoteFiles } from '$lib/stores/files'
    import Button from "../buttons/Button.svelte"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
    import { fade } from "svelte/transition"
    import { groups, user } from '$lib/stores/user.js'
    import Progress from "$lib/components/chat/Progress.svelte"
    import { sleep } from "$lib/utils/utils"

    export let file
    export let group = false
    export let rtc = false
    
    let video = false
    let videoTypes = ['.mp4', '.webm', '.avi', '.mov','.wmv', '.mkv', '.mpeg']
    let downloadDone = false
    let downloading = false
    let thisFile
    let clicked = false
    let downloaders = []
    onMount(() => {
        if (group) return
        if (videoTypes.some(a => file.fileName.endsWith(a) && file.size < 50000000))
        {
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
        $fileViewer.size = file.size
    }

    async function loadFile(file) {
        await sleep(200)
        let arr = await window.api.loadFile(file.path, file.size)
        thisFile = arr
        if (arr === "File" || arr === "File not found") return arr
        let blob = new Blob( [ arr ]);
        let imageUrl = URL.createObjectURL( blob );
        thisFile = imageUrl
    }
    
    const downloadFile = (file) => {
        clicked = true
        if (group) {
            const thisFile = $remoteFiles.find(a => a.fileName === file.fileName && file.time === a.time)
            window.api.send('group-download', thisFile)
            return
        }
        window.api.download(file.fileName, $user.activeChat.chat)
    };


</script>

<div class="file" class:group in:fade="{{ duration: 150 }}">
    {#if !downloadDone && !downloading}
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
    <!-- {:else if downloadDone && group}
        <div style="cursor: pointer" in:fade on:click={() => window.api.openFolder()}>
            <Progress file={file} send={false}/>
        </div>
        <p class="message done">File downloaded!</p> -->
        
    {:else if downloadDone}
        {#if !video}
                {#if thisFile === "File"}
                <div in:fade>
                    <Progress file={file} send={false}/>
                </div>
                <p class="message done">File downloaded!</p>
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