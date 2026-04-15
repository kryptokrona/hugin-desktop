<script>
    import { self } from 'svelte/legacy';

import { fileViewer } from '$lib/stores/files'
import {onMount} from 'svelte'
import { fade, fly } from 'svelte/transition'

let image = $state()
let path = $fileViewer.focusImage
let saving = $state(false)
let saved = $state(false)

let canSave = $derived($fileViewer.hash.length === 64)

onMount(() => {
    getImage(path)
})

const close = () => {
    $fileViewer.enhanceImage = false
    $fileViewer.focusImage = ""
    $fileViewer.hash = ""
    $fileViewer.topic = ""
    $fileViewer.fileName = ""
}

async function getImage(path) {
    let load = []
    if ($fileViewer.hash.length === 64) {
      load = await window.api.loadStoredFile($fileViewer.hash, $fileViewer.topic)
    } else {
      load = await window.api.loadFile(path, $fileViewer.size)
    }
    const [arr] = load
    let blob = new Blob( [ arr ] );
    image = URL.createObjectURL( blob );
}

async function saveToDownloads(e) {
    e.stopPropagation()
    if (saving || saved) return
    saving = true
    try {
        await window.api.saveToDownloads({ hash: $fileViewer.hash, fileName: $fileViewer.fileName, topic: $fileViewer.topic })
        saved = true
    } catch (err) {
        console.log('BigImage saveToDownloads error:', err)
    } finally {
        saving = false
    }
}

</script>

<div
    onclick={self(close)}
    in:fade|global="{{ duration: 100 }}"
    out:fade|global="{{ duration: 100 }}"
    class="backdrop"
>
    <div in:fly|global="{{ y: 20 }}" out:fly|global="{{ y: -50 }}" class="field">
        <img
            onclick={close}
            in:fade|global="{{ duration: 150 }}"
            src="{image}"
            alt=""
        />
        {#if canSave}
            <button class="save-btn" onclick={saveToDownloads} disabled={saving || saved}>
                {#if saved}
                    ✓
                {:else if saving}
                    …
                {:else}
                    💾
                {/if}
            </button>
        {/if}
    </div>
</div>

<style lang="scss">
.field {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: absolute;
    padding: 0 10px;
    border-radius: 0.4rem;
    gap: 10px;
}

img {
    max-width: 600px;
    max-height: 90vh;
    cursor: pointer;
}

.save-btn {
    background: var(--button-background);
    border: 1px solid var(--border-color);
    border-radius: 5px;
    color: var(--title-color);
    font-size: 18px;
    padding: 6px 14px;
    cursor: pointer;
    transition: 200ms ease-in-out;

    &:hover:not(:disabled) {
        border-color: var(--success-color);
        opacity: 0.85;
    }

    &:disabled {
        cursor: default;
        opacity: 0.6;
    }
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
