<script>
    import { download, upload } from '$lib/stores/files'
    export let file
    export let send
    console.log("This file!", file)
    console.log("$upload", $upload)
    let name = file.fileName
    $: loader = send ? $upload : $download
    $: progress = loader.find(a => a.fileName === name && file.time === a.time)
    
</script>
<div>
    <div
        style="display: flex; justify-content: space-between; align-items: center; text-overflow: ellipsis;"
    >
        <h5 style="word-break: break-all">{name}</h5>
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
    width: 95%;
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

    h5 {
        font-size: 12px;
        overflow: hidden;
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