<script>
import { layoutState } from '$lib/stores/layout-state.js'
import { boards, misc } from '$lib/stores/user.js'
import { onMount } from 'svelte'
import { fade } from 'svelte/transition'

onMount(async () => {
    $layoutState.showFaucetButton = window.localStorage.getItem('faucet')

    $misc.loading = false
})
</script>

<div class="main" in:fade="{{ duration: 350 }}">
    <slot />
</div>

<style lang="scss">
.main {
    height: 100vh;
    margin-left: 85px;
    padding-right: 85px;
    width: 90%;
}
</style>
