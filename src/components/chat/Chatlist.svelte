<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import addIcon from '/static/icons/add-circle.png'

    let allMsgs
    let filterArr = []

    onMount(async () => {
        allMsgs = await window.api.getMessages()
        filterConversation(allMsgs)
    })

    const dispatch = createEventDispatcher();

    const sendConversation = (conversation) => {
        dispatch('conversation', {
            conversation
        });
    }

    const filterConversation = async () => {
        let uniq = {}
        filterArr = allMsgs.filter(obj => !uniq[obj.conversation] && (uniq[obj.conversation] = true));
        return filterArr
    }

</script>

<div class="wrapper">
    <div class="top">
        <h2>Messages</h2>
        <button><img src={addIcon} alt=""></button>
    </div>
    <div class="list-wrapper">
        {#each filterArr as message}
            <div class="card" on:click={() => sendConversation(message.conversation)}>
                <h4>{message.conversation}</h4>
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

    h4{
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

    button {
        background-color: transparent;
        border: none;
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        transition: 250ms ease-in-out;
    }

    button:hover {
        opacity: 50%;
        padding: 5px;

    }

</style>