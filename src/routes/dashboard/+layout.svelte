<script>
    import {layoutState} from "$lib/stores/layout-state.js";
    import {boards, misc} from "$lib/stores/user.js";
    import {onMount} from "svelte";
    import { fade, fly } from "svelte/transition"

    onMount( async () => {
        $layoutState.showFaucetButton = window.localStorage.getItem('faucet')

        $misc.loading = false
    })

</script>

<div class="main" in:fly="{{ y: 100 }}">
    <slot/>
</div>

<style lang="scss">

  .main {
    height: 100vh;
    margin-left: 85px;
    padding-right: 85px;
    width: 100%;
  }

</style>