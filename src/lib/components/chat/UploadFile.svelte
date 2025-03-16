<script>
    import { onMount } from "svelte"
    import { upload, fileViewer } from '$lib/stores/files'
    import { fade } from "svelte/transition"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
    import Progress from "$lib/components/chat/Progress.svelte"
    import AudioPlayer from "./AudioPlayer.svelte"

    export let file
    export let group = false
    export let rtc = false
    
    let uploadDone = false
    let uploading = false

    let data
    let video = false
    let audio = false
    let image = false
    let saved = false

    const NOT_FOUND = "File not found"
    const OTHER = "File"

    onMount( async () => {
        if (file.saved) saved = true
        await loadFile(file)
    })

    $: {
        uploading = $upload.some(a => file.time === a.time)
        uploadDone = $upload.some(a => (uploading && a.progress === 100))
    }

    $: downloaders = $upload.filter(a => a.progress === 100 && file.fileName == a.fileName).length
    
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

<div class="file" class:group in:fade="{{ duration: 150 }}">
    {#if !uploadDone && !uploading && !saved}
        <p in:fade class="message">{file.fileName} </p>
    {:else if uploading && !uploadDone}
        <div in:fade>
            {#if !group}
            <Progress file={file} send={true}/>
            {/if}
        </div>
    <p in:fade class="message sending blink_me">Uploading...</p>
    {/if}
    
    {#if uploadDone || saved}
        {#if video}
            <VideoPlayer src={file}/>
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
        {:else if  data == (OTHER || NOT_FOUND || undefined)}
        <p class="message done" in:fade>Uploaded!</p>
        <p in:fade class="message">{file.fileName} </p>
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