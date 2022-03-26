<script lang="ts">
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";

	let ready: boolean = false;
	onMount(() => (ready = true));
</script>


{#if ready}
	<slot />
{/if}

<style>
	:global(body) {
		background-color: #2c2c2c;
	}
</style>

