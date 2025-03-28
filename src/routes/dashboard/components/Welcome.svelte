
<script>

import FillButton from "$lib/components/buttons/FillButton.svelte"
import Backdrop from "$lib/components/layouts/Backdrop.svelte"
import Cards from "$lib/components/layouts/Cards.svelte"
import { fly } from "svelte/transition"
import { user } from '$lib/stores/user.js'

let {
    onClose
} = $props()

const close = () => {
    window.localStorage.setItem('guide', true)
    onClose()
}

</script>
<Backdrop>
    <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="field">
    
    <Cards> 
            <h2>Welcome {$user.username} </h2>
        <p>Would you like to know more about how to use Hugin?</p>
            <FillButton enabled={true} disabled={false} text={'Continue'} on:click={close}/>
            <FillButton text={'Explpre'} info={true} on:click={close}/>
    </Cards>
</div>
</Backdrop>

<style>

.field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    padding: 0 10px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
}

</style>