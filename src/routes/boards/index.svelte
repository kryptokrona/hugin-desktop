<script>
    import {fade} from 'svelte/transition';

    let message = 'no message'

    const sendMsg = () => {
        console.log(message)
       window.api.sendMsg(message)
    }

</script>

<main in:fade>
    <div class="board">
        <h1>Boards</h1>
        <h3>{message}</h3>
        <input type="text" placeholder="Message..." bind:value={message}>
        <button on:click={sendMsg}>Send</button>
    </div>
</main>

<style>
    main {
        margin-left: 85px;
        padding: 40px;
    }

    h1 {
        color: white;
        margin: 0
    }
</style>