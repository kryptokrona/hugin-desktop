<script>
    import {layoutState} from "$lib/stores/layout-state.js";
    import {boards, misc} from "$lib/stores/user.js";
    import {onMount} from "svelte";

    onMount( async () => {
        $layoutState.showFaucetButton = window.localStorage.getItem('faucet')

        //Set boardsArray to store
        await window.api.getMyBoards().then(res => {
            $boards.boardsArray = res.filter(a => a !== 'Home')
            $boards.boardsArray.unshift('Home')
            console.log($boards.boardsArray)
        })

        $misc.loading = false
    })

</script>

<slot/>

<style lang="scss">

</style>