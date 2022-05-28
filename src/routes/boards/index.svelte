<script>
    import { fade } from 'svelte/transition';
    import BoardWindow from "/src/components/chat/BoardWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import {boardMessages} from '$lib/stores/boardmsgs.js';
    import BoardMessage from "/src/components/chat/BoardMessage.svelte";
    import ActiveHugins from "/src/components/chat/ActiveHugins.svelte";
    import {user} from '$lib/stores/user.js'
    import {onMount} from "svelte";
    import { toast } from '@zerodevx/svelte-toast'
    import AddBoard from '/src/components/chat/AddBoard.svelte'
    import RightMenu from "/src/components/navbar/RightMenu.svelte";
    let boardMsgs = []
    let replyto = ''
    let active
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

    //Default value should be false to hide the AddBoard form.
    let wantToAdd = false
    const openAddBoard = () => {
      console.log('open?');

        wantToAdd = !wantToAdd

        if (!wantToAdd) {
          user.update(data => {
            return {
              ...data,
              addBoard: false,
            }
        })
        }
    }

    $ : wantToAdd = $user.addBoard

    const addNewBoard = (e) => {

      let board = e.detail.brd
      user.update(current => {
           return {
               ...current,
               boardsArray: [board, ...current.boardsArray]
           }
         })
         openAddBoard()
         printBoard(board)
    }

    //Print chosen board. SQL query to backend and then set result in Svelte store, then updates thisBoard.
    const printBoard = async (board) => {
        console.log('Printing Board', board)
        boardMessages.set(await window.api.printBoard(board))
        user.update(data => {
          return {
            ...data,
            thisBoard: board,
          }
        })
    }

</script>

{#if wantToAdd}
    <AddBoard on:click={openAddBoard} on:addBoard={e =>addNewBoard(e)}/>
{/if}
<main>

        <ChatInput on:message={sendboardMsg}/>
        <BoardWindow>
                {#each $boardMessages as message (message.hash)}
                <BoardMessage reply={message.r} message={message.m} myMsg={message.sent} signature={message.s} board={message.brd} nickname={message.n} msgFrom={message.k} timestamp={message.t} hash={message.hash}/>
                {/each}
        </BoardWindow>
      <div id="board_box">
            <div id="active_hugins">
          <div class="list">
          <ActiveHugins/>
          </div>
        </div>
      </div>
</main>

<style>

    h3 {
      font-size: 16px;
      color: white;
    }
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

    #board_box {
        width: 350px;
        border-left: 1px solid rgba(255,255,255,0.1);
        overflow: hidden;
    }

    p {
      font-size: 17px;
      color: white;
    }
</style>
