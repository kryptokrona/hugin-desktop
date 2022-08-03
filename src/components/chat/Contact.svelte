<script>
import {createEventDispatcher, onMount} from 'svelte'
import {fade} from "svelte/transition";
import {get_avatar} from "$lib/utils/hugin-utils.js";
import {user, webRTC} from "$lib/stores/user.js";

export let contact

let hover = false
let settings = false

$: thisCall = $webRTC.call.some(a=> a.sender === contact.chat)

const dispatch = createEventDispatcher();

    //Hover functions
    function show() {
        hover = true;
    }

    function hide() {
        hover = false;
    }

    //Contacts settings hover functions
    function showSettings() {
        settings = true;
    }

    function hideSettings() {
        settings = false;
    }

    const printThis = (contact) => {
        dispatch('thisContact', {
            contact: contact,
        })
    }

    const rename = () => {

        user.update(a => {
            return {
            ...a,
            rename: contact
            }
        })
        dispatch('openRename')
    }


</script>
    
<div class="card"  
        in:fade="{{duration: 100}}" out:fade="{{duration: 100}}" 
        on:mouseenter={show} on:mouseleave={hide} 
        class:rgb={thisCall}
        class:active={contact.chat == $user.activeChat.chat}
        on:click={(e) => printThis(contact)}>

    {#if contact.new}
    <div class:unread={contact.new}></div>
    {/if}
      {#if hover}
        <div class="contact_settings" on:mouseenter={showSettings} on:mouseleave={hideSettings}>x
          {#if settings}
              <div class="rename" on:click={rename(contact)}>Rename</div>
          {/if}
        </div>
    {/if}
<img class="avatar" src="data:image/png;base64,{get_avatar(contact.chat)}" alt="">
    <div class="content">
        <h4>{contact.name}</h4>
        <p>{contact.msg}</p>
    </div>
</div>

<style>

.card {
        box-sizing: border-box;
        display: flex;
        padding: 10px 20px 10px 10px;
        width: 100%;
        color: white;
        border-bottom: 1px solid rgba(255, 255, 255, 0.16);
        transition: 250ms ease-in-out;
        cursor: pointer;
        opacity: 0.9;
        border-top: 1px solid transparent;
    }

    .card:hover {
        opacity: 1.0;
    }

    .avatar {
        margin-bottom: 10px;
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
        font-weight: bold;

    }

    p {
      margin: 0;
      white-space: nowrap;
      max-width: 200px;
      overflow: hidden;
      font-size: 12px;
      margin-top: 5px;
      text-overflow: ellipsis;
      font-family: "Montserrat";
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

    .unread {
        animation: border_rgb 30s infinite;
        background-color: white;
        width: 5px;
        height: 2px;
        border-radius: 30%;
        left: 340px;
        margin-top: 25px;
        position: absolute;
    }

    
    .active {
        animation: border_rgb 10s infinite;
    }

    .contact_settings {
        position: relative;
    }

    .rename {
        position: absolute;
    }

</style>