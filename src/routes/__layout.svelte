<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";
	import { user } from "$lib/stores/user.js";
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
</style>

