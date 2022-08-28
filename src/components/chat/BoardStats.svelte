<script>
  import { createEventDispatcher, onMount } from "svelte";
  import { fade } from "svelte/transition";
  import { boards } from "$lib/stores/user.js";
  import { get_board_icon } from "$lib/utils/hugin-utils.js";
  const dispatch = createEventDispatcher();
  let active_boards = [];

  //Get message updates and trigger filter
	window.api.receive('newBoard', async (data) => {
		console.log('data newboard', data)
		$boards.newBoards.push(data)
		filterActiveBoards($boards.newBoards);
	})

  //Function to filer array of active users on board.
  function filterActiveBoards(arr) {
    let uniq = {};
    active_boards = arr.filter(obj => !uniq[obj.brd] && (uniq[obj.brd] = true));
  }

  $ : active_boards

  function printBoard() {
    console.log(
      'lol print'
    )
  }
</script>

<div class="wrapper">
  <div class="top">
    <h2>{$boards.thisBoard}</h2>
  </div>
  <div class="active_hugins">
    <h4>Active Boards</h4>
  </div>
  <div class="list-wrapper">
    {#each active_boards as board}
      <div class="card">
        {#await get_board_icon(board.brd)}
        {:then board_color}
        <div class="brd" style="background-color: rgb({board_color.red}, {board_color.green},{board_color.blue})">
          <button class="board-icon" on:click={() => printBoard(board)}>{board.brd.substring(0, 1).toUpperCase()}</button>
        </div>
        {/await}
        <p class="board">{board.brd}</p><br>
      </div>
    {/each}
  </div>
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


  .wrapper {
    width: 100%;
    max-width: 280px;
    z-index: 3;
    overflow: hidden
  }

  .list-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    height: 100%;
    overflow: scroll;
  }

  .wrapper::-webkit-scrollbar, .list-wrapper::-webkit-scrollbar {
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
    font-family: "Montserrat";
    text-overflow: ellipsis;
  }

  h2 {
    margin: 0;
    color: #fff;
    font-family: 'Roboto Mono';
    font-weight: bold;
    font-size: 22px;
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
