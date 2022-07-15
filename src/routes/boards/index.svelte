<script>
    import { fade } from 'svelte/transition';
    import BoardWindow from "/src/components/chat/BoardWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import {boardMessages} from '$lib/stores/boardmsgs.js';
    import BoardMessage from "/src/components/chat/BoardMessage.svelte";
    import ActiveHugins from "/src/components/chat/ActiveHugins.svelte";
    import {user, boards} from '$lib/stores/user.js'
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
    let filterBoards = []
    let filterEmojis = []
    let fixedBoards = []
    let react = false
    let unreadMsgs = []
    let replyTrue = false

    onMount(async () => {
      console.log('mounting');
      if ($boards.thisBoard == null) {
        thisBoard = 'Home'
      }
      printBoard(thisBoard)
    })
      //Listens for new messages from backend
        window.api.receive('boardMsg', data => {

          //*TODO*//Keep logs to experiment with toast popups
          console.log('boardMsg', data.brd)
          console.log('user', $boards.thisBoard);

          if (data.brd === thisBoard) {
            //Push new message to store
            printBoardMessage(data)
          } else {
            console.log('not this board');
            toast.push('New board message', {
              })
              unreadMsgs.push(data)
            return
          }
        })

    //Send message to store and DB
    function sendboardMsg(e) {
      console.log('wanna send this', e);
        let msg = e.detail.text
        let myaddr = $user.huginAddress.substring(0,99)
        let time = Date.now() / 1000
        let myName = $user.username
        let brd = thisBoard
        //Reaction switch
        if (e.detail.reply) {
          replyto = e.detail.reply
        }
        //Construct a new json object (myBoardMessage) to be able to print our message instant.
        let myBoardMessage = {m: msg, brd: thisBoard, r: replyto, k: myaddr, t: time, n: myName, hash: time}
        window.api.sendBoardMsg(myBoardMessage)
        printBoardMessage(myBoardMessage)
        replyExit()
    }

    //Prints any single board message. Takes boardmessage and updates to store.
    const printBoardMessage = (boardMsg) => {

      if (boardMsg.r.length === 64 && boardMsg.m.length < 4 && containsOnlyEmojis(boardMsg.m)) {
        updateReactions(boardMsg)
      } else if (boardMsg.m.length > 0) {
        console.log('pushin');
        fixedBoards.unshift(boardMsg)
      }
      boardMessages.update(current => {
          return [boardMsg, ...current]
      })
      fixedBoards = fixedBoards
    }

    //Reactive, updates thisBoard.
    $ : thisBoard = $boards.thisBoard

    $ : console.log('ThisBoard', thisBoard);

    //Exit reply mode
    const replyExit = () => {
      console.log('reply exit');
      replyto = false
      boards.update(data => {
        return {
          ...data,
          replyTo: {reply: false},
        }
      })
    }

    //Enter reply mode
    async function replyToMessage(hash, nickname, emoji=false) {
      if (replyto != false) {
        await replyExit()
      }
      replyto = hash

        boards.update(data => {
          return {
            ...data,
            replyTo: {to: hash, nick: nickname, reply: true, emoji: emoji},
        }
      })

    }

    //Default value should be false to hide the AddBoard form.
    let wantToAdd = false

    //Open AddBoard component and update state in store.
    const openAddBoard = () => {

        wantToAdd = !wantToAdd

        if (!wantToAdd) {
          boards.update(data => {
            return {
              ...data,
              addBoard: false,
            }
        })
        }
    }
    //Adds new board to boardArray and prints that board, its probably empty.
    const addNewBoard = (e) => {

      let board = e.detail.brd
      boards.update(current => {
           return {
               ...current,
               boardsArray: [...current.boardsArray, board]
           }
         })
         openAddBoard()
         printBoard(board)
         window.api.send('addBoard', board)
    }

    //Svelte reactive. Sets noMsgs boolean for welcome message.
    $ : if ($boardMessages.length == 0) {
      noMsgs = true
    } else {
      noMsgs = false
    }

    //Checks messages for reactions in chosen board from printBoard() function
    async function checkReactions() {
      //All boardmessages all messages except reactions
      filterBoards = await $boardMessages.filter(m => m.m.length > 0 && !containsOnlyEmojis(m.m))
      //Only reactions
      filterEmojis = await $boardMessages.filter(e => e.r.length === 64 && e.m.length < 4 && containsOnlyEmojis(e.m))
      console.log('filter emoji ', filterEmojis);
      if (filterEmojis.length) {
         //Adding emojis to the correct message.
        await addEmoji()
      } else {
        fixedBoards = filterBoards
      }
    }
    //Print chosen board. SQL query to backend and then set result in Svelte store, then updates thisBoard.
    async function printBoard(board) {
        console.log('Printing board', board);
        fixedBoards = []
        noMsgs = false
        //Load boardMessages from db
        await boardMessages.set(await window.api.printBoard(board))
        //Check for emojis and filter them
        await checkReactions()
        //Reactions should be set, update thisBoard in store and set reply to false.
        boards.update(data => {
          return {
            ...data,
            thisBoard: board
          }
        })
        boards.update(data => {
          return {
            ...data,
            replyTo: {reply: false},
          }
        })
    }

    async function updateReactions(msg) {

      let reactionsFixed
      reactionsFixed = fixedBoards.map(function (r) {
        if (r.hash == msg.r && !r.react) {
          r.react = []
          r.react.push(msg)
        } else if (r.hash == msg.r && r.react) {
          r.react.push(msg)
        }
        return r
      })
    fixedBoards = reactionsFixed
    }

    async function addEmoji() {
      //Check for replies and message hash that match and then adds reactions to the messages.
      filterBoards.forEach(async function (a) {
          await filterEmojis.forEach(function (b) {
            if (!a.react && b.r == a.hash) {
              a.react = []
              a.react.push(b)
              console.log();
            } else if (b.r == a.hash) {
              a.react.push(b)
            }
          })
          fixedBoards.push(a)
        })
          fixedBoards = fixedBoards
      }

      //Checks for messages that only coinatins emojis.
      function containsOnlyEmojis(text) {
        const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '')
        const visibleChars = text.replace(new RegExp('[\n\r\s]+|( )+', 'g'), '')
        return onlyEmojis.length === visibleChars.length
      }

      $: fixedBoards
      //Reactive depending on user.addBoard boolean, displays AddBoard component.
      $: wantToAdd = boards.addBoard

      $: replyTrue = $boards.replyTo.reply


