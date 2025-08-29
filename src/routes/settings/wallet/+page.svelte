
<script>
    import { run } from 'svelte/legacy';
    import { t } from '$lib/utils/translation.js';

import Button from "$lib/components/buttons/Button.svelte"
import RescanHeight from "$lib/components/popups/RescanHeight.svelte"
import Verify from "$lib/components/popups/Verify.svelte"
import { js_wallet } from "$lib/stores/wallet"
import { fade } from "svelte/transition"

let showKeys = $state(false)
let showMnemonic = $state(false)
let seedPhrase = $state('')
let privateSpendKey = $state('')
let privateViewKey = $state('')
let verify = $state(false)
let keys = false

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

const showInfo = async () => {
    verify = false
    if (keys) {
        getPrivateKeys()
        return
    }
    getMnemonic()
}

const prompt = (a) => {
    keys = a
    verify = true
}


run(() => {
    privateSpendKey
    privateViewKey
    showMnemonic
    showKeys
});


</script>

{#if $js_wallet.rescan}
    <RescanHeight />
 {/if}

 {#if verify}
    <Verify onOk={() => showInfo()} onClose={() => verify = false}/>
 {/if}
 
<h2>{t('wallet') || 'Wallet'}</h2>
<div class="rescan">
    <Button text={t('rescanWallet') || 'Rescan wallet'} enabled="{false}" disabled="{false}" on:click="{() => $js_wallet.rescan = true}" />
</div>

<div class="settings" in:fade|global>
    <div class="inner keys">
        <h3>{t('privateKeys') || 'Private keys'}</h3>
        <div class="button">
            <Button
                disabled="{false}"
                text={t('showPrivateKeys') || 'Show private keys'}
                on:click="{() => prompt(true)}"
            />
        </div>
        <br />
        {#if showKeys}
            <h6>{t('spendKey') || 'Spend Key'}</h6>
            <p style="user-select: text;" in:fade|global type="text">
                {privateSpendKey}
            </p>

            <h6>{t('viewKey') || 'View key'}</h6>
            <p style="user-select: text;" in:fade|global type="text">
                {privateViewKey}
            </p>
        {/if}
    </div>

    <div class="inner mnemonic">
        <h3>{t('mnemonicSeed') || 'Mnemonic seed'}</h3>
        <div class="button">
            <Button disabled="{false}" text={t('showMnemonicSeed') || 'Show mnemonic seed'} on:click="{() =>  prompt(false)}" />
        </div>
        <br />
        {#if showMnemonic}
            <h6>{t('mnemonicSeed') || 'Mnemonic seed'}</h6>
            <p style="user-select: text;" in:fade|global type="text">
                {seedPhrase}
            </p>
        {/if}
    </div>
    
</div>

<style lang="scss">
    
    p {
        font-family: 'Montserrat';
        color: var(--text-color);
        width: 100%;
        overflow-wrap: break-word;
        padding-right: 10px;
    }

    h2 {
        margin-bottom: 10px;
    }

    h3 {
        margin-bottom: 10px;
    }
    
    .keys p {
        font-family: 'Montserrat';
        color: var(--text-color);
        width: 100%;
        overflow-wrap: break-word;
        padding-right: 10px;
        height: 90px;
        background: var(--backgound-color);
        border-radius: 7px;
        overflow: hidden;
        padding: 10px;
        width: 250px;
        text-overflow: ellipsis;
        margin-left: -9px;
    }
    
    .mnemonic p {
        height: 190px;
        background:var(--backgound-color);
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
        margin-left: -5px;
    }

    .rescan {
        margin-left: -5px;
    }
    

 
    </style>