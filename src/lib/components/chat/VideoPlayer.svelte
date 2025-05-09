<script>
	import { preventDefault } from 'svelte/legacy';

import { sleep } from "$lib/utils/utils"
import { onMount } from "svelte"

	/** @type {{src: any}} */
	let { src } = $props();

	// These values are bound to properties of the video
	let time = $state(0);
	let duration = $state();
	let paused = $state(true);
	let showControls = $state(true);
	let showControlsTimeout;
	// Used to track time of last mouse down event
	let lastMouseDown;
	let video = $state()

	const NOT_FOUND = "File not found"
    const OTHER = "File"

    onMount(async () => {
        loadVideo(src)
    })


	function handleMove(e) {
		// Make the controls visible, but fade out after
		// 2.5 seconds of inactivity
		clearTimeout(showControlsTimeout);
		showControlsTimeout = setTimeout(() => showControls = false, 2500);
		showControls = true;

		if (!duration) return; // video not loaded yet
		if (e.type !== 'touchmove' && !(e.buttons & 1)) return; // mouse not down

		const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
		const { left, right } = this.getBoundingClientRect();
		time = duration * (clientX - left) / (right - left);
	}

	// we can't rely on the built-in click event, because it fires
	// after a drag — we have to listen for clicks ourselves
	function handleMousedown(e) {
		lastMouseDown = new Date();
	}

	function handleMouseup(e) {
		if (new Date() - lastMouseDown < 300) {
			if (paused) e.target.play();
			else e.target.pause();
		}
	}

	function format(seconds) {
		if (isNaN(seconds)) return '...';

		const minutes = Math.floor(seconds / 60);
		seconds = Math.floor(seconds % 60);
		if (seconds < 10) seconds = '0' + seconds;

		return `${minutes}:${seconds}`;
	}

    async function loadVideo(file) {
		let load = []
		if (file.path === "storage") {
			load = await window.api.loadStoredFile(file.hash, file.topic)
		} else {
			load = await window.api.loadFile(file.path, file.size)
		}
		let [arr, type] = load
		if (arr === OTHER || arr === NOT_FOUND) return false
		let blob = new Blob( [ arr ]);
		video.src = URL.createObjectURL( blob );
		video.load();
    }

</script>

<div>
	<video
        id="videoPlayer"
		bind:this={video}
		onmousemove={handleMove}
		ontouchmove={preventDefault(handleMove)}
		onmousedown={handleMousedown}
		onmouseup={handleMouseup}
		bind:currentTime={time}
		bind:duration
		bind:paused>
		<track kind="captions">
	</video>

	<div class="controls" style="opacity: {duration && showControls ? 1 : 0}">
		<progress value="{(time / duration) || 0}"></progress>

		<div class="info">
			<span class="time">{format(time)}</span>
			<span>click anywhere to {paused ? 'play' : 'pause'} / drag to seek</span>
			<span class="time">{format(duration)}</span>
		</div>
	</div>
</div>

<style>
	div {
		position: relative;
	}

	.controls {
		position: absolute;
		top: 0;
		width: 100%;
		transition: opacity 1s;
	}

	.info {
		display: flex;
		width: 100%;
		justify-content: space-between;
	}

	span {
		padding: 0.2em 0.5em;
		color: white;
		text-shadow: 0 0 8px black;
		font-size: 1.4em;
		opacity: 0.7;
	}

	.time {
		width: 3em;
	}

	.time:last-child { text-align: right }

	progress {
		display: block;
		width: 100%;
		height: 10px;
		-webkit-appearance: none;
		appearance: none;
	}

	progress::-webkit-progress-bar {
		background-color: rgba(0,0,0,0.2);
	}

	progress::-webkit-progress-value {
		background-color: rgba(255,255,255,0.6);
	}

	video {
		width: 100%;
		max-height: 70vh;
	}
</style>
