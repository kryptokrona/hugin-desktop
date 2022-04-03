<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import {fade} from "svelte/transition";
    import {messages} from "$lib/stores/messages.js";
    import {user} from "$lib/stores/user.js";
    import addIcon from '/static/images/add-circle.png'
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    const dispatch = createEventDispatcher();
    let filterArr = []

    //Get message updates and trigger filter
    messages.subscribe(() => {
        if ($messages.length > 0) {
            filterConversation($messages)
        }

        //If we have no active chat we take the latest known message and dispatch.
        if (!$user.activeChat) {
            sendConversation($messages[0].from, $messages[0].k)
        }
    })

    //Function to filer array after last msg and conversation
    function filterConversation(arr) {
        let uniq = {}
        filterArr = arr.filter(obj => !uniq[obj.from] && (uniq[obj.from] = true))
        console.log('FILTERARR', filterArr)
    }

    //Dispatches the clicked conversation to parent
    function sendConversation(from, key) {
        dispatch('conversation', {
            from,
            k: key
        });
    }

</script>

<div class="wrapper">
    <div class="top">
        <h2>Messages</h2>
        <img class="add-icon" src={addIcon} on:click>
    </div>
    <div class="list-wrapper">
        {#each filterArr as message}
            <div in:fade class="card" on:click={() => sendConversation(message.from, message.k)}>
                <img class="avatar" src="data:image/png;base64,{get_avatar(message.from)}" alt="">
                <div class="content">
                    <h4>{message.from}</h4>
                    <p>{message.msg}</p>
                </div>
            </div>
        {/each}
    </div>
</div>

<style>

    .wrapper {
        width: 100%;
        max-width: 280px;
        box-sizing: border-box;
        background-color: #202020;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
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
        top: 0;
        box-sizing: border-box;
        width: 100%;
        max-width: 280px;
        padding: 20px;
        height: 85px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 9;
    }

    .card {
        box-sizing: border-box;
        display: flex;
        padding: 10px 20px 10px 10px;
        width: 100%;
        color: white;
        border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        transition: 250ms ease-in-out;
        cursor: pointer;
    }

    .card:hover {
        background-color: #333333;
    }

    .avatar {
        margin-bottom: 10px;
    }

    .content {
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }

    h4 {
        margin: 0;
        white-space: nowrap;
        max-width: 180px;
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
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis
    }

    .add-icon {
        background-color: transparent;
        border: none;
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        transition: 250ms ease-in-out;
    }

    .add-icon:hover {
        opacity: 50%;
        padding: 5px;
    }

</style>
