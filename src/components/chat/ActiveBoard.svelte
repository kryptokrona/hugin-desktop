<script>
    import { boards } from '$lib/stores/user.js'
    import { get_board_icon } from '$lib/utils/hugin-utils.js'
    import { fade } from 'svelte/transition'

    export let board
    let board_post_count
    let poster_count
    let this_board = []

    $: if ($boards.newBoards.length) {
        this_board = $boards.newBoards.filter((a) => a.board === board.board)
        board_post_count = this_board.length
    }

    $: if (this_board.length) {
        let posters = {}
        let active_posters = this_board.filter(
            (r) => !posters[r.address] && (posters[r.address] = true)
        )
        poster_count = active_posters.length
    }

    $: board_post_count

    $: poster_count
</script>

<div class="card" in:fade={{ duration: 150 }}>
    {#await get_board_icon(board.board) then board_color}
        <div
            class="brd"
            style="background-color: rgb({board_color.red}, {board_color.green},{board_color.blue})"
        >
            <button class="board-icon"
                >{board.board.substring(0, 1).toUpperCase()}</button
            >
        </div>
    {/await}
    <p class="board" on:click>{board.board}</p>
    <br />
    {#if poster_count > 1}
        <p in:fade={{ duration: 250 }}>
            {poster_count} people are talking here
        </p>
    {:else}
        <p in:fade={{ duration: 250 }}>{poster_count} new message</p>
    {/if}
</div>

<style lang="scss">
    .card {
        display: block;
        width: 100%;
        padding: 15px;
    }

    .board {
        margin: 0;
        word-break: break-word;
        display: inline-block;
        font-family: 'Montserrat' !important;
        font-size: 15px;
        font-weight: bold;
        margin-left: 5px;
        cursor: pointer;
    }

    .brd {
        border-radius: 5px;
        opacity: 0.88;
        margin-bottom: 5px;
        padding: 0px;
        font-size: 3px;
        display: inline-block;
        cursor: pointer;

        &:hover {
            opacity: 1;
        }
    }

    p {
        font-family: 'Montserrat';
        font-size: 12px;
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
