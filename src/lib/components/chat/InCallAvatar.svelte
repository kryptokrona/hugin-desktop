<script>
import { get_avatar } from "$lib/utils/hugin-utils"
import { audioLevel, rooms, user } from '$lib/stores/user.js'
export let call
let isTalking = false
let me = call.address === $user.myAddress
    
$: if ($audioLevel.call.some((a) => a.activeVoice == true && a.chat === call.address)) {
    isTalking = true
} else {
    isTalking = false
}

const check_avatar = (address) => {
    const found = $rooms.avatars.find(a => a.address === address)
    if (found) return found.avatar
    else return false
}

</script>

<div class="img" class:talking={isTalking || (me && $audioLevel.meTalking)}>
    {#await check_avatar(call.address)}
    {:then avatar}
     {#if avatar}
        <img
            class="custom-avatar"
            src="{avatar}"
            alt=""
        />
    {:else}
        <img class="avatar" src="data:image/png;base64,{get_avatar(call.address)}" alt="" />
    {/if}
    {/await}
</div>

<style lang="scss">
      .talking {
        border-radius: 5px;
        border: 1px solid var(--success-color) !important;
        transition: 200ms ease-in-out;
    }

    .img {
        border: 1px solid transparent;
        border-radius: 5px;
        height: 44px;
        margin-right: 2px;

    }

    .custom-avatar {
        height: 40px;
        width:  40px;
        border-radius: 15px;
        padding: 10px;
    }
    
</style>

