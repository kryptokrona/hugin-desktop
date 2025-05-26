<script>
    import { run } from 'svelte/legacy';

    import { onMount } from "svelte"
    import { upload, fileViewer, localFiles } from '$lib/stores/files'
    import { fade } from "svelte/transition"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
    import Progress from "$lib/components/chat/Progress.svelte"
    import AudioPlayer from "./AudioPlayer.svelte"

    /** @type {{file: any, group?: boolean, rtc?: boolean}} */
    let { file, group = false, rtc = false } = $props();
    
    let uploadDone = $state(false)
    let uploading = $state(false)

    let data = $state()
    let video = $state(false)
    let audio = $state(false)
    let image = $state(false)
    let saved = $state(false)
    let shared = $state(false)

    const NOT_FOUND = "File not found"
    const OTHER = "File"

    onMount( async () => {
        if (file.saved) saved = true
        await loadFile(file)
    })

    run(() => {
        shared = $localFiles.some(a => file.time === a.time)
        uploading = $upload.some(a => file.time === a.time)
        uploadDone = $upload.some(a => (uploading && a.progress === 100))
    });

    let downloaders = $derived($upload.filter(a => a.progress === 100 && file.fileName == a.fileName).length)
    
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
    }

    async function loadFile(file) {
        let [arr, type] = await window.api.loadFile(file.path, file.size)
        if (!found(arr)) return
        let blob = new Blob( [ arr ]);
        checkType(type)
        data = URL.createObjectURL( blob );
        if (audio) data = new Audio(data);
        return type
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


</script>

<div class="file" class:group in:fade|global="{{ duration: 150 }}">

     {#if uploading || uploadDone}
        <div in:fade|global>
            <Progress file={file} send={true}/>
        </div>
    {/if}

    {#if ((!uploadDone && !uploading && !saved) || (shared && !uploadDone)) && (!image &&  !video && !audio)}
        <p in:fade|global class="message sending blink_me">Uploading...</p>
        <p in:fade|global class="message">{file.fileName} </p>
    {/if}
    
    {#if uploadDone || (saved && !shared) || (image ||  video || audio)}
        {#if video}
            <VideoPlayer src={file}/>
        {:else if image}
            <div style="-webkit-user-drag: none;" onclick={focusImage}>
                <img
                    in:fade|global="{{ duration: 150 }}"
                    src="{data}"
                    alt=""
                />
            </div>
        {:else if audio}
            <AudioPlayer src={data} />
        {:else if  uploadDone || (saved && !shared)}
        <p class="message done" in:fade|global>Uploaded!</p>
        <p in:fade|global class="message">{file.fileName} </p>
        
         {:else if data == (OTHER || NOT_FOUND) && !shared}
         <p in:fade|global class="message">{file.fileName} </p>
        {/if}
        
    {/if}
</div>

<style lang="scss">

.file {
    background: none !important;
    max-width: 300px;
    img {
        max-width: 70%;
    }
}

.sending {
    color: var(--alert-color) !important;
    font-size: 12px;
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

.count {
    font-family: "Montserrat";
    font-size: 12px;
    font-weight: 800;
    display: flex;
    color: black;
    background: magenta;
    width: 15px;
    justify-content: center;
    background: #f9f8f8;
    border-radius: 15%;
    margin-top: 5px;
}

    
.done {
    color: var(--success-color) !important;
}

.error {
    color: var(--warn-color) !important; 
}

.group {
    margin-left: 30px;
}


</style>