</script>

{#if wantToAdd}
    <AddBoard on:click={openAddBoard} on:addBoard={e =>addNewBoard(e)}/>
{/if}
<main>

{#if replyTrue}
 <div class="reply_to_exit" class:reply_to={replyTrue} on:click={()=> replyExit()}>{reply_exit_icon} Reply to {$boards.replyTo.nick}</div>
{/if}
        <ChatInput on:message={(e) => sendboardMsg(e)}/>
        <BoardWindow>

        <!-- {#if noMsgs}
          <BoardMessage message={WelcomeMsg.m} msgFrom={WelcomeMsg.k} board={WelcomeMsg.brd} nickname={WelcomeMsg.n} timestamp={WelcomeMsg.t} hash={WelcomeMsg.hash}/>
        {/if} -->
                {#each fixedBoards as message (message.hash)}
                <BoardMessage
                 on:reactTo={(e) => sendboardMsg(e)}
                 on:replyTo={(e)=> replyToMessage(message.hash, message.n)}
                  message={message}
                  reply={message.r}
                  msg={message.m}
                  myMsg={message.sent}
                  signature={message.s}
                  board={message.brd}
                  nickname={message.n}
                  msgFrom={message.k}
                  timestamp={message.t} hash={message.hash}/>

                {/each}
        </BoardWindow>
      <div id="board_box">
            <div id="active_hugins">
          <div class="list">
          <ActiveHugins/>
          </div>
        </div>
      </div>

      <RightMenu on:printBoard={(e) => printBoard(e.detail.brd)} />
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
