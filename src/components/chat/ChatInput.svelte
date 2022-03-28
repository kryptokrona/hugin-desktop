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

<div>
    <input type="text" placeholder="Message.." bind:value={messageInput}>
    <button on:click={sendMsg}>Send</button>
</div>

<style>

    input {
        box-sizing: border-box;
        width: 80%;
        background-color: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 10px;
        color: black;
        padding: 10px 20px;
    }

    button {
        box-sizing: border-box;
        background-color: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 10px;
        padding: 10px 20px;
    }

</style>