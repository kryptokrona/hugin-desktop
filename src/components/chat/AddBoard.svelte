<script>
  //To handle true and false, or in this case show and hide.
  import { fade, fly } from "svelte/transition";
  import { createEventDispatcher, onMount } from "svelte";
  import GreenButton from "/src/components/buttons/GreenButton.svelte";

  const dispatch = createEventDispatcher();

  let enableAddBoardButton = false;
  let text = "";
  let board;
  let add_board = "Add";

  $: {
    if (text.length > 0) {
      //Enable add button
      enableAddBoardButton = true;

    } else {
      enableAddBoardButton = false;
    }
  }

  // Dispatch the inputted data
  const addBoard = (board) => {
    // Dispatch the inputted data
    dispatch("addBoard", {
      board: board
    });
    enableAddBoardButton = false;
  };

  window.addEventListener("keyup", e => {
    if (enableAddBoardButton && e.keyCode === 13) {
      addBoard(text);
    }
  });


</script>

<div in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" class="backdrop" on:click|self>

  <div in:fly="{{y: 50}}" out:fly="{{y: -50}}" class="card">
      <h3>Add new board</h3>
      <input placeholder="Join or create a new public board" type="text" bind:value={text}>
      <GreenButton text={add_board} disabled={!enableAddBoardButton} enabled={enableAddBoardButton}
                   on:click={()=> addBoard(text)} />
  </div>

</div>

<style lang="scss">

  .backdrop {
    position: fixed;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--backdrop-color);
    z-index: 103;
  }

  h3 {
    margin: 0;
    color: var(--title-color);
  }


  .card {
    background-color: var(--backgound-color);
    border: 1px solid var(--card-border);
    padding: 20px;
    border-radius: 8px;
    width: 300px;
    height: 180px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  input {
    box-sizing: border-box;
    background-color: transparent;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 0 1rem;
    height: 35px;
    width: 100%;
    color: white;
    transition: 200ms ease-in-out;

    &:focus {
      outline: none;
      border: 1px solid rgba(255, 255, 255, 0.6);
    }
  }
</style>
