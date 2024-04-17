<script>
    import { fade } from "svelte/transition"
    import { messageWallet, groups } from '$lib/stores/user.js'
    import { getBestApi, nodelist } from '$lib/stores/nodes.js'
    import Button from "$lib/components/buttons/Button.svelte"

    const optimizeMessages = () => {
        window.api.send('optimize')
    }

    let timeframeDays;

    const fetchHistory = async () => {
        let settings = {}
        settings.timeframe = timeframeDays
        settings.recommended_api = await getBestApi()
        if (settings.recommended_api === false) {
            window.api.errorMessage("Could not connect to Hugin API")
            return
        }
        settings.key = undefined
        window.api.fetchGroupHistory(settings)
    }

 

    </script>
    
    <h2>Messages</h2>
    <div class="optimize">
        <Button
        text="Optimize inputs"
        disabled="{$messageWallet.optimized}"
        red="{$messageWallet.optimized}"
        on:click="{optimizeMessages}"
    />
    </div>
    <div class="settings" in:fade>
        <p>Here you can manually create more xkr inputs to send messages with. 
            <br>
            This will lock some of your wallet balance during the process.</p>
            <br>
        <p>Your wallet will create more when you start to run out.
            <br>
             Press the button <b>Optimize inputs</b> to create more.</p>
        <br>
    </div>
    <h3>Message history</h3>
    <div class="history">
        <input spellcheck="false" type="number" placeholder="Enter amount of days" bind:value="{timeframeDays}"/>
        <Button
        text="Fetch history"
        disabled="{false}"
        on:click="{fetchHistory}"
    />
    </div>
       <div class="settings" in:fade>
        <p>Here you can set the timeframe of message history you want to fetch. 
            <br>
            This will fetch the data from a Hugin API.</p>
            <br>
        <p>This might cause added bandwith and storage usage.
        <br>
    </div>
    <style>

    h2 {
    margin-bottom: 19px;
    }
    .settings {
        margin-top: 2rem;
        border-radius: 10px;
        display: grid;
        transition: 0.25s ease-in-out all;
        grid-template-columns: repeat(1, 1fr);
        font-size: 14px;
    }

    .optimize {
        margin-left: -5px;
    }
    .history {
        margin-left: -5px;
        margin-top: 2rem;
    }
    input {
    /* margin: 0 auto; */
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