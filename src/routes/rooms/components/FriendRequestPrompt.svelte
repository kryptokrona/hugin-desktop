<script>
  import { createBubbler, self } from 'svelte/legacy'
  import { fade, fly } from 'svelte/transition'
  import FillButton from '$lib/components/buttons/FillButton.svelte'
  import { get_avatar } from '$lib/utils/hugin-utils.js'

  const bubble = createBubbler()

  /** @type {{user: any, onSend: any}} */
  let { user, onSend } = $props()

  const send = () => {
    onSend?.()
  }
</script>

<div
  in:fade|global={{ duration: 100 }}
  out:fade|global={{ duration: 80 }}
  class="backdrop"
  onclick={self(bubble('click'))}
>
  <div in:fly|global={{ y: 50 }} out:fly|global={{ y: -50 }} class="card">
    <img class="avatar" src="data:image/png;base64,{get_avatar(user?.address)}" alt="" />
    <h3>Send friend request?</h3>
    <p>{user?.name || 'Anon'}</p>
    <FillButton disabled={false} red={false} text="Send request" on:click|once={send} />
  </div>
</div>

<style lang="scss">
.backdrop {
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  background-color: var(--backdrop-color);
  z-index: 103;
  cursor: pointer;
}

.card {
  background-color: var(--backgound-color);
  border: 1px solid var(--card-border);
  padding: 20px;
  border-radius: 8px;
  width: 260px;
  min-height: 165px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  text-align: center;
}

h3 {
  margin: 0;
  color: var(--title-color);
}

p {
  margin: 0;
  color: var(--text-color);
  font-size: 13px;
}

.avatar {
  width: 40px;
  height: 40px;
}
</style>
