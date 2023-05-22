<script>
  //Global CSS
  import '$lib/theme/global.scss'

  //Tailwind
  import "../app.css";

  //Import window apis
  import '$lib/window-api/notifications.js'
  import '$lib/window-api/node.js'

  //Stores
  import { boards, groups, misc, notify, user, webRTC} from '$lib/stores/user.js'
  import {messages} from '$lib/stores/messages.js'
  import {onMount} from 'svelte'
  import IncomingCall from '$lib/components/webrtc/IncomingCall.svelte'
  import TrafficLights from '$lib/components/TrafficLights.svelte'
  import CallerMenu from '$lib/components/webrtc/CallerMenu.svelte'
  import PeerAudio from '$lib/components/webrtc/PeerAudio.svelte'
  import VideoGrid from '$lib/components/webrtc/VideoGrid.svelte'
  import {page} from '$app/stores'
  import Notification from '$lib/components/popups/Notification.svelte'
  import toast, {Toaster} from "svelte-french-toast";
  import {appUpdateState} from "$lib/components/updater/update-store.js";
  import Updater from "$lib/components/updater/Updater.svelte";

  let ready = false
  let incoming_call
  let showCallerMenu = false
  let new_messages = false
  let board_message_sound
  let new_message_sound

  const closePopup = () => {
    incoming_call = false
  }

  const endThisCall = () => {
    showCallerMenu = false
  }

  const answerIncomingCall = (call) => {
    $webRTC.call.unshift(call)
    let filter = $webRTC.incoming.filter((a) => a.chat !== call.chat)
    $webRTC.incoming = filter
    showCallerMenu = true
    incoming_call = false
    console.log('incoming clean', $webRTC.incoming)
    console.log('webRTC call ', $webRTC.call)
  }

  let startAnimation
  onMount(async () => {
    ready = true
    startAnimation = true
    setTimeout(() => {
      startAnimation = false
    }, 1001)

    window.process = {
      ...window.process,
      env: {DEBUG: undefined},
      nextTick: function () {
        return null
      },
    }
  })

  //TODO move this to (app)
  window.api.receive('contacts', async (my_contacts) => {
    $user.contacts = my_contacts
  })

  window.api.receive('switch-node', (data) => {
    $misc.node = data
    window.api.successMessage(`You are connected to ${data.node}`)
  })


  //APP UPDATER
  window.api.receive('updater', (data) => {
    data = data.toString()

    switch (data) {
      case 'checking':
        //Do something
        break
      case 'available':
        $appUpdateState.step = 1
        $appUpdateState.openPopup = true
        $appUpdateState.updateAvailable = true
        break
      case 'not-available':
        if ($page.url.pathname === '/settings') {
          $appUpdateState.step = 4
          $appUpdateState.openPopup = true
        }
        break
      case 'downloaded':
        $appUpdateState.openPopup = true
        $appUpdateState.step = 3
        break
      default:
      //Do nothing
    }
  })

  //APP UPDATE PROGRESS
  window.api.receive('update-progress', (progress) => {
    $appUpdateState.step = 2
    $appUpdateState.percentageDownloaded = progress.percent
    $appUpdateState.dataDownloaded = progress.transferred
    $appUpdateState.downloadSize = progress.total
    $appUpdateState.downloadSpeed = progress.bytesPerSecond
  })

  window.api.receive('login-success', () => {
    $user.loggedIn = true
  })

</script>


<main class="flex w-full h-full">
  <TrafficLights/>
  <Toaster/>

  {#if ready}

    {#if startAnimation}
      <div class="shine"></div>
    {/if}

    {#if ($user.loggedIn && $webRTC.call.length != 0) || $webRTC.incoming.length != 0}
      <VideoGrid/>

      <CallerMenu
        on:click="{endThisCall}"
        on:endCall="{endThisCall}"
        paused="{!showCallerMenu}"
      />

      {#each $webRTC.call as thiscall}
        {#if $webRTC.call.some((a) => a.peerAudio === true)}
          <PeerAudio audioCall="{thiscall}"/>
        {/if}
      {/each}

      {#each $webRTC.incoming as call}
        {#if incoming_call}
          <IncomingCall
            thisCall="{call}"
            on:click="{closePopup}"
            on:answerCall="{() => answerIncomingCall(call)}"
            paused="{!incoming_call}"
          />
        {/if}
      {/each}
    {/if}

    {#if $user.loggedIn && $notify.new.length > 0 && new_messages}
      <div class="notifs">
        {#each $notify.new as notif}
          <Notification on:hide="{removeNotification}" message="{notif}" error="{false}"/>
        {/each}
      </div>
    {/if}

    {#if $appUpdateState.openPopup}
      <Updater/>
    {/if}

    <slot/>

  {/if}

</main>

<style>


  .notifs {
    display: flex;
    flex-direction: column;
    gap: 10px;
    position: absolute;
    top: 20px;
    right: 20px;
    height: 100%;
  }
</style>
