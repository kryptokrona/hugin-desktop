<script>
import Button from "$lib/components/buttons/Button.svelte"
import { fade } from "svelte/transition"
import {misc} from '$lib/stores/user.js'

</script>

<h2>Update</h2>
<div class="update">
    <Button
    text="Check updates"
    disabled="{false}"
    on:click="{() => window.api.send('check-new-release')}"
/>
</div>
<div class="settings" in:fade>
    <p>Current version is  {$misc.version}</p>
    <br>
</div>

<style>

.settings {
    margin-top: 2rem;
    border-radius: 10px;
    display: grid;
    transition: 0.25s ease-in-out all;
    grid-template-columns: repeat(2, 1fr);
}

.update {
    width: 50%;
}
</style>