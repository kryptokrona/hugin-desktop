<script>
  import {misc, userAvatar} from '$lib/stores/user.js'
  import {goto} from '$app/navigation'
  import GroupIcon from '$lib/components/icons/GroupIcon.svelte'
  import MessageIcon from '$lib/components/icons/MessageIcon.svelte'
  import SettingsIcon from '$lib/components/icons/SettingsIcon.svelte'
  import XkrLogo from '$lib/components/icons/XkrLogo.svelte'
  import {openURL} from '$lib/utils/utils.js'
  import {page} from '$app/stores'
  import {layoutState} from '$lib/stores/layout-state.js'
  import AlphaIcon from '$lib/components/icons/AlphaIcon.svelte'

  let sync
  let avatar

  $: sync = $misc.syncState

  userAvatar.subscribe((output) => {
    avatar = output
  })

  $: avatar

  const messagesRouteAndMenu = () => {
    if ($page.url.pathname === '/messages') {
      $layoutState.hideChatList = !$layoutState.hideChatList
    } else {
      setTimeout(() => {
        $layoutState.hideChatList = false
      }, 300)
      goto('/messages')
    }
  }

  const groupRouteAndMenu = () => {
    if ($page.url.pathname === '/groups') {
      $layoutState.hideGroupList = !$layoutState.hideGroupList
    } else {
      goto('/groups')
    }
  }
</script>

<div class="h-full w-[85px] flex flex-col justify-between items-center border-r border-neutral-800 pb-4 pt-12">
  <div class="flex flex-col items-center justify-center gap-5 no-drag">
    {#if avatar}
      <div class="w-10 h-10 flex justify-center items-center rounded-md hover:bg-neutral-700 cursor-pointer transition"
           on:click="{() => goto('/dashboard')}">
        <img height="55" width="55" src="data:image/png;base64,{avatar}" alt=""/>
      </div>
    {/if}
    <div class="w-10 h-10 flex justify-center items-center rounded-md hover:bg-neutral-700 cursor-pointer transition"
         on:click="{messagesRouteAndMenu}">
      <MessageIcon/>
    </div>
    <div class="w-10 h-10 flex justify-center items-center rounded-md hover:bg-neutral-700 cursor-pointer transition"
         on:click="{groupRouteAndMenu}">
      <GroupIcon/>
    </div>
  </div>
  <div class="draggable"></div>
  <div class="flex flex-col items-center justify-center gap-5 no-drag">
    <div class="w-10 h-10 flex justify-center items-center rounded-md hover:bg-neutral-700 cursor-pointer transition" on:click="{() => goto('/settings/node')}">
      <SettingsIcon/>
    </div>
    <XkrLogo grey="{true}"/>
    <div
      on:click="{() => openURL('https://github.com/kryptokrona/hugin-desktop/issues/new/choose')}">
      <AlphaIcon/>
    </div>
  </div>
</div>