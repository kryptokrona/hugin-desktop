<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {createEventDispatcher, onMount, onDestroy} from "svelte";
    import GreenButton from "/src/components/buttons/GreenButton.svelte";
    import {user} from "$lib/stores/user.js";
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    const dispatch = createEventDispatcher()

    let enableAddButton = false
    let text = ''
    let name = 'Change'

    export let this_contact

    const enter = (e) => {
        if (enableAddButton && $user.rename && e.keyCode === 13) {
            renameContact(text)
            enableAddButton = false
        }
    }

    $: {
        if (text.length > 0) {
            //Enable add button
            enableAddButton = true

        } else {
            enableAddButton = false
        }
    }

    // Dispatch the inputted data
    const renameContact = (board) => {
      // Dispatch the inputted data
          dispatch('rename', {
              text: text,
          })

          user.update(a => {
            return {
            ...a,
            rename: false
            }
        })
    }


</script>

<svelte:window on:keyup|preventDefault={enter} />
<div in:fade="{{duration: 100}}" out:fade="{{duration: 170}}" class="backdrop" on:click|self>

<div class="card">
    <div>
        <img class="avatar" src="data:image/png;base64,{get_avatar($user.rename.chat)}" alt="">
        <h3>Change name to {text}</h3>
        <input placeholder="Nickname" type="text" bind:value={text}>
          <GreenButton text={name}  disabled={!enableAddButton} enabled={enableAddButton} on:click={()=> renameContact(text)}/>
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
    width: 30%;
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
        background-color: var(--backdrop-color);
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
        color: var(--title-color);
        margin: 0;
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
