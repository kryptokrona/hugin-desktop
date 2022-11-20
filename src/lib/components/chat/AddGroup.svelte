<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { createEventDispatcher } from 'svelte'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import Button from '$lib/components/buttons/Button.svelte'
import { groups, notify } from '$lib/stores/user.js'
import { get_avatar } from '$lib/utils/hugin-utils.js'

const dispatch = createEventDispatcher()

let enableAddGroupButton = false
let create_group = 'Create'
let name = ''
let key = ''
let test
let avatar

const enter = (e) => {
    if (enableAddGroupButton && key.length === 64 && e.keyCode === 13) {
        addGroup()
    }
}

$: {
    if (key.length === 64) {
        avatar = get_avatar(key)

        if (name.length > 0) {
            //Enable add button
            enableAddGroupButton = true
        }
    } else {
        enableAddGroupButton = false
    }
}

// Dispatch the inputted data
const addGroup = (g) => {
    let error = false
    if ($groups.groupArray.some((g) => g.name === name)) {
        $notify.errors.push({
            message: 'Group name already exists',
            name: 'Error',
            hash: parseInt(Date.now()),
        })
        error = true
    }
    if ($groups.groupArray.some((g) => g.key === key)) {
        $notify.errors.push({
            message: 'This group key already exists',
            name: 'Error',
            hash: Date.now(),
        })
        error = true
    }
    if (error) {
        $notify.errors = $notify.errors
        return
    }
    // Dispatch the inputted data
    dispatch('addGroup', {
        key: key,
        name: name,
    })

    $notify.success.push({
        message: 'Joined group',
        name: name,
        hash: Date.now(),
        key: key,
        type: 'success',
    })

    $notify.success = $notify.success

    key = ''
    enableAddGroupButton = false
    $groups.addGroup = false
}

const createGroup = async () => {
    key = await window.api.createGroup()
}

$: key
$: avatar
</script>

<svelte:window on:keyup|preventDefault="{enter}" />

<div in:fade="{{ duration: 100 }}" out:fade="{{ duration: 100 }}" class="backdrop" on:click|self>
    <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
        <h3 in:fade>Name your group</h3>
        <input placeholder="Name your group" type="text" bind:value="{name}" />
        <Button disabled="{false}" text="Generate key" on:click="{() => createGroup()}" />
        <div class="key-wrapper" in:fade>
            <input placeholder="Input group key" type="text" bind:value="{key}" />
            {#if key.length}
                <img in:fade class="avatar" src="data:image/png;base64,{avatar}" alt="" />
            {/if}
        </div>
        <FillButton
            text="{create_group}"
            disabled="{!enableAddGroupButton}"
            enabled="{enableAddGroupButton}"
            on:click="{() => addGroup()}"
        />
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
    backdrop-filter: blur(8px);
    z-index: 103;
    border-radius: 15px;
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
    height: 300px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
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
