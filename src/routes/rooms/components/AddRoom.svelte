<script>
    //To handle true and false, or in this case show and hide.
    import { fade, fly } from 'svelte/transition'
    import { createEventDispatcher } from 'svelte'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import Button from '$lib/components/buttons/Button.svelte'
    import { rooms, notify } from '$lib/stores/user.js'
    import { get_avatar } from '$lib/utils/hugin-utils.js'
    
    const dispatch = createEventDispatcher()
    
    let enableAddGroupButton = false
    
    let create = false
    let newgroup = false
    let name = ''
    let key = ''
    let invite = ''
    let test
    let avatar
    let lockName = false
    let link = ''
    let adm = false
    $: create_group = create ? 'Create' : 'Join'
    
    const enter = (e) => {
        if (enableAddGroupButton && invite.length === 128 && e.keyCode === 13) {
            addRoom()
        }
    }
    
    $: {
        if (invite.length) {
            console.log("Invite link avatar", invite)
            avatar = get_avatar(invite)
    
            if (invite.length === 128) {
                //Enable add button
                enableAddGroupButton = true
            }
        } else {
            enableAddGroupButton = false
        }
    }

    $: {
        if (link.startsWith('hugin://') && link.length > 128 && !create) {
            parseInvite(link)
        }
    }
    
    const checkError = () => {
        let error = false
        let errorMessage
        if ($rooms.banned.some(a => a === invite)) {
            errorMessage = 'You are banned',
            error = true
        }
        if ($rooms.roomArray.some((g) => g.name === name)) {
            errorMessage = 'Group name already exists',
            error = true
        }
        if ($rooms.roomArray.some((g) => g.key === invite)) {
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
    const addRoom = async () => {
        console.log("add room!")
        let error = checkError()
        if (error) return
        // Dispatch the inputted data
        console.log("Dispatch!")
        dispatch('addRoom', {
            key: invite,
            name: name,
            admin: adm
        })
    
        window.api.successMessage('Joined Room')
    
        key = ''
        enableAddGroupButton = false
        $rooms.addRoom = false
    }
    
    const createInvite = async () => {
        lockName = true
        const [inv, admin] = await window.api.createInvite()
        invite = inv
        adm = admin
        link = 'hugin://' + name + '/' + invite
        //invite  = group key + admin pubkey
    }

    const parseInvite = (link) => {
        const inviteKey = link.slice(-128)
        const parse = link.split('hugin://')[1]
        const roomName = parse.slice(0, (parse.length - 1) - inviteKey.length)
        const originalName = roomName.replace(/-/g, ' ');
        invite = inviteKey
        name = originalName
        link = link
        if (invite.length)
        enableAddGroupButton = true
    }
    
    $: invite
    $: avatar
    
    const createNewRoom = () => {
        create = true
        newgroup = true
        console.log("Wanna create")
    }
    
    const joinRoom = () => {
        newgroup = true
        console.log("Wanna join")
    }
    
    </script>
    
    <svelte:window on:keyup|preventDefault="{enter}" />
    
    
    <div in:fade="{{ duration: 100 }}" out:fade="{{ duration: 100 }}" class="backdrop" on:click|self>
    
        <div in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}" class="card">
            {#if !newgroup}
                <div >
                <p>Create a new Room</p>
                    <FillButton
                    text="{"Create"}"
                    disabled="{false}"
                    enabled="{true}"
                    on:click="{() => createNewRoom()}"
                />
                </div>
                <div>
                <p>Join your friends Room</p>
                <FillButton
                    text="{"Join"}"
                    disabled="{false}"
                    enabled="{true}"
                    on:click|once="{() => joinRoom()}"
                    />
                </div>
             {/if}
    
            {#if create}
    
                <h3 in:fade>Name your Room</h3>
                <input placeholder="Name your Room" type="text" disabled={lockName} bind:value="{name}" />
                {#if name.length}
                <Button disabled="{false}" text="Generate invite" on:click="{() => createInvite()}" />
                {/if}
                <div class="key-wrapper" in:fade>
                    {#if invite.length}
                    <div in:fade><h3 style="color: var(--success-color)">Invite created</h3></div>
                    <!-- <input placeholder="Input room key" type="text" bind:value="{link}" /> -->
                    {/if}
                    {#if link.length}
                        <img in:fade class="avatar" src="data:image/png;base64,{avatar}" alt="" />
                    {/if}
                </div>
                <FillButton
                text="{create_group}"
                disabled="{!enableAddGroupButton}"
                enabled="{enableAddGroupButton}"
                on:click|once="{() => addRoom()}"
                />
            {:else if !create && newgroup}
            <div>
                {#if invite.length}
                    <h3>{name}</h3>
                {/if}
            </div>
            <div class="key-wrapper" in:fade>
                <input placeholder="Invite link" type="text" bind:value="{link}" />
                {#if invite.length}
                    <img in:fade class="avatar" src="data:image/png;base64,{get_avatar(invite)}" alt="" />
                {/if}
            </div>
                <FillButton
                    text="{create_group}"
                    disabled="{!enableAddGroupButton}"
                    enabled="{enableAddGroupButton}"
                    on:click|once="{() => addRoom(false)}"
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
    