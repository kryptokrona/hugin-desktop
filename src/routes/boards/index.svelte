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
    let boardMsgs = [];
    let replyto = ''
    let reply_exit_icon = 'x'
    let active
    let replyColor
    let nickname
    let noMsgs = false

    onMount(async () => {
      console.log('mounting');
      printBoard('Home')
        //If we have no saved boardMessages, set empty to true. Displays WelcomeMsg
    })

        window.api.receive('boardMsg', data => {

          //*TODO*//Keep logs to experiment with toast popups
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
        let msg = e.detail.text
        let myaddr = $user.huginAddress.substring(0,99)
        let time = Date.now()
        let myName = $user.username

        //Construct a new json object (myBoardMessage) to be able to print our message instant.
        let myBoardMessage = {m: msg, brd: thisBoard, r: replyto, k: myaddr, t: time, n: myName, hash: time}
        window.api.sendBoardMsg(myBoardMessage)
        printBoardMessage(myBoardMessage)
        replyExit()
    }

    //Prints any single board message. Takes boardmessage and updates to store.
    const printBoardMessage = (boardmessage) => {
      boardMessages.update(current => {
          return [boardmessage, ...current]
      })
    }

    //Reactive, updates thisBoard.
    $ : thisBoard = $user.thisBoard

    //Exit reply mode
    const replyExit = () => {

      replyto = ''
      user.update(data => {
        return {
          ...data,
          replyTo: {reply: false},
        }
      })
    }

    //Enter reply mode
    async function replyToMessage(hash, nickname) {
      if (replyto != false) {
        await replyExit()
      }
      replyto = hash
      user.update(data => {
        return {
          ...data,
          replyTo: {to: hash, nick: nickname, reply: true},
        }
      })
    }

    //Default value should be false to hide the AddBoard form.
    let wantToAdd = false

    //Open AddBoard component and update state in store.
    const openAddBoard = () => {

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

    //Reactive depending on user.addBoard boolean, displays AddBoard component.
    $ : wantToAdd = $user.addBoard

    //Adds new board to boardArray and prints that board, its probably empty.
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
         window.api.send('addBoard', board)
    }
    //Svelte reactive. Sets noMsgs boolean for welcome message
    $ : if ($boardMessages.length == 0) {
      noMsgs = true
    } else {
      noMsgs = false
    }

    //Print chosen board. SQL query to backend and then set result in Svelte store, then updates thisBoard.
    async function printBoard(board) {
        noMsgs = false
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

{#if $user.replyTo.reply}
 <div class="reply_to_exit" class:reply_to={$user.replyTo.reply} on:click={()=> replyExit()}>{reply_exit_icon} Reply to {$user.replyTo.nick}</div>
{/if}
        <ChatInput on:message={sendboardMsg} reply_to={$user.replyTo.reply}/>

        <BoardWindow>

        <!-- {#if noMsgs}
          <BoardMessage message={WelcomeMsg.m} msgFrom={WelcomeMsg.k} board={WelcomeMsg.brd} nickname={WelcomeMsg.n} timestamp={WelcomeMsg.t} hash={WelcomeMsg.hash}/>
        {/if} -->
                {#each $boardMessages as message (message.hash)}
                <BoardMessage on:replyTo={(e)=> replyToMessage(message.hash, message.n)} reply={message.r} message={message.m} myMsg={message.sent} signature={message.s} board={message.brd} nickname={message.n} msgFrom={message.k} timestamp={message.t} hash={message.hash}/>

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

    .replyColor {
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      color: var(--title-color);
    }
    .reply_to_exit {
      width: 50px;
      padding-right: 5px;
      display: none;
    }
    .reply_to {
      display: inline-flex;
      font-size: 11px;
      font-family: 'Roboto Mono';
      font-weight: 100;
      position: absolute;
      left: 10%;
      top: 1%;
      justify-content: center;
      color: white;
      padding: 4px;
      width: fit-content;
      z-index: 9;
      cursor: pointer;
    }
</style>
