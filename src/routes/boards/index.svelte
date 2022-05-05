<script>
    import { fade } from 'svelte/transition';
    import BoardWindow from "/src/components/chat/BoardWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import {boardMessages} from '$lib/stores/boardmsgs.js';
    import ChatBubble from "/src/components/chat/ChatBubble.svelte";
    import {user} from '$lib/stores/user.js'
    import {onMount} from "svelte";

    let boardMsgs = []
    onMount(async () => {

        //If we have saved board messages we will print them once on mount
            printMessages()
    })

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

    $: boardMsgs

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
        <ChatInput on:message={sendboardMsg}/>

            <BoardWindow>
                    {#each boardMsgs.reverse() as message}
                    <ChatBubble handleType={message.r} message={message.m} myMsg={message.sent} signature={message.s} board={message.brd} nickname={message.n} msgFrom={message.k}/>

                    {/each}
    </BoardWindow>
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
        height: 700px;
        overflow: scroll;
        overflow-x: hidden;
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
