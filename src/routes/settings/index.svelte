<script lang="ts">
    import Counter from '$lib/Counter.svelte';
    import Logo from '$lib/Logo.svelte';
    import { browser } from '$app/env';
    import LeftMenu from "/src/components/LeftMenu.svelte";

    let desktop: string;

    if (browser) {
        window.api.receive('from-main', (data: any) => {
            desktop = `Received Message "${data}" from Electron`;
            console.log(desktop);
        });
    }
</script>

<main>
    <LeftMenu/>
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
        box-sizing: border-box;
        text-align: center;
        animation: fade 1s;
        margin: 0 auto;
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
