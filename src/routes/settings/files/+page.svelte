<script>
    import { fade } from "svelte/transition"
    import Button from "$lib/components/buttons/Button.svelte"
    import { sleep } from "$lib/utils/utils"
    import { user } from '$lib/stores/user.js'
    let loading = false
    let path = ""

    const changeDownloadPath = async () => {
        if (path.length === 0) return
        loading = true
        window.api.changeDowndloadDir(path)
        $user.downloadPath = path
        await sleep(200)
        loading = false
        window.api.successMessage('Download directory changed')
    }

    </script>
    
    <h2>Files</h2>
    <div class="settings" in:fade>
        <p>Change download directory
        <br>
        <p>{$user.downloadPath}</p>
    <div class="changedir">
        <input spellcheck="false" type="text" placeholder="Enter new directory path" bind:value="{path}"/>
        <Button
        text="Set"
        loading={loading}
        disabled="{false}"
        on:click="{changeDownloadPath}"
    />
    </div>
     <br>
</div>
    <style>
    
    .settings {
        margin-top: 2rem;
        border-radius: 10px;
        display: grid;
        transition: 0.25s ease-in-out all;
        grid-template-columns: repeat(1, 1fr);
        font-size: 14px;
    }

    .optimize {
        margin-left: -15px;
    }
    .changedir {
        margin-left: -15px;
        margin-top: 2rem;
    }
    input {
    /* margin: 0 auto; */
    margin-left: 15px;
    max-width: 300px;
    width: 100%;
    height: 48px;
    padding: 0 15px;
    border-radius: 0.5rem;
    transition: 200ms ease-in-out;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    color: var(--text-color);
    font-size: 1.1rem;

    /* &:focus {
      outline: none;
    } */
    }
</style>