<script>
import { get_avatar } from "$lib/utils/hugin-utils"
import { audioLevel } from '$lib/stores/user.js'
export let call
let isTalking = false

$: if ($audioLevel.call.some((a) => a.activeVoice == true && a.chat === call.address)) {
    isTalking = true
} else {
    isTalking = false
}

</script>

<div class:talking={isTalking}>
<img class="avatar" src="data:image/png;base64,{get_avatar(call.address)}" alt="" />
</div>

<style lang="scss">
      .talking {
        border-radius: 15px;
        border: 1px solid var(--success-color);
    }
</style>

