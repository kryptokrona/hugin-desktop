<script>
    import { fade } from 'svelte/transition';
    import BoardWindow from "/src/components/chat/BoardWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import {boardMessages} from '$lib/stores/boardmsgs.js';
    import BoardMessage from "/src/components/chat/BoardMessage.svelte";
    import {user} from '$lib/stores/user.js'
    import {onMount} from "svelte";
    import { toast } from '@zerodevx/svelte-toast'
    let boardMsgs = []
    let replyto = ''
    let navbar
    let navOpen = false
    onMount(async () => {
      console.log('mounting');

        //If we have saved board messages we will print them once on mount
            // printMessages()
    })

        window.api.receive('boardMsg', data => {
          console.log('boardMsg', data.brd)
          console.log('thisboard', thisBoard);
          console.log('user', $user.thisBoard);

          if (data.brd === thisBoard) {
            //Push new message to store
            //boardMessages.update(() => data.boardMessages)
            //Update boardsMsgs from store
            printBoardMessage(data)
          } else {
            console.log('not this board');
            toast.push('New board message', {
              })
            return
          }
        })

    //Send message to store and DB
    const sendboardMsg = e => {
      console.log('Sending board msg');

        let msg = e.detail.text
        let myaddr = $user.huginAddress.substring(0,99)
        let time = Date.now()
        let myName = $user.username
        let myBoardMessage = {m: msg, brd: thisBoard, r: replyto, k: myaddr, t: time, n: myName, hash: time}
        window.api.sendBoardMsg(msg, thisBoard, replyto)
        printBoardMessage(myBoardMessage)

    }

    const printBoardMessage = (boardmessage) => {
      boardMessages.update(current => {
          return [boardmessage, ...current]
      })
    }

    $ : thisBoard = $user.thisBoard

    const replyToMessage = (hash) => {
      console.log('test reply', hash)
      replyto = hash
    }


</script>

<main>

        <ChatInput on:message={sendboardMsg}/>
        <BoardWindow>
                {#each $boardMessages as message (message.hash)}
                <BoardMessage on:click={()=> { replyToMessage(message.hash)}} reply={message.r} message={message.m} myMsg={message.sent} signature={message.s} board={message.brd} nickname={message.n} msgFrom={message.k} timestamp={message.t} hash={message.hash}/>

                {/each}
        </BoardWindow>

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
