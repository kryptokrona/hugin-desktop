<script>
    import { fade } from 'svelte/transition';
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import {boardMessages} from '$lib/stores/boardmsgs.js';
    import ChatBubble from "/src/components/chat/ChatBubble.svelte";
    import {user} from '$lib/stores/user.js'
    import {onMount} from "svelte";

    onMount(async () => {

        //If we have an active chat in store we show that conversation
            printMessages()
    })

    $ : boardMsgs = []

    $: {
        window.api.receive('boardMsg', async (data) => {
          console.log('boardMsg', data)
            //Push new message to store
            //boardMessages.update(() => data.boardMessages)
            //Update boardsMsgs from store
            boardMsgs.push(data)
            boardMsgs = boardMsgs
            console.log('Boards msgs array?', boardMsgs)

            //console.log('Updated boardmsgs', bMessages);
            //<ChatBubble message={boardmessage.m} ownMsg={boardmessage.sent} msgFrom={boardmessage.k} board={boardmessage.brd}/>
        })
    }

    function printMessages() {
      boardMsgs = $boardMessages
    }

    //Send message to store and DB
    const sendboardMsg = e => {
      console.log('Sending board msg');

        let msg = e.detail.text
        console.log(e)
        window.api.sendBoardMsg(msg, thisBoard)
    }

    $ : thisBoard = $user.thisBoard

</script>

<main>
    <ChatWindow>
        <ChatInput on:message={sendboardMsg}/>
                    {#each boardMsgs as message}
                    <ChatBubble handleType={message.r} message={message.m} myMsg={message.sent} signature={message.s} board={message.brd} nickname={message.n} msgFrom={message.k}/>

                    {/each}
    </ChatWindow>
    <div class="list">

    </div>
</main>

<style>
    h1 {
        color: white;
        margin: 0
    }

    main {
        display: flex;
        margin-left: 85px;
        margin-right: 85px;
        z-index: 3;
    }

    .list {
        width: 350px;
        border-left: 1px solid rgba(255,255,255,0.1);
    }

    p {
      font-size: 17px;
      color: white;
    }
</style>
