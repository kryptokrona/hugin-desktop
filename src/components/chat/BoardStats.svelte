<script>
import { createEventDispatcher, onMount } from 'svelte'
import { fade } from 'svelte/transition'
import { boards } from '$lib/stores/user.js'
import ActiveBoard from '$components/chat/ActiveBoard.svelte'

const dispatch = createEventDispatcher()
let active_boards = []
let removeBoard = false
onMount(() => {
    filterActiveBoards($boards.newBoards)
})

//Get message updates and trigger filter
window.api.receive('newBoard', async (data) => {
    console.log('data newboard', data)
    $boards.newBoards.push(data)
    filterActiveBoards($boards.newBoards)
})

//Function to filer array of active users on board.
function filterActiveBoards(arr) {
    let uniq = {}
    active_boards = arr.filter((obj) => !uniq[obj.board] && (uniq[obj.board] = true))
}

const toggleBoardSettings = () => {
    console.log(removeBoard)
    removeBoard = !removeBoard
}

const removeThisBoard = () => {
    window.api.removeBoard($boards.thisBoard)
    let filter = $boards.boardsArray.filter((a) => a !== $boards.thisBoard)
    $boards.boardsArray = filter
}

$: active_boards
</script>

<div class="wrapper">
    <div class="top" on:click="{toggleBoardSettings}">
        <h2>{$boards.thisBoard}</h2>
        <br />
        {#if removeBoard}
            <div in:fade class="remove">
                <p style="color: var(--warn-color)" on:click="{removeThisBoard}">Remove</p>
            </div>
        {/if}
    </div>
    <div class="active_hugins">
        <h4>Active Boards</h4>
    </div>
    <div class="list-wrapper">
        {#each active_boards as board}
            <ActiveBoard board="{board}" on:click="{() => dispatch('printBoard', board.board)}" />
        {/each}
    </div>
</div>

<style lang="scss">
.wrapper {
    width: 100%;
    max-width: 280px;
    z-index: 3;
    overflow: hidden;
}

.list-wrapper {
    display: flex;
    flex-direction: column;
    align-items: baseline;
    width: 100%;
    height: 100%;
    overflow: scroll;
}

.wrapper::-webkit-scrollbar,
.list-wrapper::-webkit-scrollbar {
    display: none;
}

.top {
    height: 73px;
    top: 0;
    width: 100%;
    max-width: 280px;
    padding: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid var(--border-color);
    z-index: 9;
}

.card {
    display: flex;
    align-items: center;
    padding: 0.5rem;
    width: 100%;
    color: white;
    border-bottom: 1px solid var(--border-color);
    transition: 177ms ease-in-out;
    cursor: pointer;

    &:hover {
        background-color: #333333;
    }
}

.avatar {
    height: 30px;
}

h4 {
    margin: 0;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    font-family: 'Montserrat';
    text-overflow: ellipsis;
}

h2 {
    margin: 0;
    color: #fff;
    font-family: 'Roboto Mono';
    font-weight: bold;
    font-size: 22px;
    cursor: pointer;
}

p {
    margin: 0;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    font-size: 12px;
    margin-top: 5px;
    text-overflow: ellipsis;
}

.active_hugins {
    padding: 1rem;
    color: white;
    border-bottom: 1px solid var(--border-color);
}

.remove {
    position: absolute;
    right: 100px;
    top: 0px;
    cursor: pointer;
}
</style>
