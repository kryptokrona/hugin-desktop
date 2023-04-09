
<script>
import Button from "$lib/components/buttons/Button.svelte"
import RescanHeight from "$lib/components/popups/RescanHeight.svelte"
import { js_wallet } from "$lib/stores/wallet"
import { fade } from "svelte/transition"

let showKeys = false
let showMnemonic = false
let seedPhrase = ''
let privateSpendKey = ''
let privateViewKey = ''

const getMnemonic = async () => {
    let mnemonic = await window.api.getMnemonic()
    seedPhrase = mnemonic[0]
    showMnemonic = true
}

const getPrivateKeys = async () => {
    let keys = await window.api.getPrivateKeys()
    privateSpendKey = keys[0]
    privateViewKey = keys[1]
    showKeys = true
}


$: {
    privateSpendKey
    privateViewKey
    showMnemonic
    showKeys
}


</script>

{#if $js_wallet.rescan}
    <RescanHeight />
 {/if}
 
<h2>Wallet</h2>
<div class="rescan">
    <Button text="Rescan wallet" enabled="{false}" disabled="{false}" on:click="{() => $js_wallet.rescan = true}" />
</div>

<div class="settings" in:fade>
    <div class="inner keys">
        <h3>Private keys</h3>
        <div class="button">
            <Button
                disabled="{false}"
                text="Show private keys"
                on:click="{getPrivateKeys}"
            />
        </div>
        <br />
        {#if showKeys}
            <h6>Spend Key</h6>
            <p style="user-select: text;" in:fade type="text">
                {privateSpendKey}
            </p>

            <h6>View key</h6>
            <p style="user-select: text;" in:fade type="text">
                {privateViewKey}
            </p>
        {/if}
    </div>

    <div class="inner mnemonic">
        <h3>Mnemonic seed</h3>
        <div class="button">
            <Button disabled="{false}" text="Show mnemonic seed" on:click="{getMnemonic}" />
        </div>
        <br />
        {#if showMnemonic}
            <h6>Mnemonic seed</h6>
            <p style="user-select: text;" in:fade type="text">
                {seedPhrase}
            </p>
        {/if}
    </div>
    
</div>

<style lang="scss">
    
    p {
        font-family: 'Montserrat';
        color: white;
        width: 100%;
        overflow-wrap: break-word;
        padding-right: 10px;
    }
    
    .keys p {
        font-family: 'Montserrat';
        color: white;
        width: 100%;
        overflow-wrap: break-word;
        padding-right: 10px;
        height: 90px;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 7px;
        overflow: hidden;
        padding: 10px;
        width: 250px;
        text-overflow: ellipsis;
        margin-left: -9px;
    }
    
    .mnemonic p {
        height: 190px;
        background: rgba(0, 0, 0, 0.25);
        border-radius: 7px;
        overflow: hidden;
        padding: 10px;
        width: 250px;
        padding-right: 10px;
        margin-left: -9px;
    }
    
    .settings {
        margin-top: 2rem;
        border-radius: 10px;
        display: grid;
        transition: 0.25s ease-in-out all;
        grid-template-columns: repeat(2, 1fr);
    }
    
    
    .button {
        margin-left: -15px;
    }

    .rescan {
        margin-left: -15px;
    }
    

 
    </style>