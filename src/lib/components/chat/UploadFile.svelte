<script>
    import { run } from 'svelte/legacy';

    import { onMount, onDestroy } from "svelte"
    import { upload, fileViewer, localFiles } from '$lib/stores/files'
    import { fade } from "svelte/transition"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
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

    // Fake progress animation
    let fakeProgress = $state(0)
    let fakeTimer = null

    const NOT_FOUND = "File not found"
    const OTHER = "File"

    onMount(async () => {
        if (file.saved) saved = true
        await loadFile(file)
    })

    onDestroy(() => {
        clearInterval(fakeTimer)
    })

    function startFakeProgress() {
        fakeProgress = 0
        clearInterval(fakeTimer)
        fakeTimer = setInterval(() => {
            fakeProgress = fakeProgress + (95 - fakeProgress) * 0.04
        }, 200)
    }

    function stopFakeProgress(done) {
        clearInterval(fakeTimer)
        fakeProgress = done ? 100 : 0
    }

    run(() => {
        const wasUploading = uploading
        shared = $localFiles.some(a => file.time === a.time)
        uploading = $upload.some(a => file.time === a.time || file.hash === a.hash)
        uploadDone = uploading && $upload.some(a => (file.time === a.time || file.hash === a.hash) && a.progress === 100)

        if (uploading && !wasUploading) startFakeProgress()
        if (uploadDone) stopFakeProgress(true)
        if (!uploading && wasUploading && !uploadDone) stopFakeProgress(false)
    });

    const checkType = (type) => {
        switch (type){
            case 'audio': audio = true
            break;
            case 'video': video = true
            break;
            case 'image': image = true
        }
    }

    const focusImage = () => {
        $fileViewer.focusImage = file.path
        $fileViewer.enhanceImage = true
        $fileViewer.size = file.size
    }

    async function loadFile(file) {
        let [arr, type] = await window.api.loadFile(file.path, file.size)
        if (!found(arr)) return
        let blob = new Blob([arr]);
        checkType(type)
        data = URL.createObjectURL(blob);
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

    {#if uploading && !uploadDone}
        <p class="message uploading blink_me" in:fade|global>Uploading {file.fileName}</p>
        <div class="progress-wrap" in:fade|global>
            <div class="progress-bar" style="width: {fakeProgress}%"></div>
        </div>
    {/if}

    {#if uploadDone || (saved && !shared) || (image || video || audio)}
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
        {:else if uploadDone || (saved && !shared)}
            <p class="message done" in:fade|global>Uploaded!</p>
            <p in:fade|global class="message">{file.fileName}</p>
        {:else if data === OTHER && !shared}
            <p in:fade|global class="message">{file.fileName}</p>
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

.uploading {
    color: var(--alert-color) !important;
    font-size: 13px;
    margin-bottom: 4px;
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

.progress-wrap {
    width: 95%;
    height: 5px;
    background-color: var(--input-background);
    border: 1px solid var(--input-border);
    border-radius: 0.4rem;
    margin: 5px 0;
    overflow: hidden;
}

.progress-bar {
    height: 100%;
    background-color: var(--success-color);
    border-radius: 0.4rem;
    transition: width 200ms ease-in-out;
}

.done {
    color: var(--success-color) !important;
}

.group {
    margin-left: 30px;
}

</style>
