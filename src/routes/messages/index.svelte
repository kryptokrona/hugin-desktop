<script>
    import {fade} from 'svelte/transition';
    import {onMount} from "svelte";
    import {messages} from "$lib/stores/messages.js";
    import ChatBubble from "/src/components/chat/ChatBubble.svelte";
    import ChatWindow from "/src/components/chat/ChatWindow.svelte";
    import ChatInput from "/src/components/chat/ChatInput.svelte";
    import ChatList from "/src/components/chat/ChatList.svelte";
    import AddChat from "/src/components/chat/AddChat.svelte";
    import {user} from "$lib/stores/user.js";
    let video
    let audio
    let from
    let active_contact
    let savedMsg = []
    let key
    let data
    let contact
    let codec
    let stream
    //Get messages on mount
    onMount(async () => {
        //Get messages and save to a variable.
        messages.set(await window.api.getMessages(res => {
            savedMsg = res
        }))
        //Log to verify
        console.log('FROM ELECTRON DB', savedMsg)
        //If we have an active chat in store we show that conversation
        if ($user.activeChat) {
            filterMsgs($user.activeChat)
        }
    })
    const filterMsgs = active => {
        from = active.from
        key = active.k
        active_contact = from + key;
        savedMsg = $messages.filter(x => x.from === from)
    }
    //Chat to add
    const handleAddChat = e => {
        //Add input to message arr
        messages.update(current => {
            return [e.detail, ...current]
        })
        //Prepare send function and filter
        filterMsgs(e.detail)
        console.log("Conversation to add", e.detail)
        //Close popup
        wantToAdd = false
    }
    //Update messages live if users keep chat mounted
    $: {
        window.api.receive('newMsg', data => {
            messages.update(() => data.messages)
            savedMsg = $messages
            console.log('UPDATED MSG', savedMsg)
        })
    }

    //Send message to store and DB
    const sendMsg = e => {
        let msg = e.detail.text
        console.log(e)
        window.api.sendMsg(msg, active_contact)
    }
    window.api.receive('start-call', async (data, contact) => {
        // console.log();
        // let data = 'audio'
        console.log('data', data);
        console.log('contact', contact);


        if (data) {
            console.log('getting media');

            // get video/voice stream
            navigator.mediaDevices.getUserMedia({
                video: false,
                audio: true
            }).then (gotMedia()).catch(() => {
                console.log('errrors');
                console.log('video', video);
                console.log('audio', audio);
                //   audio = 'audio';
                // gotMedia(contact, audio)
                //
                // gotMedia(contact, audio)
            })
        }
    })


    async function gotMedia (contact, stream, screen_stream=false) {
        console.log('GOTTTING MEDIAa')
        console.log('contacting this', contact);
        console.log('stream', stream);


        if (video) {
            var myvideo = document.getElementById('myvideo')


            if (screen_stream) {
                myvideo.srcObject = screen_stream;
                screen_stream.addTrack(stream.getAudioTracks()[0]);

                stream = screen_stream;
            } else {
                myvideo.srcObject = stream;
            }
            myvideo.play();
            //VIDEO SCREEN FADE IN
        } else {

        }


        let video_codecs = window.RTCRtpSender.getCapabilities('video');
        console.log('video codec', video_codecs);

        let custom_codecs = [];

        for (codec in video_codecs.codecs) {
            let this_codec = video_codecs.codecs[codec];
            if (this_codec.mimeType == "video/H264" && this_codec.sdpFmtpLine.substring(0, 5) == "level") {
                custom_codecs.push(this_codec);
            }

        }

        console.log('GOT MEDIA SENDING');

        window.api.gotMedia()
    }


    //Default value should be false to hide the AddChat form.
    let wantToAdd = false
    const openAdd = () => {
        wantToAdd = !wantToAdd
    }

    window.api.receive('sdp-data', async (data) => {
        console.log('sdp', data);
    })


    window.api.receive('call-incoming', async (msg ,contact, type) => {
        console.log('incoming call from', contact);
    })

</script>

{#if wantToAdd}
    <AddChat on:click={openAdd} on:addChat={e =>handleAddChat(e)}/>
{/if}

<main in:fade>
    <ChatList on:conversation={e => filterMsgs(e.detail)} on:click={openAdd} />
    <ChatWindow>
        {#each savedMsg as message}
            <ChatBubble handleType={message.sent} message={message.msg} ownMsg={message.sent} msgFrom={message.from}/>
        {/each}

        <ChatInput on:message={sendMsg}/>
    </ChatWindow>
</main>

<div class="myvideo"> </div>

<style>

    main {
        display: flex;
        margin-left: 85px;
        height: 100vh;
        overflow: hidden;
    }

    .button {
        background: magenta;
        color: white;
        position: center;
        top: 5px;
    }

</style>
