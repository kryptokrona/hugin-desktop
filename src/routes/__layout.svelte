<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import { user } from "$lib/stores/user.js";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";

	import '/src/style.css'

	let ready = false;
	onMount(() => (ready = true));
</script>


{#if ready}

	{#if $user.loggedIn}
	<LeftMenu/>
		<RightMenu/>
	{/if}

	<slot />
{/if}

<style>
	:global(body) {
		background-color: #2c2c2c;
	}
</style>

