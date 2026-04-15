<script>
import { onMount, onDestroy } from 'svelte';

/** @type {{src: any}} */
let { src } = $props();

const NOT_FOUND = 'File not found';
const OTHER = 'File';

let blobUrl = $state('');
let videoEl = $state(null);
let playing = $state(false);
let currentTime = $state(0);
let duration = $state(0);
let volume = $state(1);
let muted = $state(false);
let fullscreen = $state(false);
let showControls = $state(true);
let hideTimer = null;

onMount(async () => {
    let load = [];
    if (src.path === 'storage') {
        load = await window.api.loadStoredFile(src.hash, src.topic);
    } else {
        load = await window.api.loadFile(src.path, src.size);
    }
    const [arr] = load;
    if (!arr || arr === OTHER || arr === NOT_FOUND) return;
    const blob = new Blob([arr]);
    blobUrl = URL.createObjectURL(blob);
});

onDestroy(() => {
    clearTimeout(hideTimer);
    if (blobUrl) URL.revokeObjectURL(blobUrl);
});

function togglePlay() {
    if (!videoEl) return;
    if (videoEl.paused) videoEl.play();
    else videoEl.pause();
}

function handleTimeUpdate() {
    if (!videoEl) return;
    currentTime = videoEl.currentTime;
}

function handleLoaded() {
    if (!videoEl) return;
    duration = videoEl.duration;
}

function seek(e) {
    if (!videoEl || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoEl.currentTime = pct * duration;
}

function toggleMute() {
    muted = !muted;
    if (videoEl) videoEl.muted = muted;
}

function setVolume(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    volume = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    if (videoEl) videoEl.volume = volume;
    if (volume > 0) muted = false;
}

function toggleFullscreen() {
    const wrap = videoEl?.closest('.video-player');
    if (!wrap) return;
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        wrap.requestFullscreen();
    }
}

function handleFullscreenChange() {
    fullscreen = !!document.fullscreenElement;
}

function formatTime(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
}

function onMouseMove() {
    showControls = true;
    clearTimeout(hideTimer);
    if (playing) {
        hideTimer = setTimeout(() => { showControls = false; }, 2500);
    }
}

function onMouseLeave() {
    if (playing) {
        hideTimer = setTimeout(() => { showControls = false; }, 1000);
    }
}
</script>

<svelte:document onFullscreenChange={handleFullscreenChange} />

{#if blobUrl}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="video-player"
        class:fullscreen
        onmousemove={onMouseMove}
        onmouseleave={onMouseLeave}
    >
        <!-- svelte-ignore a11y_media_has_caption -->
        <video
            bind:this={videoEl}
            src={blobUrl}
            preload="metadata"
            playsinline
            onclick={togglePlay}
            ontimeupdate={handleTimeUpdate}
            onloadedmetadata={handleLoaded}
            onplay={() => playing = true}
            onpause={() => playing = false}
            onended={() => { playing = false; showControls = true; }}
        ></video>

        {#if !playing && showControls}
            <button class="center-play cursor-pointer" onclick={togglePlay} aria-label="Play">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
            </button>
        {/if}

        <div class="controls" class:visible={showControls}>
            <button class="ctrl-btn cursor-pointer" onclick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
                {#if playing}
                    <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                {:else}
                    <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg>
                {/if}
            </button>

            <span class="time">{formatTime(currentTime)}</span>

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="progress cursor-pointer" onclick={seek}>
                <div class="progress-bg"></div>
                <div class="progress-fill" style="width: {duration ? (currentTime / duration) * 100 : 0}%"></div>
            </div>

            <span class="time">{formatTime(duration)}</span>

            <button class="ctrl-btn cursor-pointer" onclick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
                {#if muted || volume === 0}
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                {:else}
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                {/if}
            </button>

            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_static_element_interactions -->
            <div class="volume cursor-pointer" onclick={setVolume}>
                <div class="volume-bg"></div>
                <div class="volume-fill" style="width: {muted ? 0 : volume * 100}%"></div>
            </div>

            <button class="ctrl-btn cursor-pointer" onclick={toggleFullscreen} aria-label="Fullscreen">
                {#if fullscreen}
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
                {:else}
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
                {/if}
            </button>
        </div>
    </div>
{/if}

<style>
.video-player {
    position: relative;
    width: 100%;
    max-width: 400px;
    border-radius: 8px;
    overflow: hidden;
    background: var(--card-background, #111);
    line-height: 0;
}

.video-player.fullscreen {
    max-width: 100%;
    border-radius: 0;
}

video {
    width: 100%;
    display: block;
    cursor: pointer;
}

.center-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    background: rgba(0, 0, 0, 0.55);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 200ms, transform 200ms;
}

.center-play svg {
    width: 28px;
    height: 28px;
    margin-left: 3px;
}

.center-play:hover {
    background: rgba(0, 0, 0, 0.75);
    transform: translate(-50%, -50%) scale(1.08);
}

.controls {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.75));
    opacity: 0;
    transition: opacity 250ms;
}

.controls.visible {
    opacity: 1;
}

.ctrl-btn {
    background: none;
    border: none;
    color: white;
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.ctrl-btn svg {
    width: 18px;
    height: 18px;
}

.ctrl-btn:hover {
    color: var(--success-color, #3fd782);
}

.time {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.85);
    font-family: 'Montserrat', sans-serif;
    flex-shrink: 0;
    line-height: 1;
    min-width: 32px;
    text-align: center;
}

.progress {
    flex: 1;
    height: 14px;
    display: flex;
    align-items: center;
    position: relative;
}

.progress-bg, .progress-fill {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 4px;
    border-radius: 2px;
}

.progress-bg {
    width: 100%;
    background: rgba(255, 255, 255, 0.25);
}

.progress-fill {
    background: var(--success-color, #3fd782);
    transition: width 100ms linear;
}

.progress:hover .progress-bg,
.progress:hover .progress-fill {
    height: 6px;
}

.volume {
    width: 50px;
    height: 14px;
    display: flex;
    align-items: center;
    position: relative;
    flex-shrink: 0;
}

.volume-bg, .volume-fill {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    height: 3px;
    border-radius: 2px;
}

.volume-bg {
    width: 100%;
    background: rgba(255, 255, 255, 0.25);
}

.volume-fill {
    background: white;
}

.cursor-pointer {
    cursor: pointer;
}
</style>
