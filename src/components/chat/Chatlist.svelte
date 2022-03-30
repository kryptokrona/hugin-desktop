<script>
    import {createEventDispatcher, onMount} from 'svelte'

    let allMsgs
    let filterArr = []

    onMount(async () => {
        allMsgs = await window.api.getMessages()
        console.log(allMsgs.messages)
        filterConversation(allMsgs.messages[0])
    })

    const dispatch = createEventDispatcher();

    const sendConversation = (conversation) => {
        dispatch('conversation', {
            conversation
        });
    }

    const filterConversation = async () => {
        let uniq = {}
        filterArr = allMsgs.messages.filter(obj => !uniq[obj.conversation] && (uniq[obj.conversation] = true));
        console.log(filterArr)
        return filterArr
    }

</script>

<div class="wrapper">
    <div class="top">
        <h2>Messages</h2>
        <button>+</button>
    </div>
    <div class="list-wrapper">
        {#each filterArr as message}
            <div class="card" on:click={() => sendConversation(message.conversation)}>
                <h3>{message.conversation}</h3>
                <p>{message.msg.msg}</p>
            </div>
        {/each}
    </div>
</div>

<style>

    .wrapper {
        width: 100%;
        max-width: 280px;
        box-sizing: border-box;
    }
    .list-wrapper {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100vh;
        overflow: scroll;
    }

    .wrapper::-webkit-scrollbar, .list-wrapper::-webkit-scrollbar {
        display: none;
    }

    .top {
        top:0;
        box-sizing: border-box;
        width: 100%;
        max-width: 280px;
        padding: 20px;
        height: 85px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        background-color: #2c2c2c;
        z-index: 9;
    }

    .card {
        box-sizing: border-box;
        padding: 20px;
        width: 100%;
        color: white;
        border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        transition: 250ms ease-in-out;
        cursor: pointer;
    }

    .card:hover {
        background-color: #333333;
    }

    h3{
        margin: 0;
        white-space: nowrap;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis
    }
    
    h2 {
        margin: 0;
        color: #fff;
    }

    p {
        margin: 0;
        white-space: nowrap;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis
    }

</style>