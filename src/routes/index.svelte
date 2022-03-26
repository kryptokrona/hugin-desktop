<script>
    import {fade} from 'svelte/transition'
    import FillButton from "/src/components/buttons/FillButton.svelte";

</script>

<div class="main" in:fade>
    <h1>Welcome to Hugin Messenger</h1>
    <FillButton text="Log in" url="/settings"/>
</div>

<style>
	:root {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu,
			Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
	}

	.main {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        color: #fff;
	}


</style>
