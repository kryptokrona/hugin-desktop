<script>
import { fade } from 'svelte/transition'
import BoardWindow from '/src/components/chat/BoardWindow.svelte'
import ChatInput from '/src/components/chat/ChatInput.svelte'
import { boardMessages } from '$lib/stores/boardmsgs.js'
import BoardMessage from '/src/components/chat/BoardMessage.svelte'
import BoardStats from '/src/components/chat/BoardStats.svelte'
import { boards, notify, user } from '$lib/stores/user.js'
import { onDestroy, onMount } from 'svelte'
import AddBoard from '/src/components/chat/AddBoard.svelte'
import RightMenu from '/src/components/navbar/RightMenu.svelte'
import { page } from '$app/stores'

let boardMsgs = []
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
    console.log('mounting')
    if ($boards.thisBoard == null) {
        thisBoard = 'Home'
    }

    let filter = $notify.unread.filter((a) => a.type !== 'board')
    $notify.unread = filter

    printBoard(thisBoard)
})

onDestroy(() => {
    window.api.removeAllListeners('boardMsg')
    window.api.removeAllListeners('sent_board')
})

//Listens for new messages from backend
window.api.receive('boardMsg', (data) => {
    //*TODO*//Keep logs to experiment with toast popups
    console.log('boardMsg', data.board)
    console.log('user', $boards.thisBoard)

    if (data.board === thisBoard && $page.url.pathname === '/boards') {
        //Push new message to store
        printBoardMessage(data)
    } else if (
        thisBoard == 'Home' &&
        $boards.boardsArray.some((a) => a === data.board) &&
        $page.url.pathname === '/boards'
    ) {
        console.log('One of my boards')
        printBoardMessage(data)
    } else {
        console.log('board msg', data)
    }
})

window.api.receive('sent_board', (data) => {
    console.log('hash', data)
    addHash(data)
})

//Send message to store and DB
function sendboardMsg(e) {
    console.log('wanna send this', e)
    let msg = e.detail.text
    let myaddr = $user.huginAddress.substring(0, 99)
    let time = parseInt(Date.now() / 1000)
    let myName = $user.username
    let brd = thisBoard
    //Reaction switch
    if (e.detail.reply) {
        replyto = e.detail.reply
        brd = e.detail.board
    }
    //Construct a new json object (myBoardMessage) to be able to print our message instant.
    let myBoardMessage = {
        message: msg,
        board: brd,
        reply: replyto,
        key: myaddr,
        time: time,
        name: myName,
        hash: time,
    }
    let sendMsg = {
        m: msg,
        brd: brd,
        r: replyto,
        k: myaddr,
        t: time,
        n: myName,
        hash: time,
    }
    window.api.sendBoardMsg(sendMsg)
    printBoardMessage(myBoardMessage)
    replyExit()
}

//Prints any single board message. Takes boardmessage and updates to store.
const printBoardMessage = (boardMsg) => {
    if (
        boardMsg.reply.length === 64 &&
        boardMsg.message.length < 9 &&
        containsOnlyEmojis(boardMsg.message)
    ) {
        updateReactions(boardMsg)
    } else if (
        boardMsg.message.length > 0 &&
        !(boardMsg.reply.length === 64 && containsOnlyEmojis(boardMsg.message))
    ) {
        console.log('pushin')
        fixedBoards.unshift(boardMsg)
    }
    boardMessages.update((current) => {
        return [boardMsg, ...current]
    })
    fixedBoards = fixedBoards
}

//Reactive, updates thisBoard.
$: thisBoard = $boards.thisBoard

$: console.log('ThisBoard', thisBoard)

//Exit reply mode
const replyExit = () => {
    console.log('reply exit')
    replyto = false
    boards.update((data) => {
        return {
            ...data,
            replyTo: { reply: false },
        }
    })
}

//Enter reply mode
async function replyToMessage(hash, nickname, emoji = false) {
    if (replyto != false) {
        await replyExit()
    }
    replyto = hash

    boards.update((data) => {
        return {
            ...data,
            replyTo: {
                to: hash,
                nick: nickname,
                reply: true,
                emoji: emoji,
            },
        }
    })
}

//Default value should be false to hide the AddBoard form.
let wantToAdd = false

//Open AddBoard component and update state in store.
const openAddBoard = () => {
    wantToAdd = !wantToAdd

    if (!wantToAdd) {
        boards.update((data) => {
            return {
                ...data,
                addBoard: false,
            }
        })
    }
}
//Adds new board to boardArray and prints that board, its probably empty.
const addNewBoard = (e) => {
    let board = e.detail.board
    if (board === 'Home') return
    if ($boards.boardsArray.indexOf(board) !== -1) {
        printBoard(board)
        openAddBoard()
        return
    }
    boards.update((current) => {
        return {
            ...current,
            boardsArray: [...current.boardsArray, board],
        }
    })
    openAddBoard()
    printBoard(board)
    window.api.addBoard(board)
}

//Svelte reactive. Sets noMsgs boolean for welcome message.
$: if ($boardMessages.length == 0) {
    noMsgs = true
} else {
    noMsgs = false
}

