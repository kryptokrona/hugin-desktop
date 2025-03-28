<script>
    //To handle true and false, or in this case show and hide.
    import { fade, fly } from 'svelte/transition'
    import { user } from '$lib/stores/user.js'
    import FillButton from '$lib/components/buttons/FillButton.svelte'

    const blockContact = () => {
        window.api.send('block', $user.block)
        $user.block = false
    }
    </script>

    <div in:fade|global="{{ duration: 100 }}" out:fade|global="{{ duration: 80 }}" class="backdrop" onclick={() => $user.block = false}>
        <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="card">
            <h3 in:fade|global>Block {$user.block.name}?</h3>

                <FillButton
                    red={true}
                    text="Block"
                    disabled={false}
                    on:click={blockContact} />
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
    }

    h3 {
        margin: 0;
        color: var(--title-color);
    }

    .card {
        background-color: var(--backgound-color);
        border: 1px solid var(--card-border);
        padding: 20px;
        border-radius: 8px;
        width: 250px;
        height: 125px;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
    }

    p {
        font-size: 12px;
        color: white;
        font-family: 'Montserrat';
    }
    </style>
