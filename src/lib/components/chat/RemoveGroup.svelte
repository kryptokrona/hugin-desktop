<script>
   import { run, createBubbler, self } from 'svelte/legacy';

   const bubble = createBubbler();
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { groups, rooms } from '$lib/stores/user.js'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import FillButton from '$lib/components/buttons/FillButton.svelte'

/** @type {{r?: boolean, onRemove: any}} */

let { r = false, onRemove } = $props();
let avatar = $state()
run(() => {
      if (r) {
      avatar = get_avatar($rooms.thisRoom.key)
   } else avatar = get_avatar($groups.thisGroup.key)
   });

const remove = async () => {
    onRemove()
}
</script>

<div in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 80 }}" class="backdrop" onclick={self(bubble('click'))}>
    <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="card">
        <h3 in:fade|global>Remove group?</h3>
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
