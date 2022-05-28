<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {createEventDispatcher, onMount} from "svelte";
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    const dispatch = createEventDispatcher()

    let enableAddBoardButton = false
    let nickname
    let addr
    let pubkey
    let text = ''
    let myAddress
    let avatar
    let board

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
            <h4>Board*</h4>
            <input type="text" bind:value={text}> <br>

            <button disabled={!enableAddBoardButton} class:rgb={enableAddBoardButton} on:click={()=> addBoard(text)}>Add</button>
        </div>

<style>
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
        width: 50%;
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
