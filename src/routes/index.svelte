<script lang="ts">
	import Counter from '$lib/Counter.svelte';
	import Logo from '$lib/Logo.svelte';
	import { browser } from '$app/env';
	import LeftMenu from "../components/LeftMenu.svelte";

	let desktop: string;

	if (browser) {
		window.api.receive('from-main', (data: any) => {
			desktop = `Received Message "${data}" from Electron`;
			console.log(desktop);
		});
	}
</script>

<main>
    <p>Welcome to Hugin Messenger</p>
    <a href="/settings">Log in</a>
</main>

<style>
	:root {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
	}

	:global(body) {
		margin: 0;
		padding: 0;
	}

	main {
        display: flex;
        justify-content: center;
        align-items: center;
		animation: fade 1s;
        height: 100vh;
        color: #fff;
	}

	@keyframes fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
