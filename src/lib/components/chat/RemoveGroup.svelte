<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { createEventDispatcher } from 'svelte'
import { groups } from '$lib/stores/user.js'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import FillButton from '$lib/components/buttons/FillButton.svelte'

const dispatch = createEventDispatcher()

let enableAddGroupButton = false
let create_group = 'Create'
let name = ''
let key = ''
let avatar = get_avatar($groups.thisGroup.key)

const remove = async () => {
    dispatch('remove')
}
</script>

<div in:fade="{{ duration: 100 }}" out:fade="{{ duration: 80 }}" class="backdrop" on:click|self>
    <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
        <h3 in:fade>Remove group?</h3>
        <FillButton disabled="{false}" red={true} text="Remove" on:click|once="{remove}" />
    </div>
</div>

<style lang="scss">
.backdrop {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--backdrop-color);
    z-index: 103;
}

h3 {
    margin: 0;
    color: var(--title-color);
}

.card {
    background-color: var(--backgound-color);
    border: 1px solid var(--card-border);
    padding: 20px;
    border-radius: 8px;
    width: 250px;
    height: 125px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
}

input {
    box-sizing: border-box;
    background-color: transparent;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0 1rem;
    height: 35px;
    width: 100%;
    color: white;
    transition: 200ms ease-in-out;

    &:focus {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.6);
    }
}

.key {
    font-family: 'Roboto Mono';
    font-size: 17px;
}

.avatar {
    width: 40px;
    height: 40px;
}

.key-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
}

p {
    font-size: 12px;
    color: white;
    font-family: 'Montserrat';
}
</style>
