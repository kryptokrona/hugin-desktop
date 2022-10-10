<script>
    import { fade } from 'svelte/transition'
    import { user, webRTC, notify } from "$lib/stores/user.js";
    import { get_avatar } from "$lib/utils/hugin-utils.js";

    let open;
    let changed;
    let audioDevices = $webRTC.devices.filter(a => a.kind == "audioinput")
    $: console.log('devices', $webRTC.devices);
  
    function invite(contact) {

        console.log('invite!', contact)
        let video = false
        //If video
        if ($webRTC.myVideo) {
            video = true
        }
        //Set group iniator state
        if ($webRTC.call.length >= 1) {
        $webRTC.initiator = true
        }
        //Reset invited status
        $webRTC.invited = false

        //Hide contact window
        open = false

        //Add callobject to store
        let call = {
            msg: "outgoing",
            out: true,
            chat: contact.chat,
            video: video
        };
        //Invite notification
        let invite = {
            message: `Inviting ${contact.name} to call`,
            name: "Invited",
            key: contact.chat,
            hash: Date.now()
        }
        //Update store
        $notify.success.push(invite)
        $notify.success = $notify.success
        $webRTC.call.unshift(call);
        
        //Start call
        window.api.startCall(contact.chat + contact.key, video);
    }
  
    const buttonGlow = () => {
      changed = true
      let timer = setTimeout(function() {
        changed = false
        open = false
      }, 1000);
    };
  
    $: if (open) window.api.checkSources()
  
  </script>
  
  <div style="display: flex; flex-direction: column">
    {#if open}
      <div in:fade class="list layered-shadow">
        {#each $user.contacts as user}
        <div class="card" on:click={(e) => invite(user)}>
            <img class="avatar"
                 src="data:image/png;base64,{get_avatar(user.chat)}" alt="">
            <p class="nickname">{user.name}</p><br>
          </div>   
        {/each}
      </div>
    {/if}
    <div class="share" class:border_rgb={changed} class:open={open} on:click={() => open = !open}>
      <h5>{changed ? 'Invited' : 'Invite'}</h5>
    </div>
  </div>
  
  <style lang="scss">

    .share {
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: var(--card-background);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      width: 120px;
      height: 38px;
      cursor: pointer;
      transition: 200ms;
  
      &:hover {
        background-color: var(--card-border);
      }
    }
  
    .open {
      border-color: var(--success-color);
    }
  
    .list {
      position: absolute;
      bottom: 85px;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      width: 250px;
      padding: 5px;
      background-color: var(--card-background);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
      z-index: 99999;
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
  </style>