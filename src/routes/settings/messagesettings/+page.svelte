<script>
    import { fade } from "svelte/transition"
    import { messageWallet } from '$lib/stores/user.js'
    import Button from "$lib/components/buttons/Button.svelte"

    const optimizeMessages = () => {
        window.api.send('optimize')
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
             Press the button <b>Optimize</b> to create more.</p>
        <br>
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
        margin-left: -2.5%;
    }

    </style>