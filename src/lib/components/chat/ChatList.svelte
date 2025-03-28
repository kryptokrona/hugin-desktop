<script>
    import { run } from 'svelte/legacy';

    import { onDestroy, onMount} from 'svelte'
    import {user} from '$lib/stores/user.js'
    import AddCircle from '$lib/components/icons/AddCircle.svelte'
    import Contact from '$lib/components/chat/Contact.svelte'
    import {layoutState} from '$lib/stores/layout-state.js'
    import {fade, fly} from 'svelte/transition'
    import {flip} from 'svelte/animate'
    import { notify } from '$lib/stores/user.js'

    let chatList = $state([])
    let {
        onConversation,
        OpenRename,
        Rename,
        onOpen
    } = $props()

onMount(async () => {
    chatList = await getConversations()
    if ($user.activeChat) return
    sendConversation(chatList[0])
})

onDestroy(() => {
    window.api.removeAllListeners('sent')
    window.api.removeAllListeners('newMsg')
    window.api.removeAllListeners('saved-addr')
})

//Listen for sent message to update conversation list
window.api.receive('sent', (data) => {
    printConversations()
})

//Listen for sent message to update conversation list
window.api.receive('newMsg', () => {
    printConversations()
})

//Listen for sent message to update conversation list
window.api.receive('saved-addr', async (addr) => {
    await printConversations()
    let sender = chatList.find((a) => a.chat === addr)
    sendConversation(sender)
})

const getConversations = async () => {
    return await window.api.getConversations()
}

//Print our conversations from DBs
const printConversations = async () => {
    chatList = await getConversations()
    //If it is not the same message and not our active chat, add unread boolean
    $user.contacts = chatList
}

//Dispatches the clicked conversation to parent
const sendConversation = (message) => {
    readMessage(message)
    let chat = message.chat
    let msgkey = message.key
    let name = message.name
    let active_chat = { chat: chat, key: msgkey, name: name }
    user.update((user) => {
        return {
            ...user,
            activeChat: active_chat,
        }
    })
     onConversation(active_chat)
    printConversations()
}

const readMessage = (e) => {
    
    const clear = $notify.unread.filter(unread => unread.chat !== e.chat)
    $notify.unread = clear

}


run(() => {
        chatList
    });
</script>

<div class="wrapper" class:hide="{$layoutState.hideChatList === true}" in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}">
    <div class="top" in:fly|global="{{ y: 50 }}"  out:fly|global="{{ y: -50 }}">
        <h2>Messages</h2>
        <AddCircle on:click="{() => onOpen()}" />
    </div>
    <div class="list-wrapper" in:fly|global="{{ y: 50 }}">
        {#each chatList as message (message.chat)}
            <div animate:flip="{{duration: 250}}">
            <Contact
                OpenRename="{() => OpenRename()}"
                Rename="{(a) => Rename(a)}"
                contact="{message}"
                ThisContact="{(e) => sendConversation(e.contact)}"
            />
            </div>
        {/each}
    </div>
</div>

<style lang="scss">
.top {
    top: 0;
    width: 100%;
    padding: 20px;
    height: 85px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
}

.wrapper {
    width: 100%;
    height: 100%;
    max-width: 280px;
    border-right: 1px solid var(--border-color);
    z-index: 3;
    transition: all 0.3s ease-in-out;
}

.list-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: calc(100% - 103px);
    overflow-x: scroll;
}

.wrapper::-webkit-scrollbar,
.list-wrapper::-webkit-scrollbar {
    display: none;
}

h2 {
    margin: 0;
    color: var(--title-color);
    font-size: 22px;
}

.add-icon {
    background-color: transparent;
    border: none;
    cursor: pointer;
    padding: 5px;
    border-radius: 5px;
    transition: 250ms ease-in-out;

    &:hover {
        opacity: 50%;
        padding: 5px;
    }
}

.hide {
    margin-left: -281px;
}
</style>
