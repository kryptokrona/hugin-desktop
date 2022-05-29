<script>
    import {createEventDispatcher} from 'svelte'
    import sendIcon from '/static/images/send.png'
    import EmojiSelector from 'svelte-emoji-selector';
    import {user} from "$lib/stores/user.js";
    export let reply_to = false
    const dispatch = createEventDispatcher();

    //This handles the emojis, lets fork the repo and make a darker theme.
    function onEmoji(event) {
        if (messageInput) {
            messageInput += event.detail
        } else messageInput = event.detail
    }

    //Input data to dispatch
    let messageInput

    //To handle button disabled enabled
    let enableSend = false

    //Check if enter is pressed and call sendMsg function
    window.addEventListener('keyup', e => {
        if (messageInput && e.keyCode === 13) {
            sendMsg()
        }
    })

    //Dispatches the input data to parent and resets input.
    const sendMsg = () => {
        dispatch('message', {
            text: messageInput
        });
        messageInput = ''
    }


    //Checks if input is empty
    $ : {
        enableSend = !!messageInput;
    }
</script>

<div class="wrapper">
    <input type="text" placeholder="Message.." bind:value={messageInput} class:reply={reply_to}>
    <EmojiSelector on:emoji={onEmoji}/>
    <button disabled={!enableSend} class:enableSend={enableSend} on:click={sendMsg}><img src={sendIcon} height="15px"
                                                                                         alt=""></button>
</div>

<style>

    .wrapper {
      position: absolute;
      padding: 30px 20px 20px 20px;
      width: 70%;
      margin-right: 85px;
      display: inline-flex;
      z-index: 3;
      box-sizing: border-box;
      margin-top: 0%;
      border-bottom-right-radius: 5px;
      border-bottom-left-radius: 5px;
    }


    input {
        width: inherit;
        background-color: rgba(255, 255, 255, 0.1);
        border: none;
        border-radius: 8px 0 0 8px;
        color: #ffffff;
        padding: 10px 15px;
        margin: 0;
    }

    input:focus {
        outline: none;
    }

    button {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 40px;
        box-sizing: border-box;
        background-color: rgb(225, 18, 80);
        border: none;
        border-left: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 0 9px 9px 0;
        padding: 10px 15px 10px 10px;
        color: white;
        margin: 0;
        cursor: pointer;
    }

    button:focus {
        outline: none;
    }

    .enableSend {
        background-color: rgba(255, 255, 255, 0.1);
    }

    .reply {
      border: 1px solid white
      
    }

</style>
