<!-- @migration-task Error while migrating Svelte code: `<h3>` is invalid inside `<h3>` -->
<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import { localFiles, remoteFiles } from '$lib/stores/files.js'


const remove = async (file) => {
    console.log('Want to remove', file)
    window.api.removeLocalFile(file.fileName, file.chat, file.time)
}

const addFile = () => {
    console.log('ADD FILE')

}

</script>

<div in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 80 }}" class="backdrop" on:click|self>
    <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="card">

        <h3 in:fade|global>Local files</h3>
        {#each $localFiles as file (file.time)}
            <p in:fade|global>{file.fileName}</p>
            <p in:fade|global on:click={remove(file)}>Remove?</p>
        {/each}

        <h3>Remote files</h3>
        {#each $remoteFiles as remoteFile (remoteFile.time)}
            <p in:fade|global>{remoteFile.fileName}</p>
            <p in:fade|global on:click={download(remoteFile)}>Download?</p>
        {/each}

        <FillButton enabled="{true}" text="Add local file" on:click="{addFile}" />
    </div>
</div>

<style lang="scss">/*$$__STYLE_CONTENT__$$*/</style>
