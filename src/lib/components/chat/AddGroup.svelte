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

let create = false
let newgroup = false
let name = ''
let key = ''
let test
let avatar

$: create_group = create ? 'Create' : 'Join'

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

const checkError = () => {
    let error = false
    let errorMessage
    if ($groups.groupArray.some((g) => g.name === name)) {
        errorMessage = 'Group name already exists',
        error = true
    }
    if ($groups.groupArray.some((g) => g.key === key)) {
        errorMessage =  'This group key already exists',
        error = true
    }
    if (error) {
        window.api.errorMessage(errorMessage)
        return true
    }
    return false
}

// Dispatch the inputted data
const addGroup = async () => {
    let error = checkError()
    if (error) return
    // Dispatch the inputted data
    dispatch('addGroup', {
        key: key,
        name: name,
    })

    window.api.successMessage('Joined group')

    key = ''
    enableAddGroupButton = false
    $groups.addGroup = false
}

const createGroup = async () => {
    key = await window.api.createGroup()
}

$: key
$: avatar

const createNewGroup = () => {
    create = true
    newgroup = true
    console.log("Wanna create")
}

const joinGroup = () => {
    newgroup = true
    console.log("Wanna join")
}

</script>

<svelte:window on:keyup|preventDefault="{enter}" />


<div in:fade="{{ duration: 100 }}" out:fade="{{ duration: 100 }}" class="backdrop" on:click|self>

    <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
        {#if !newgroup}
            <div >
            <p>Create a new group?</p>
                <FillButton
                text="{"Create"}"
                disabled="{false}"
                enabled="{true}"
                on:click="{() => createNewGroup()}"
            />
            </div>
            <div>
            <p>Join your friends group?</p>
            <FillButton
                text="{"Join"}"
                disabled="{false}"
                enabled="{true}"
                on:click="{() => joinGroup()}"
                />
            </div>
         {/if}

        {#if newgroup}

            <h3 in:fade>Name your group</h3>
            <input placeholder="Name your group" type="text" bind:value="{name}" />
            {#if create}
            <Button disabled="{false}" text="Generate key" on:click="{() => createGroup()}" />
            {/if}
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
        {/if}
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
    padding: 30px;
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
