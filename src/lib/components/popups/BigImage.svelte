<script>
import { fileViewer } from '$lib/stores/files'
import {onMount} from 'svelte'
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'

let image
let path = $fileViewer.focusImage

onMount(() => {
    getImage(path)
})

const close = () => {
    $fileViewer.enhanceImage = false
    $fileViewer.focusImage = ""
    $fileViewer.hash = ""
    $fileViewer.topic = ""
}

async function getImage(path) {
    let arr
    if ($fileViewer.hash.length === 64) {
       arr = await window.api.loadStoredFile($fileViewer.hash, $fileViewer.topic)
    } else arr = await window.api.loadFile(path, $fileViewer.size)
    let blob = new Blob( [ arr ] );
    image = URL.createObjectURL( blob );
}

</script>

<div
    on:click|self="{close}"
    in:fade="{{ duration: 100 }}"
    out:fade="{{ duration: 100 }}"
    class="backdrop"
>
    <div on:click="{close}" in:fly="{{ y: 20 }}" out:fly="{{ y: -50 }}" class="field">
        <img
            in:fade="{{ duration: 150 }}"
            src="{image}"
            alt=""
        />
    </div>
</div>

<style lang="scss">
.field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    padding: 0 10px;
    border-radius: 0.4rem;

    .btn {
        color: var(--text-color);
        height: 100%;
        border-left: 1px solid var(--card-border);
        cursor: pointer;

        &:hover {
            background-color: var(--card-border);
        }
    }
}

img {
    max-width: 600px;
}

.backdrop {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--backdrop-color);
    backdrop-filter: blur(8px);
    z-index: 103;
    border-radius: 15px;
}
</style>
