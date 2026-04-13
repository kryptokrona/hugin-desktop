<script>
   import { run } from 'svelte/legacy';

    import { onMount, onDestroy } from "svelte"
    import { download, fileViewer, remoteFiles } from '$lib/stores/files'
    import Button from "../buttons/Button.svelte"
    import VideoPlayer from "$lib/components/chat/VideoPlayer.svelte"
    import { fade } from "svelte/transition"
    import { groups, user, files } from '$lib/stores/user.js'
    import { sleep } from "$lib/utils/utils"
    import AudioPlayer from "./AudioPlayer.svelte"
    import { t } from '$lib/utils/translation.js'

   /** @type {{file: any, group?: boolean, rtc?: boolean}} */
   let { file, group = false, rtc = false } = $props();

    let downloadDone = $state(false)
    let downloading = $state(false)
    let clicked = $state(false)

    let video = $state(false)
    let audio = $state(false)
    let image = $state(false)
    let saved = $state(false)
    let data = $state()

    // Fake progress: animates from 0 toward 95% while downloading, snaps to 100 on done
    let fakeProgress = $state(0)
    let fakeTimer = null

    let hasRemoteReady = $state(false)
    let waitingPeer = $state(false)

    const NOT_FOUND = t('fileNotFound') || "File not found"
    const OTHER = t('file') || "File"

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
        // Ease toward 95% — each tick adds a fraction of the remaining gap
        fakeTimer = setInterval(() => {
            fakeProgress = fakeProgress + (95 - fakeProgress) * 0.04
        }, 200)
    }

    function stopFakeProgress(done) {
        clearInterval(fakeTimer)
        fakeProgress = done ? 100 : 0
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

    const focusImage = () => {
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
        const thisFile = $remoteFiles.find(a => a.hash === file.hash || (a.fileName === file.fileName && parseInt(a.time) === parseInt(file.time)))
        if (!thisFile?.driveKey) return
        window.api.send('group-download', thisFile)
    };

    run(() => {
        const r = $remoteFiles.find(
            (a) =>
                a.hash === file.hash ||
                (a.fileName === file.fileName &&
                    parseInt(a.time) === parseInt(file.time))
        )
        hasRemoteReady = !!(r && r.driveKey)
    })

    run(() => {
        waitingPeer =
            !saved &&
            !downloading &&
            !downloadDone &&
            !!(file?.fileName) &&
            !hasRemoteReady
    })

    $effect(() => {
        if (!waitingPeer || downloading) return
        startFakeProgress()
        return () => {
            clearInterval(fakeTimer)
            fakeTimer = null
        }
    })

    run(() => {
        const wasDownloading = downloading
        downloading = $download.some(a => file.hash === a.hash || file.time === a.time)
        downloadDone = downloading && $download.some(a => (file.hash === a.hash || file.time === a.time) && a.progress === 100)

        if (downloading && !wasDownloading) startFakeProgress()
        if (downloadDone) stopFakeProgress(true)
        if (!downloading && wasDownloading && !downloadDone) stopFakeProgress(false)
    });

    run(() => {
      if (downloadDone) {
           awaitLoad(file)
       }
   });

    run(() => {
        const found = $files.find(a => a.time === file.time || a.hash === file.hash)
        if (found && !saved) {
            saved = true
            awaitLoad({ ...file, path: 'storage' })
        }
    });
</script>

<div class="file" class:group in:fade|global="{{ duration: 150 }}">
    {#if waitingPeer}
        <p class="message loading blink_me" in:fade|global>{t('syncingFileFromPeers') || 'Syncing file from peers…'}</p>
        <p class="message">{file.fileName}</p>
        <div class="progress-wrap" in:fade|global>
            <div class="progress-bar" style="width: {fakeProgress}%"></div>
        </div>
    {:else if !downloadDone && !downloading && !saved}
        {#if !clicked}
        <div class="cursor-pointer" onclick={() => clicked = true}>
            <Button on:click|once={() => downloadFile(file)} disabled={false} text={file.fileName || t('downloadFile') || 'Download file'}/>
        </div>
        {:else}
        <p class="message loading blink_me" in:fade|global>{t('startDownloading') || 'Start downloading...'}</p>
        {/if}
    {:else if downloading && !downloadDone}
        <p class="message downloading blink_me" in:fade|global>{t('downloading') || 'Downloading'} {file.fileName}</p>
        <div class="progress-wrap" in:fade|global>
            <div class="progress-bar" style="width: {fakeProgress}%"></div>
        </div>
    {:else if !downloading && !downloadDone && !saved && data === (OTHER || NOT_FOUND)}
        <p class="message" in:fade|global>{file.fileName}</p>
    {/if}

    {#if downloadDone || saved}
        {#if !video}
            {#if data === OTHER}
                <p class="message done">{t('fileDownloaded') || 'File downloaded!'}</p>
                <p class="message">{file.fileName}</p>
            {:else if data === NOT_FOUND}
                <p class="message error">{NOT_FOUND}</p>
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
            {/if}
        {:else if video}
            <VideoPlayer src={file} />
        {/if}
    {/if}
</div>

<style lang="scss">

.file {
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

.error {
    color: var(--warn-color) !important;
}

.downloading {
    color: var(--alert-color) !important;
    font-size: 13px;
    margin-bottom: 4px;
}

.loading {
    color: var(--alert-color) !important;
}

.group {
    margin-left: 30px;
}

</style>
