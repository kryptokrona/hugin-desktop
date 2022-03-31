<script>
    //To handle true and false, or in this case show and hide.
    import {fade, fly} from "svelte/transition";
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher()
    let enableButton = false
    let nickname
    let address
    let key


    // Dispatch the inputted data
    const handleAdd = () => {
        dispatch('addChat', {
            nickname,
            address,
            key
        })
    }


    //Handle state of the button, disabled by default, when enabled RGB class will be added.
 $: {
        enableButton = !!(address && key);
 }

</script>

<div in:fade="{{duration: 200}}" out:fade class="backdrop" on:click|self>
    <div in:fly="{{y: 50}}" out:fly="{{y: -50}}" class="card" >
        <div class="wrapper">
            <h4>Nickname</h4>
            <input type="text" bind:value={nickname}>
            <h4>Address*</h4>
            <input type="text" bind:value={address}>
            <h4>Message key*</h4>
            <input type="text" bind:value={key}>
        </div>
        <button disabled={!enableButton} class:rgb={enableButton} on:click={handleAdd}>Add</button>
    </div>
</div>

<style>
    .backdrop {
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        width: 100%;
        height: 100%;
        background-color: rgba(51, 51, 51, 0.7);
        -webkit-backdrop-filter: blur(8px);
        backdrop-filter: blur(8px);
        margin-right: 85px;
        z-index: 101;
    }

    .card {
        display: flex;
        box-sizing: border-box;
        flex-direction: column;
        justify-content: space-between;
        height: 360px;
        width: 320px;
        padding: 30px;
        background-color: #1d1d1d;
        border-radius: 8px;
        box-shadow: 0 0 30px 10px rgba(0, 0, 0, 0.2);
        border: 1px solid #3c3c3c;
    }

    .wrapper{
        width: 100%;
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
        width: 100%;
        margin-top: 10px;
        margin-bottom: 20px;
        color: white;
        transition: 250ms ease-in-out;
    }

    input:focus {
        outline: none;
        border: 1px solid rgba(255, 255, 255, 0.6);

    }

    button {
        border: none;
        border-radius: 8px;
        width: 100%;
        height: 36px;
        transition: 250ms ease-in-out;
        background-color: rgb(225, 18, 80);
        color: white;
        cursor: pointer;
    }

    button:hover{
        opacity: 80%;
    }
</style>