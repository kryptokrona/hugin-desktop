<script>
    import {createEventDispatcher, onMount} from 'svelte'
    import {fade} from "svelte/transition";
    import {messages} from "$lib/stores/messages.js";
    import {user} from "$lib/stores/user.js";
    import addIcon from '/static/images/add-circle.png'
    import Contact from '/src/components/chat/Contact.svelte'
    let new_message_sound = new Audio("/static/audio/message.mp3")

    const dispatch = createEventDispatcher();

    let filterArr = []
    let contacts = []
    let msgkey;
    let nickname
    let newArray

    onMount(async () => {
      
            newArray = await window.api.getConversations()
            filterArr = newArray
            if ($user.activeChat) return
            sendConversation(newArray[0])

    })
    //Get message updates and trigger filter
    messages.subscribe(() => {
        console.log(
            ' messages subscribe logg?'
        )
    //   console.log('$messages', $messages);
    //         console.log('Printing conversations');
    //           printConversations()
    })

    //Listen for sent message to update conversation list
    window.api.receive('sent', data => {
      printConversations()
     })

      //Listen for sent message to update conversation list
    window.api.receive('newMsg', () => {
      printConversations()
     })
     
    //Listen for sent message to update conversation list
    window.api.receive('saved-addr', data => {
      printConversations()
     })

     async function checkNew() {
        let filterNew = []
         newArray.forEach(function (a) {

            filterArr.some(function (b) {
                console.log('checking?')
                if (b.new && a.chat === b.chat) {
                    console.log('old new, keep new', b)
                     a.new = true
                }
            })
            filterNew.push(a)
            console.log('pushin')
            })

            console.log('conversations filtered and set', filterNew)

        return filterNew
     }


    //Print our conversations from DBs
    async function printConversations() {

        newArray = await window.api.getConversations()


        //If it is not the same message and not our active chat, add unread boolean
        if (newArray[0].timestamp != filterArr[0].timestamp && newArray[0].sent == 0 && $user.activeChat.chat != newArray[0].chat) {
        
            newArray[0].new = true
            
            new_message_sound.play()
        }

        let conversations = await checkNew()
        
        console.log('conv', conversations)

        //Remove this?
        user.update(current => {
            return {
                ...current,
                contacts: newArray
            }
        })

        console.log('Printing conversations');
        //If we have no active chat we take the latest known message and dispatch.
        if (!$user.activeChat) {
          console.log('no userchat', $user.activeChat);
            console.log(newArray);

            sendConversation(newArray[0])
        }

        filterArr = conversations
    }

    //Dispatches the clicked conversation to parent
    function sendConversation(message) {
     readMessage(message)
      let chat = message.chat
      let msgkey = message.key
      let name = message.name
      let active_chat = {chat: chat, k: msgkey, name: name}
        user.update(user => {
            return{
                ...user,
               activeChat: active_chat
            }
        })
      dispatch('conversation', active_chat);
      printConversations()
    }

    function readMessage(e) {

        console.log('reading this')

        filterArr = filterArr.map(function (a) {

            if ( e.new && a.chat == e.chat) {
                console.log('reading this', a)
                a.new = false
            } 
        return a

        })

        filterArr = filterArr
    }
    
    $ : filterArr

</script>

<div class="wrapper" in:fade="{{duration: 250}}" out:fade="{{duration: 100}}">
    <div class="top">
        <h2>Messages</h2>
        <img class="add-icon" src={addIcon} on:click>
    </div>
    <div class="list-wrapper">
        {#each filterArr as message (message.timestamp)}
           <Contact on:openRename={(e)=> dispatch('openRename')} on:rename={(a) => dispatch('rename', a)} contact={message} on:thisContact={(e)=> sendConversation(e.detail.contact)} />
        {/each}
    </div>
</div>

<style>

    .wrapper {
        width: 100%;
        max-width: 280px;
        box-sizing: border-box;
        background-color: #202020;
        border-right: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 3;
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

    h2 {
        margin: 0;
        color: #fff;
        font-size: 22px;

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
