<script>
  //To handle true and false, or in this case show and hide.
  import { fade, fly } from "svelte/transition";
  import { createEventDispatcher } from "svelte";
  import GreenButton from "/src/components/buttons/FillButton.svelte";

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

  const enter = (e) => {
    if (enableAddBoardButton && text.length > 0 && e.keyCode === 13) {
      addBoard(text);
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

 


</script>

<svelte:window on:keyup|preventDefault={enter} />

<div on:click|self in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" class="backdrop">
  <div in:fly="{{y: 50}}" out:fly="{{y: -50}}" class="field">
    <input placeholder="Join or create a new public board" type="text" spellcheck="false" autocomplete="false"
           bind:value={text}>
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

  .field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    padding: 0 10px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;

    .btn {
      color: var(--text-color);
      height: 100%;
      border-left: 1px solid var(--card-border);
      cursor: pointer;

      &:hover {
        background-color: var(--card-border);;
      }
    }
  }

  input {
    margin: 0 auto;
    width: 300px;
    height: 50px;
    transition: 200ms ease-in-out;
    color: var(--text-color);
    background-color: transparent;
    border: none;
    font-size: 1.1rem;
    outline: none;
    &:focus {
      outline: none;
    }
  }

</style>
