<script>
    import { run, preventDefault, createBubbler, self } from 'svelte/legacy';

    const bubble = createBubbler();
    import { fade, fly } from 'svelte/transition'
    import FillButton from '$lib/components/buttons/FillButton.svelte'
    import Button from '$lib/components/buttons/Button.svelte'
    import { rooms, notify } from '$lib/stores/user.js'
    import { get_avatar } from '$lib/utils/hugin-utils.js'
    import { t } from '$lib/utils/translation.js'
    import { onMount, onDestroy, tick } from 'svelte'
    import { layoutState } from '$lib/stores/layout-state.js'

    let {
        onAddRoom
    } = $props()

    let enableAddGroupButton = $state(false)
    
    let create = $state(false)
    let newgroup = $state(false)
    let name = $state('')
    let key = ''
    let invite = $state('')
    let test
    let avatar = $state()
    let lockName = $state(false)
    let link = $state('')
    let adm = false
    let nameField
    let keyField
    
    const enter = (e) => {
        if (enableAddGroupButton && invite.length === 128 && e.keyCode === 13) {
            addRoom()
        }
    }
    

    
    const checkError = () => {
        let error = false
        let errorMessage
        if ($rooms.banned.some(a => a === invite)) {
            errorMessage = t('youAreBanned') || 'You are banned',
            error = true
        }
        if ($rooms.roomArray.some((g) => g.name === name)) {
            errorMessage = t('roomNameAlreadyExists') || 'Group name already exists',
            error = true
        }
        if ($rooms.roomArray.some((g) => g.key === invite)) {
            errorMessage = t('roomKeyAlreadyExists') || 'This group key already exists',
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
        onAddRoom({
            key: invite,
            name: name,
            admin: adm
        })

        window.api.successMessage(t('joinedRoom') || 'Joined Room')

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
    
    
    const createNewRoom = () => {
        create = true
        newgroup = true
        console.log("Wanna create")
    }
    
    const joinRoom = () => {
        newgroup = true
        console.log("Wanna join")
    }
    
        let create_group = $derived(create ? (t('create') || 'Create') : (t('join') || 'Join'))
    run(() => {
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
    });
    run(() => {
        if (link.startsWith('hugin://') && link.length > 128 && !create) {
            parseInvite(link)
        }
    });
    run(() => {
        invite
    });
    run(() => {
        avatar
    });
    async function focusCurrentField() {
        await tick()

        if (!newgroup) return

        if (!name && nameField) {
            nameField.focus()
            return
        }

        if (!create && newgroup) {
            keyField.focus()
        }
    }

    onMount(() => {
    layoutState.update(v => ({ ...v, modalOpen: true }))
    })

    onDestroy(() => {
    layoutState.update(v => ({ ...v, modalOpen: false }))
    })

    run(() => {
    if (newgroup) {
        focusCurrentField()
    }
    })

</script>
    
    <svelte:window onkeyup={preventDefault(enter)} />
    
    
    <div in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 80 }}" class="backdrop" onclick={self(bubble('click'))}>
    
        <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="card">
            {#if !newgroup}
                <div >
                <p>{t('createNewRoom') || 'Create a new Room'}</p>
                    <FillButton
                    text={t('create') || 'Create'}
                    disabled="{false}"
                    enabled="{true}"
                    on:click="{() => createNewRoom()}"
                />
                </div>
                <div>
                <p>{t('joinFriendsRoom') || 'Join your friends Room'}</p>
                <FillButton
                    text={t('join') || 'Join'}
                    disabled="{false}"
                    enabled="{true}"
                    on:click|once="{() => joinRoom()}"
                    />
                </div>
             {/if}
    
            {#if create}

                <h3 in:fade|global>{t('nameYourRoom') || 'Name your Room'}</h3>
                <input 
                placeholder={t('nameYourRoom') || 'Name your Room'} 
                type="text" 
                disabled={lockName} 
                bind:value="{name}" 
                bind:this={nameField}
                />
                {#if name.length}
                <Button disabled="{false}" text={t('generateInvite') || 'Generate invite'} on:click="{() => createInvite()}" />
                {/if}
                <div class="key-wrapper" in:fade|global>
                    {#if invite.length}
                    <div in:fade|global><h3 style="color: var(--success-color)">{t('inviteCreated') || 'Invite created'}</h3></div>
                    <!-- <input placeholder="Input room key" type="text" bind:value="{link}" /> -->
                    {/if}
                    {#if link.length}
                        <img in:fade|global class="avatar" src="data:image/png;base64,{avatar}" alt="" />
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
            <div class="key-wrapper" in:fade|global>
                <input 
                placeholder={t('inviteLink') || 'Invite link'} 
                type="text" 
                bind:value="{link}" 
                bind:this={keyField}
                />
                {#if invite.length}
                    <img in:fade|global class="avatar" src="data:image/png;base64,{get_avatar(invite)}" alt="" />
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
        color: var(--text-color);
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
        color: var(--text-color);
        font-family: 'Montserrat';
    }
    </style>
    