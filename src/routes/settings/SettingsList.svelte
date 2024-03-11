<script>
    import {createEventDispatcher, onDestroy, onMount} from 'svelte'
    import {fade} from 'svelte/transition'
    import Category from '/src/routes/settings/Category.svelte'

    let nodeIcon = ""

    const dispatch = createEventDispatcher()

    const settings = [
        {
            name: 'Node',
            text: 'Change connection settings',
            icon: nodeIcon,
            route: "/settings/node"
        },

        {
            name: 'Wallet',
            text: 'Copy your keys and mnemonic seed',
            icon: nodeIcon,
            route: "/settings/wallet"
        },

        {
            name: 'Contacts',
            text: 'Block contacts or change nicknames',
            icon: nodeIcon,
            route: "/settings/contacts"
        },

        {
            name: 'Updates',
            text: 'Check current version or update',
            icon: nodeIcon,
            route: "/settings/updates"
        },

        {
            name: 'Messages',
            text: 'Message & Input settings',
            icon: nodeIcon,
            route: "/settings/messagesettings"
        },

        {
            name: 'Security',
            text: 'Set your security preferences',
            icon: nodeIcon,
            route: "/settings/security"
        },
    ]


</script>

<div class="wrapper" in:fade>
    <div class="top">
        <h2>Settings</h2>
        <br>
    </div>
    <div class="list-wrapper">
            {#each settings as tab}
                <Category tab={tab} on:click={() => dispatch('changeCategory', tab.route)}/>
            {/each}
    </div>

</div>

<style lang="scss">
.nickname {
    margin: 0;
    word-break: break-word;
    display: contents;
    font-family: 'Montserrat' !important;
    font-size: 13px;
    font-weight: bold;
}

.wrapper {
    width: 100%;
    max-width: 280px;
    overflow: hidden;
    border-right: 1px solid var(--border-color);
    z-index: 0;
    transition: all 0.3s ease-in-out;
}

.list-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100% - 103px);
    overflow: scroll;
}

.wrapper::-webkit-scrollbar,
.list-wrapper::-webkit-scrollbar {
    display: none;
}

.top {
    height: 85px;
    top: 0;
    width: 100%;
    max-width: 280px;
    padding: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.card {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    width: 100%;
    color: white;
    border-bottom: 1px solid var(--border-color);
    transition: 177ms ease-in-out;
    cursor: pointer;

    &:hover {
        background-color: #333333;
    }
}

.avatar {
    height: 30px;
}

h4 {
    margin: 0;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    font-family: 'Montserrat';
    text-overflow: ellipsis;
}

h2 {
    margin: 0;
    color: #fff;
    font-family: 'Montserrat';
    font-weight: bold;
    font-size: 22px;
}

p {
    margin: 0;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    font-size: 12px;
    margin-top: 5px;
    text-overflow: ellipsis;
}

.active_hugins {
    padding: 1rem;
    color: white;
    border-bottom: 1px solid var(--border-color);
}

.add {
    font-size: 15px;
    color: white;
}

.content {
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.remove {
    display: inline-block;
}

.buttons {
    display: inline-flex;
    align-items: center;
    gap: 1rem;
    cursor: pointer;
}

.hide {
    width: 0px;
}
</style>
