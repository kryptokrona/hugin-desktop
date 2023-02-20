<script>
    import { download, upload } from '$lib/stores/files'
    export let file
    export let send = false
    let progress
    let name
    
    $: if (!send) progress = $download.find(a => a.fileName === file.fileName && a.chat === file.chat && a.time === file.time)
    
    $: if (!send) name = file.fileName

    $: if (send) progress = $upload.find(a => a.fileName === file.file && a.chat === file.chat && file.time === a.time)
    
    $: if (send) name = file.file
    
</script>
<div>
    <div
        style="display: flex; justify-content: space-between; align-items: center;"
    >
        <h5>{name}</h5>
    </div>
    <div class="goal">
      
        <div
            class="progress"
            class:done="{progress.progress === 100}"
            style="width: {progress.progress}%;"
        ></div>
    </div>
</div>

<style lang="scss">
    

.goal {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 5px;
    background-color: var(--input-background);
    border: 1px solid var(--input-border);
    border-radius: 0.4rem;
    margin: 5px 0;

    h4 {
        color: white;
        position: absolute;
        align-self: center;
        z-index: 9999;
    }
}

.progress {
    background-color: var(--border-color);
    height: 5px;
    margin-right: auto;
    border-radius: 0.4rem;
    transition: 200ms ease-in-out;
}

.done {
    background-color: var(--success-color);
}

</style>