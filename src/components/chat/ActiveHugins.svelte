<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import {fade} from "svelte/transition";
    import {boardMessages} from "$lib/stores/boardmsgs.js";
    import {user} from "$lib/stores/user.js";
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    const dispatch = createEventDispatcher();
    let activeHugins = []
    let contacts = []
    let msgkey;
    //Get message updates and trigger filter
    boardMessages.subscribe(() => {
            filterActiveHugins($boardMessages)
    })

    //Function to filer array of active users on board.
    function filterActiveHugins(arr) {
        let uniq = {}
        activeHugins = arr.filter(obj => !uniq[obj.k] && (uniq[obj.k] = true))
    }

    $ : activeHugins


</script>

<div class="wrapper">
    <div class="top">
        <h2>Active Hugins</h2>
    </div>
    <div class="list-wrapper">
        {#each activeHugins as user}
            <div class="card" on:click={(e) => sendConversation(message)}>
              <div class="boardUser">
                  <img class="avatar"
                       src="data:image/png;base64,{get_avatar(user.k)}" alt="">
                       <p class="nickname">{user.n}</p><br>
              </div>
            </div>
        {/each}
    </div>
</div>

<style>

    .boardUser {
      display: flex;
      align-items: center;
      color: rgba(255, 255, 255, 0.8);
      padding: 0px 5px 0px 10px;
      z-index: 3;
      font-size: 12px;
      margin-left: 2%;
      width: 92%;
      border-radius: 15px;
      margin-bottom: 0px;
    }

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
        box-sizing: border-box;
        background-color: #202020;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 3;
        overflow: hidden
    }

    .list-wrapper {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        height: 100vh;
        overflow: scroll;
    }

    .wrapper::-webkit-scrollbar, .list-wrapper::-webkit-scrollbar {
        display: none;
    }

    .top {
        top: 0;
        box-sizing: border-box;
        width: 100%;
        max-width: 280px;
        padding: 20px;
        height: 85px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 9;
    }

    .card {
        box-sizing: border-box;
        display: flex;
        padding: 10px 20px 10px 10px;
        width: 100%;
        color: white;
        border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        transition: 177ms ease-in-out;
        cursor: pointer;
    }

    .card:hover {
        background-color: #333333;
    }

    .avatar {
        height: 30px;
    }

    .content {
        margin-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: center;
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
        font-size: 19px;

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

    .add-icon {
        background-color: transparent;
        border: none;
        cursor: pointer;
        padding: 5px;
        border-radius: 5px;
        transition: 250ms ease-in-out;
    }

    .add-icon:hover {
        opacity: 50%;
        padding: 5px;
    }

</style>
