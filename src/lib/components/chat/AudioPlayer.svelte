<script>
/** @type {{src: any, fileName?: string}} */
let { src, fileName = '' } = $props();

let audio = $state(null)
let playing = $state(false)
let currentTime = $state(0)
let duration = $state(0)
let volume = $state(1)

function togglePlay() {
    if (!audio) return
    if (playing) {
        audio.pause()
    } else {
        audio.play()
    }
}

function onPlay() { playing = true }
function onPause() { playing = false }

function onTimeUpdate() {
    currentTime = audio.currentTime
}

function onLoadedMetadata() {
    duration = audio.duration
}

function onEnded() {
    playing = false
    currentTime = 0
}

function seek(e) {
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audio.currentTime = ratio * duration
    currentTime = audio.currentTime
}

function onVolumeChange(e) {
    volume = parseFloat(e.currentTarget.value)
    if (audio) audio.volume = volume
}

function formatTime(s) {
    if (!isFinite(s) || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
}

const progress = $derived(duration ? (currentTime / duration) * 100 : 0)
</script>

<div class="player">
    {#if fileName}
        <p class="filename">{fileName}</p>
    {/if}
    <div class="controls">
        <button class="play-btn" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {#if playing}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <rect x="2" y="1" width="4" height="12" rx="1"/>
                    <rect x="8" y="1" width="4" height="12" rx="1"/>
                </svg>
            {:else}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <polygon points="2,1 13,7 2,13"/>
                </svg>
            {/if}
        </button>

        <div class="timeline" onclick={seek} role="slider" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} tabindex="0">
            <div class="track">
                <div class="fill" style="width: {progress}%"></div>
                <div class="thumb" style="left: {progress}%"></div>
            </div>
        </div>

        <span class="time">{formatTime(currentTime)}<span class="dur"> / {formatTime(duration)}</span></span>

        <div class="vol-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" opacity="0.6">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
            </svg>
            <input class="vol" type="range" min="0" max="1" step="0.05" value={volume} oninput={onVolumeChange} />
        </div>
    </div>

    <audio
        bind:this={audio}
        {src}
        onplay={onPlay}
        onpause={onPause}
        ontimeupdate={onTimeUpdate}
        onloadedmetadata={onLoadedMetadata}
        onended={onEnded}
    ></audio>
</div>

<style lang="scss">
.player {
    display: flex;
    flex-direction: column;
    gap: 5px;
    padding: 8px 10px;
    background: var(--card-background, rgba(255,255,255,0.04));
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    border-radius: 8px;
    min-width: 240px;
    max-width: 300px;
}

.filename {
    margin: 0 0 2px 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-color);
    opacity: 0.75;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.controls {
    display: flex;
    align-items: center;
    gap: 8px;
}

.play-btn {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: none;
    background: var(--success-color, #3fd782);
    color: #000;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: opacity 150ms ease, transform 100ms ease;

    &:hover {
        opacity: 0.85;
        transform: scale(1.08);
    }

    &:active {
        transform: scale(0.95);
    }
}

.timeline {
    flex: 1;
    cursor: pointer;
    padding: 8px 0;

    .track {
        position: relative;
        height: 4px;
        background: var(--input-background, rgba(255,255,255,0.1));
        border-radius: 2px;
        overflow: visible;
    }

    .fill {
        height: 100%;
        background: var(--success-color, #3fd782);
        border-radius: 2px;
        pointer-events: none;
    }

    .thumb {
        position: absolute;
        top: 50%;
        width: 10px;
        height: 10px;
        background: var(--success-color, #3fd782);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        pointer-events: none;
        transition: transform 100ms ease;
    }

    &:hover .thumb {
        transform: translate(-50%, -50%) scale(1.3);
    }
}

.time {
    flex-shrink: 0;
    font-family: 'Montserrat', sans-serif;
    font-size: 11px;
    font-weight: 500;
    color: var(--text-color);
    white-space: nowrap;

    .dur {
        opacity: 0.5;
    }
}

.vol-wrap {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 3px;
}

.vol {
    -webkit-appearance: none;
    appearance: none;
    width: 52px;
    height: 3px;
    background: var(--input-background, rgba(255,255,255,0.1));
    border-radius: 2px;
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: var(--text-color, #eee);
        cursor: pointer;
    }
}

audio {
    display: none;
}
</style>
