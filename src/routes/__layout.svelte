<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import { page } from '$app/stores';

	let ready = false;
	onMount(() => (ready = true));
	let loginScreen = '/'
	console.log($page.url.pathname)
</script>


{#if ready}

	{#if $page.url.pathname !== loginScreen}
	<LeftMenu/>
	{/if}

	<slot />
{/if}

<style>
	:global(body) {
		background-color: #2c2c2c;
	}
</style>

