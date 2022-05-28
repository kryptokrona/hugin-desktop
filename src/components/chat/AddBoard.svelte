<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {createEventDispatcher, onMount} from "svelte";
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import GreenButton from "/src/components/chat/GreenButton.svelte"

    const dispatch = createEventDispatcher()

    let enableAddBoardButton = false
    let text = ''
    let board
    let add_board = 'Add'

    $: {
        if (text.length > 0) {
            //Enable add button
            enableAddBoardButton = true

        } else {
          enableAddBoardButton = false
        }
    }

    // Dispatch the inputted data
    const addBoard = (board) => {
      // Dispatch the inputted data
          dispatch('addBoard', {
              brd: board,
          })
    }

</script>

<div in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" class="backdrop" on:click|self>

<div class="card">
    <div>
        <h3>Add new board</h3>
        <input placeholder="Join or create a new public board" type="text" bind:value={text}>
          <GreenButton text={add_board}  disabled={!enableAddBoardButton} enabled={enableAddBoardButton} on:click={()=> addBoard(text)}/>
    </div>
</div>

</div>
<style lang="scss">
  .card {
    box-sizing: border-box;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    padding: 20px;
    border-radius: 0.4rem;
    width: 50%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    @media only screen and (max-width: 1000px) {
      max-width: 100%;
    }
    }
    h3 {
      margin: 0;
      color: var(--title-color);
    }
    input {
      box-sizing: border-box;
      background-color: var(--backgound-color);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      color: var(--title-color);
      padding: 0 10px;
      margin-bottom: 20px;
      height: 36px;
      width: 100%;
      &:focus {
        outline: none;
        border: 1px solid var(--title-color);
        }
      }
    .backdrop {
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        width: 100%;
        height: 100%;
        background-color: rgba(10, 10, 10, 0.8);
        -webkit-backdrop-filter: blur(9px);
        backdrop-filter: blur(9px);
        margin-right: 85px;
        z-index: 101;
    }

    .wrapper {
        width: 100%;
    }

    .nickname-wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .avatar {
        margin-bottom: 9px;
        width: 50px;
        height: 50px;
    }

    h4 {
        color: rgba(255, 255, 255, 0.8);
        margin: 0;
        margin-left: 4px;
    }

    input {
        box-sizing: border-box;
        background-color: transparent;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        padding-left: 8px;
        height: 35px;
        width: 90%;
        margin-top: 10px;
        margin-bottom: 20px;
        color: white;
        transition: 100ms ease-in-out;
    }

    input:focus {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.6);

    }

    .key {
        background-color: rgba(255, 255, 255, 0.2);
    }

    button {
        border: none;
        border-radius: 8px;
        width: 10%;
        height: 36px;
        transition: 100ms ease-in-out;
        background-color: rgb(225, 18, 80);
        color: white;
        cursor: pointer;
    }

    button:hover {
        opacity: 80%;
    }
</style>