//Checks messages for reactions in chosen board from printBoard() function
async function checkReactions() {
    //All boardmessages all messages except reactions
    filterBoards = await $boardMessages.filter(
        (m) => m.message.length > 0 && !(m.reply.length === 64 && containsOnlyEmojis(m.message))
    )
    //Only reactions
    filterEmojis = await $boardMessages.filter(
        (e) => e.reply.length === 64 && e.message.length < 9 && containsOnlyEmojis(e.message)
    )
    console.log('filter emoji ', filterEmojis)
    if (filterEmojis.length) {
        //Adding emojis to the correct message.
        await addEmoji()
    } else {
        fixedBoards = filterBoards
    }
}

//Print chosen board. SQL query to backend and then set result in Svelte store, then updates thisBoard.
async function printBoard(board) {
    console.log('Printing board', board)
    fixedBoards = []
    noMsgs = false
    //Load boardMessages from db
    if (board == 'Home') {
        boardMessages.set(await window.api.getAllBoards(board))
    } else {
        await boardMessages.set(await window.api.printBoard(board))
    }
    //Check for emojis and filter them
    await checkReactions()
    //Reactions should be set, update thisBoard in store and set reply to false.
    boards.update((data) => {
        return {
            ...data,
            thisBoard: board,
        }
    })
    boards.update((data) => {
        return {
            ...data,
            replyTo: { reply: false },
        }
    })
}

async function updateReactions(msg) {
    let reactionsFixed
    reactionsFixed = fixedBoards.map(function (r) {
        if (r.hash == msg.reply && !r.react) {
            r.react = []
            r.react.push(msg)
        } else if (r.hash == msg.reply && r.react) {
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
            if (!a.react && b.reply == a.hash) {
                a.react = []
                a.react.push(b)
                console.log()
            } else if (b.reply == a.hash) {
                a.react.push(b)
            }
        })
        fixedBoards.push(a)
    })
    fixedBoards = fixedBoards
}

function addHash(data) {
    fixedBoards.some(function (a) {
        if (a.hash === data.time) {
            a.hash = data.hash
        }
    })

    fixedBoards = fixedBoards
}

//Checks for messages that only coinatins emojis.
function containsOnlyEmojis(text) {
    const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '')
    const visibleChars = text.replace(new RegExp('[\n\rs]+|( )+', 'g'), '')
    return onlyEmojis.length === visibleChars.length
}

$: fixedBoards
//Reactive depending on user.addBoard boolean, displays AddBoard component.
$: wantToAdd = $boards.addBoard

$: replyTrue = $boards.replyTo.reply

function findMessage(e) {
    console.log('find this!', e)
    printBoard(e.board)
}
</script>

{#if wantToAdd}
    <AddBoard on:click="{openAddBoard}" on:addBoard="{(e) => addNewBoard(e)}" />
{/if}
<main in:fade="{{ duration: 300 }}">
    {#if replyTrue}
        <div class="reply_to_exit" class:reply_to="{replyTrue}" on:click="{() => replyExit()}">
            {reply_exit_icon} Reply to {$boards.replyTo.nick}
        </div>
    {/if}

    <div class="left_side">
        <ChatInput on:message="{(e) => sendboardMsg(e)}" />
        <BoardWindow>
            <!-- {#if noMsgs}
              <BoardMessage message={WelcomeMsg.m} msgFrom={WelcomeMsg.k} board={WelcomeMsg.brd} nickname={WelcomeMsg.n} timestamp={WelcomeMsg.t} hash={WelcomeMsg.hash}/>
            {/if} -->
            {#each fixedBoards as message (message.hash)}
                <BoardMessage
                    on:reactTo="{(e) => sendboardMsg(e)}"
                    on:replyTo="{(e) => replyToMessage(message.hash, message.name)}"
                    message="{message}"
                    reply="{message.reply}"
                    msg="{message.message}"
                    myMsg="{message.sent}"
                    signature="{message.signature}"
                    board="{message.board}"
                    nickname="{message.name}"
                    msgFrom="{message.key}"
                    timestamp="{message.time}"
                    hash="{message.hash}"
                    on:findMsg="{(e) => findMessage(e.detail)}"
                />
            {/each}
        </BoardWindow>
    </div>
    <div id="board_box">
        <div id="active_hugins">
            <div class="list">
                <BoardStats on:printBoard="{(e) => printBoard(e.detail)}" />
            </div>
        </div>
    </div>

    <RightMenu on:printBoard="{(e) => printBoard(e.detail.board)}" />
</main>

<style>
h3 {
    font-size: 16px;
    color: white;
}

h1 {
    color: white;
    margin: 0;
}

main {
    display: flex;
    margin-left: 85px;
    margin-right: 85px;
    z-index: 3;
    height: 100vh;
}

#board_box {
    width: 350px;
    border-left: 1px solid var(--border-color);
    overflow: hidden;
}

p {
    font-size: 17px;
    color: white;
}

.reply_to_exit {
    width: 50px;
    padding-right: 5px;
    display: none;
}

.reply_to {
    display: inline-flex;
    font-size: 10px;
    font-family: 'Roboto Mono';
    font-weight: 100;
    position: absolute;
    left: 10%;
    justify-content: center;
    color: white;
    padding: 4px;
    width: fit-content;
    z-index: 9;
    cursor: pointer;
}

.left_side {
    display: flex;
    flex-direction: column;
    width: 100%;
}
</style>
