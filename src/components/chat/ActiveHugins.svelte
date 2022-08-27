<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import {fade} from "svelte/transition";
    import {boardMessages} from "$lib/stores/boardmsgs.js";
    import {user, boards} from "$lib/stores/user.js";
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    const dispatch = createEventDispatcher();
    let activeHugins = []
    let contacts = []
    let msgkey;
    //Get message updates and trigger filter
    boardMessages.subscribe(() => {
            filterActiveHugins($boardMessages)
    })

    const sendPM = (user) => {
      console.log('User', user);
    }

    //Function to filer array of active users on board.
    function filterActiveHugins(arr) {
        let uniq = {}
        activeHugins = arr.filter(obj => !uniq[obj.k] && (uniq[obj.k] = true))
    }

    $ : activeHugins


</script>

<div class="wrapper">
<div class="top">
    <h2>{$boards.thisBoard}</h2>
    </div>
    <div class="active_hugins">
        <h4>Active Hugins</h4>
    </div>
    <div class="list-wrapper">
        {#each activeHugins as user}
            <div class="card" on:click={(e) => sendPM(user)}>
                  <img class="avatar"
                       src="data:image/png;base64,{get_avatar(user.k)}" alt="">
                       <p class="nickname">{user.n}</p><br>
            </div>
        {/each}
    </div>
</div>

<style lang="scss">

    .nickname {
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
        border-right: 1px solid var(--border-color);
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
        top: 0;
        width: 100%;
        max-width: 280px;
        padding: 20px;
        height: 85px;
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

</style>
