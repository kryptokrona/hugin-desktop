<script>
    import {notify, rooms, user} from '$lib/stores/user.js'
    import {fade} from 'svelte/transition'
    import GroupMessage from '$lib/components/chat/GroupMessage.svelte'
    import Button from '$lib/components/buttons/Button.svelte'
    import { t } from '$lib/utils/translation.js'
    import { goto } from '$app/navigation'

    function getNotifKind(notif) {
      if (notif.type === 'feed') return 'feed'
      if (notif.type === 'room' || notif.room) return 'room'
      return 'dm'
    }

    function getLocationLabel(notif) {
      const kind = getNotifKind(notif)

      if (kind === 'feed') return 'in feed'
      if (kind === 'room') return `in ${$rooms.roomArray.find(r => r.key === notif.group).name || 'room'}`
      return 'in DM'
    }

    function onNotificationClick(notif) {
      const kind = getNotifKind(notif)

      if (kind === 'feed') {
        goto('/feed')
        return
      }

      if (kind === 'room') {
        $rooms.openingLink = true;
        goto(`/rooms`);
        setTimeout(() => {
          goto(`/rooms?room=${notif.group}`)
        }, 500)
        return
      }

      // DM
      // const contactId = (notif.address || '') + (notif.key || '')
      // active.chat, key: active.key, name: active.name
      goto(`/messages?chat=${notif.chat}&name=${notif.name}`)
    }


    const ONE_DAY_MS = 24 * 60 * 60 * 1000 * 7
    const recentUnread = $derived(
        $notify.unread.filter((notif) => {
            if (notif.message === 'Joined room') return false
            const ts = parseInt(notif.timestamp || notif.time || 0, 10)
            return ts > Date.now() - ONE_DAY_MS
        }).sort((a, b) => {
            const tsA = parseInt(a.timestamp || a.time || 0, 10)
            const tsB = parseInt(b.timestamp || b.time || 0, 10)
            return tsB - tsA // newest first (descending order)
        })
    )

    function clear() {
        $notify.notifications = []
        $notify.unread = []
        $notify = $notify
    }
</script>

<div in:fade|global class="wrapper">
    <div class="header">
        <h3 style="font-weight: 800">{t('notifications') || 'Notifications'}</h3>
        <div style="display: flex; align-items: center; gap: 1rem">
            <div style="dispay: block; margin-right: -26px">
                <Button text={t('clear') || 'Clear'} disabled={false} on:click={() => clear()}/>
            </div>
        </div>
    </div>
    <div class="notifs">
      {#each recentUnread as notif}
        <div
          class="notif-wrapper"
          role="button"
          tabindex="0"
          on:click={() => onNotificationClick(notif)}
        >
          <GroupMessage
            rtc={true}
            ReactTo="{(e) => console.log('react to')}"
            ReplyTo="{(e) => console.log('reply to')}"
            DeleteMsg="{(e) => console.log('delete to')}"
            message="{notif}"
            reply="{notif.reply ?? ''}"
            msg="{notif.message ?? notif.msg ?? ''}"
            myMsg="{notif.sent ?? false}"
            group="{notif.grp ?? notif.group ?? ''}"
            nickname="{notif.name ?? notif.nickname ?? ''}"
            msgFrom="{notif.address ?? notif.chat ?? ''}"
            timestamp="{parseInt(notif.timestamp)}"
            hash="{notif.hash ?? ''}"
            file="{notif?.file}"
            room="{getNotifKind(notif) === 'room'}"
            admin="{false}"
            tip="{notif.tip}"
            contextLabel="{getLocationLabel(notif)}"
          />
        </div>
      {/each}

    </div>
</div>

<style lang="scss">
  .wrapper {
    grid-column: span 6 / span 6;
    height: calc(100% - 70px);
    border-right: 1px solid var(--border-color);

    .header {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
      padding: 0.75rem 2rem;
      height: 50px;
    }

    .notifs {
      height: 55%;
      width: 100%;
      overflow: scroll;
      box-sizing: border-box;
      --scrollbarBG: transparent;
      --thumbBG: #3337;
      scrollbar-width: thin;
      scrollbar-color: var(--thumbBG) var(--scrollbarBG);
      margin-bottom: 20px;
    }

    .notifs::-webkit-scrollbar {
      width: 8px;
    }

    .notifs::-webkit-scrollbar-track {
      background: var(--scrollbarBG);
    }

    .notifs::-webkit-scrollbar-thumb {
      background-color: var(--thumbBG);
      border-radius: 3px;
      border: 3px solid var(--scrollbarBG);
    }
  }

  .notx {
    display: flex;
    height: 80vh;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }

  .sent {
    color: var(--success-color) !important;
  }

  .tx {
    color: var(--warn-color);
    display: flex;
  }

  .notif-wrapper {
    cursor: pointer;
  }

  .notif-wrapper:hover {
    background: var(--hover-bg, rgba(255,255,255,0.03));
  }
  
</style>
