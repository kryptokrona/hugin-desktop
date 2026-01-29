<script>
    import {notify, user} from '$lib/stores/user.js'
    import {fade} from 'svelte/transition'
    import GroupMessage from '$lib/components/chat/GroupMessage.svelte'
    import Button from '$lib/components/buttons/Button.svelte'
    import { t } from '$lib/utils/translation.js'

    const ONE_DAY_MS = 24 * 60 * 60 * 1000

    const recentUnread = $derived(
        $notify.unread.filter((notif) => {
            const ts = parseInt(notif.timestamp || notif.time || 0, 10)
            return ts > Date.now() - ONE_DAY_MS
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
                msgFrom="{notif.address ?? notif.hash ?? ''}"
                timestamp="{notif.time ?? notif.timestamp ?? 0}"
                hash="{notif.hash ?? ''}"
                file="{notif?.file}"
                room="{notif.type === 'room'}"
                admin="{false}"
                tip="{notif.tip}"
            />
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
  
</style>
