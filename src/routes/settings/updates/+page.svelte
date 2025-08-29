<script>
import Button from "$lib/components/buttons/Button.svelte"
import { fade } from "svelte/transition"
import {misc} from '$lib/stores/user.js'
import { t } from '$lib/utils/translation.js'

const getUpdates = () => {
    window.api.successMessage(t('lookingForUpdates') || 'Looking for updates...')
    window.api.send('check-new-release')
}

</script>

<h2>{t('update') || 'Update'}</h2>
<div class="update">
    <Button
    text={t('checkUpdates') || 'Check updates'}
    disabled="{false}"
    on:click="{getUpdates}"
/>
</div>
<div class="settings" in:fade|global>
    <p>{$misc.version}</p>
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
    margin-left: -5px;
}

h2 {
    margin-bottom: 10px;
}
</style>