<script>
    import { run, createBubbler, self } from 'svelte/legacy';

    const bubble = createBubbler();
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import { t } from '$lib/utils/translation.js'


let enableButton = $state(false)
let nickname = $state('')
let addr = $state()
let pubkey = $state()
let text = $state('')
let myAddress
let avatar = $state()
let step = $state(1)

let {
    AddChat
} = $props()

run(() => {
    if (text.length > 98) {
        // spilt input to addr and pubkey
        addr = text.substring(0, 99)
        pubkey = text.substring(99, 163)
        text = addr

        avatar = get_avatar(addr)
    }
});

// Dispatch the inputted data
const handleAdd = () => {
    AddChat({
        name: nickname,
        chat: addr,
        key: pubkey,
        msg: t('newFriendAdded') || 'New friend added!',
        sent: true,
        timestamp: Date.now().toString(),
    })
    close()
}

const close = () => {
    open = false
    text = ''
    nickname = ''
    step = 1
}

run(() => {
    //Handle state of the button, disabled by default, when enabled RGB class will be added.
    enableButton = !!(addr && pubkey)

    ///Empty fields if input is empty
    if (!text) {
        addr = ''
        pubkey = ''
    }
});

const next = () => {
    step = 2
}

run(() => {
        step
    });
</script>

<div onclick={self(bubble('click'))} in:fade|global="{{ duration: 70 }}" out:fade|global="{{ duration: 100 }}" class="backdrop">
    <div in:fly|global="{{ y: 20 }}" out:fade|global class="field">
        {#if step === 1}
            {#if pubkey}
                <img
                    in:fade|global
                    style="margin-left: -5px"
                    class="avatar"
                    src="data:image/png;base64,{avatar}"
                    alt=""
                />
            {/if}
            <input
                out:fade|global
                placeholder={t('enterHuginAddress') || 'Enter Hugin address'}
                type="text"
                spellcheck="false"
                autocomplete="false"
                bind:value="{text}"
            />
            <div style="width: 100px; margin-left: 10px">
                <FillButton
                    disabled="{!enableButton}"
                    enabled="{enableButton && step == 1}"
                    on:click="{next}"
                    text={t('next') || 'Next'}
                />
            </div>
        {/if}
    </div>

    {#if pubkey && step === 2}
        <div in:fade|global class="field">
            {#if pubkey}
                <img
                    style="margin-left: -5px"
                    class="avatar"
                    src="data:image/png;base64,{avatar}"
                    alt=""
                />
            {/if}
            <input
                in:fade|global
                placeholder={t('enterNickname') || 'Enter a nickname'}
                type="text"
                spellcheck="false"
                autocomplete="false"
                bind:value="{nickname}"
            />
            <div style="width: 100px; margin-left: 10px">
                <FillButton
                    disabled="{!enableButton}"
                    enabled="{step == 2 && nickname.length}"
                    on:click="{handleAdd}"
                    text={t('add') || 'Add'}
                />
            </div>
        </div>
    {/if}
</div>

<style lang="scss">
.field {
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: absolute;
    padding: 0 10px;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;

    .btn {
        color: var(--text-color);
        height: 100%;
        border-left: 1px solid var(--card-border);
        cursor: pointer;

        &:hover {
            background-color: var(--card-border);
        }
    }
}

input {
    margin: 0 auto;
    width: 300px;
    height: 50px;
    transition: 200ms ease-in-out;
    color: var(--text-color);
    background-color: transparent;
    border: none;
    font-size: 0.9rem;

    &:focus {
        outline: none;
    }
}

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
    backdrop-filter: blur(8px);
    z-index: 103;
    border-radius: 15px;
}

.hide {
    dislay: none;
}
</style>
