<div class="traffic draggable">
    <div on:click={() => window.api.send('close')} class="light" />
    <div on:click={() => window.api.send('min')} class="light" />
</div>

<style lang="scss">
    .traffic {
        position: fixed;
        top: 0;
        display: flex;
        width: 100%;
        gap: 5px;
        padding: 10px;
        z-index: 9999;
        height: 25px;
    }

    .light {
        width: 13px;
        height: 13px;
        border-radius: 20px;
        background-color: #454545;
        transition: 200ms ease-in-out;
        cursor: pointer;

        &:first-child {
            &:hover {
                background-color: var(--warn-color);
            }
        }

        &:last-child {
            &:hover {
                background-color: var(--alert-color);
            }
        }
    }
</style>
