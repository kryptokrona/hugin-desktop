<script>
import { boards } from "$lib/stores/user.js";
import { get_board_icon } from "$lib/utils/hugin-utils.js";

export let board
let board_post_count
let poster_count
let this_board = []

$: if($boards.newBoards.length) {
    this_board = $boards.newBoards.filter(a => a.brd === board.brd)
    board_post_count = this_board.length
}

$: if (this_board.length) {
    let posters = {};
    let active_posters = this_board.filter(r => !posters[r.address] && (posters[r.address] = true));
    poster_count = active_posters.length;
}

$: board_post_count

$: poster_count

function printBoard() {
    console.log(
      'lol print'
    )
  }
  
</script>

<div class="card">
    {#await get_board_icon(board.brd)}
    {:then board_color}
    <div class="brd" style="background-color: rgb({board_color.red}, {board_color.green},{board_color.blue})">
      <button class="board-icon" on:click={() => printBoard(board)}>{board.brd.substring(0, 1).toUpperCase()}</button>
    </div>
    {/await}
    <p class="board">{board.brd}</p><p class="count">{board_post_count}</p><br>
    <p>{poster_count} People are talking here</p>
  </div>

<style lang="scss">

.board {
    margin: 0;
    word-break: break-word;
    display: contents;
    font-family: "Montserrat" !important;
    font-size: 13px;
    font-weight: bold;
  }

  .brd {
    border-radius: 11px;
    opacity: 0.88;
    margin-bottom: 5px;

    &:hover {
      opacity: 1;
    }
  }

  .board-icon {
    border: none;
    background: none;
    color: #f2f2f2;
    font-size: 22px;
    font-family: 'Montserrat', sans-serif;
    cursor: pointer;
    border-radius: 15px;
    width: 30px;
    height: 30px;

    &:hover {
      opacity: 1;
      color: white;
    }
  }
</style>