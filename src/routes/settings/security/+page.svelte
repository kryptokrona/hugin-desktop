<script>
    import { fade } from "svelte/transition"
    import { messageWallet, user} from '$lib/stores/user.js'
    import Button from "$lib/components/buttons/Button.svelte"
    import { groups, misc } from '$lib/stores/user.js'

    let deleteAfter = $misc.deleteAfter
    let autoLogout = $user.idleLimit

    const setAutoDeleteAfter = (days) => {
        window.api.deleteMessageAfter(days)
    }

    const changeIdleLimit = () => {
        $user.idleLimit = autoLogout
        window.api.send('change-idle-time', autoLogout)
        window.api.successMessage('Idle time changed')
    } 

    </script>
    
    <h2>Security</h2>
    <div class="settings" in:fade>
        <p>Set the amount of days to preserve messages,
        <br>
        0 means preserve forever</p>
        <br>
   </div>
    <div class="autodelete">
        <input spellcheck="false" placeholder="Enter amount of days" bind:value="{deleteAfter}"/>
        <Button
        text="Set timeframe"
        disabled="{false}"
        on:click="{setAutoDeleteAfter(deleteAfter)}"
    />
    </div>

    <div class="settings" in:fade>
        <p>Choose how long time in seconds before auto logout.
        <br></p>
        <br>
   </div>
    <div class="autodelete">
        <input spellcheck="false" placeholder="Enter number of seconds" bind:value="{autoLogout}"/>
        <Button
        text="Change"
        disabled="{false}"
        on:click="{changeIdleLimit}"
    />
    </div>

    <style>
    
    .settings {
        margin-top: 2rem;
        border-radius: 10px;
        display: grid;
        transition: 0.25s ease-in-out all;
        grid-template-columns: repeat(1, 1fr);
        font-size: 14px;
    }

    .optimize {
        margin-left: -15px;
    }
    .autodelete {
        margin-left: -15px;
        margin-top: 2rem;
    }
    input {
    /* margin: 0 auto; */
    margin-left: 15px;
    max-width: 300px;
    width: 100%;
    height: 48px;
    padding: 0 15px;
    border-radius: 0.5rem;
    transition: 200ms ease-in-out;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    color: var(--text-color);
    font-size: 1.1rem;

    /* &:focus {
      outline: none;
    } */
    }
</style>