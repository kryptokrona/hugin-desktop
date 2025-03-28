<script>
import { fade } from 'svelte/transition'
import { user } from '$lib/stores/user.js'

let open = $state()
let copied = $state()

function copyThis(copy) {
    navigator.clipboard.writeText(copy)
    buttonGlow()
}

const buttonGlow = () => {
    copied = true
    setTimeout(() => {
        copied = false
        open = false
    }, 1000)
}
</script>

<div style="display: flex; flex-direction: column">
    <div class="share" class:border_rgb="{copied}" class:open onclick={() => (open = !open)}>
        <h5>{copied ? 'Copied' : 'Address'}</h5>
    </div>
    {#if open}
        <div in:fade|global class="list layered-shadow">
            <div onclick={() => copyThis($user.myAddress)}>
                <h5>Payment</h5>
            </div>
            <div onclick={() => copyThis($user.huginAddress)}>
                <h5>Hugin</h5>
            </div>
        </div>
    {/if}
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
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    width: 120px;
    padding: 5px;
    margin-top: 45px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;

    div {
        text-align: center;
        border-radius: 5px;
        padding: 10px;
        cursor: pointer;

        &:hover {
            background-color: var(--card-border);
        }
    }
}
</style>
