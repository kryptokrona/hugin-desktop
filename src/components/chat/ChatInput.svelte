<script>
    import { createEventDispatcher } from 'svelte'

    const dispatch = createEventDispatcher();

    export let messageInput

    const sendMsg = () => {
        dispatch('message', {
            text: messageInput
        });
    }
</script>

<div class="wrapper">
    <input type="text" placeholder="Message.." bind:value={messageInput}>
    <button on:click={sendMsg}>Send</button>
</div>

<style>

    .wrapper {
        display: flex;
    }

    input {
        box-sizing: border-box;
        width: 100%;
        background-color: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 10px 0 0 10px;
        color: #ffffff;
        padding: 10px 15px;
        margin: 0;
    }

    input:focus{
        outline: none;
    }

    button {
        width: 80px;
        box-sizing: border-box;
        background-color: rgba(255, 255, 255, 0.1);
        border: none;
        border-left: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0 10px 10px 0;
        padding: 10px 20px;
        color: white;
        margin: 0;
    }

    button:focus {
        outline: none;
    }

</style>