<script>
	import { download, upload } from '$lib/stores/files';
	import { run } from 'svelte/legacy';

	let { file, send } = $props();
	let name = file.fileName;
	let loader = $derived(send ? $upload : $download);
	let progress = $state(0);
    let current = () => { return loader.find(
			(f) => f.fileName === file.fileName && f.time === file.time
    )};

	$effect(() => {
        if ($download.length | $upload.length) {
		    progress = current().progress;
        }
	
	});

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
			class:done="{progress === 100}"
			style="width: {progress}%;"
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
}

h5 {
	font-size: 12px;
	overflow: hidden;
}

.progress {
	background-color: var(--success-color);
	height: 5px;
	margin-right: auto;
	border-radius: 0.4rem;
	transition: 200ms ease-in-out;
}

.done {
	background-color: var(--success-color);
}
</style>
