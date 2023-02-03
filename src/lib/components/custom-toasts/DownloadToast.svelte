<script>
import { download } from '$lib/stores/files'
import { sleep } from '$lib/utils/utils'
import toast_ from 'svelte-french-toast';

export let toast;
$: thisFile = $download.find(a => a.fileName === toast.file && a.chat === toast.chat && a.time === toast.time)

//File sent, add more effects?
$: if (thisFile.progress === 100) {
    removeToast()
}
//TODO Make text red if error?
$: if (thisFile.error === true) {
    removeToast()
}

async function removeToast() {
    await sleep(15000)
    toast_.dismiss(toast.id)
}
</script>

<span>
    {#if thisFile.progress === 100}
    <p class="finish">DOWNLOADED</p>
    {:else}
    DOWNLOADING
    {/if}
    <div on:click={() => toast_.dismiss(toast.id)}>
        <div
            style="display: flex; justify-content: space-between; align-items: center; padding: 0 5px"
        >
            <h5 style="margin-bottom: 10px">{thisFile.fileName}</h5>
        </div>
        <div class="goal">
            <h4>
                {thisFile.progress === 100 ? thisFile.progress.toFixed(0) : thisFile.progress.toFixed(2)}%
            </h4>
            <div
                class="progress"
                class:done="{thisFile.progress === 100}"
                style="width: {thisFile.progress}%;"
            ></div>
        </div>
    </div>
</span>

<style lang="scss">
.goal {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 40px;
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
    height: 40px;
    margin-right: auto;
    border-radius: 0.4rem;
    transition: 200ms ease-in-out;
}

.done {
    background-color: var(--success-color);
}

.finish {
    color: var(--success-color);
}

</style>