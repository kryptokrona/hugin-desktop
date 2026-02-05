<script>
    import { fade, fly } from "svelte/transition";
    import { misc } from '$lib/stores/user.js';
    import { prettyNumbers } from '$lib/utils/utils.js';
    import { onMount, onDestroy } from 'svelte';
    import toast from "svelte-5-french-toast";
    import FillButton from '$lib/components/buttons/FillButton.svelte';
    import Button from '$lib/components/buttons/Button.svelte';
    import { t } from '$lib/utils/translation.js';

    let address = $state('');
    let amount = $state('');
    let paymentId = $state('');
    let password = $state('');
    let showConfirm = $state(false);
    let sending = $state(false);
    let interval;

    onMount(async () => {
        await getBalance();
        interval = setInterval(getBalance, 1000 * 15);
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    async function getBalance() {
        $misc.balance = await window.api.getBalance();
    }

    const pasteAddress = async () => {
        const pastedAddress = await navigator.clipboard.readText();
        // Basic validation - XKR addresses are 99 chars, Hugin addresses are 163
        if (pastedAddress.length >= 95) {
            address = pastedAddress;
            toast.success('Address pasted', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
        } else {
            toast.error('Invalid address format', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
        }
    };

    const sendMaxAmount = () => {
        // Balance is in atomic units (100000 = 1 XKR), leave 0.1 XKR for fee
        const maxAmount = ($misc.balance[0] / 100000) - 0.1;
        amount = maxAmount > 0 ? maxAmount.toFixed(5) : '0';
    };

    const prepareSend = () => {
        if (!address || address.length < 95) {
            toast.error('Please enter a valid address', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
            return;
        }
        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter an amount', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
            return;
        }
        if (parseFloat(amount) * 100000 > $misc.balance[0]) {
            toast.error('Insufficient balance', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
            return;
        }
        showConfirm = true;
    };

    const confirmSend = async () => {
        const verified = await window.api.verifyPass(password);
        if (!verified) {
            toast.error('Wrong password', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
            return;
        }

        sending = true;
        const tx = {
            to: address.substring(0, 99), // Take only the wallet address part
            amount: Math.floor(parseFloat(amount) * 100000), // Convert to atomic units
            paymentID: paymentId || undefined
        };

        const result = await window.api.sendTransaction(tx);
        sending = false;

        if (result) {
            toast.success(`Sent ${amount} XKR successfully!`, {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
            // Reset form
            address = '';
            amount = '';
            paymentId = '';
            password = '';
            showConfirm = false;
        } else {
            toast.error('Transaction failed', {
                position: 'top-right',
                style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
            });
        }
    };

    const cancelSend = () => {
        showConfirm = false;
        password = '';
    };
</script>

<main in:fade|global="{{ duration: 250 }}">
    <div class="content">
        <div class="header">
            <h3 style="font-weight: 800">{t('send') || 'Send'}</h3>
        </div>

        <div class="balance-section">
            <div class="balance-card">
                <h4>{t('availableBalance') || 'Available Balance'}</h4>
                <p class="balance">{prettyNumbers($misc.balance[0])} <span class="ticker">XKR</span></p>
            </div>
            <div class="balance-card">
                <h4>{t('locked') || 'Locked'}</h4>
                <p class="balance">{prettyNumbers($misc.balance[1])} <span class="ticker">XKR</span></p>
            </div>
        </div>

        {#if !showConfirm}
            <div class="form" in:fly|local="{{ y: 20 }}">
                <div class="field">
                    <label for="address">{t('recipientAddress') || 'Recipient Address'}</label>
                    <div class="input-row">
                        <input 
                            id="address"
                            type="text" 
                            placeholder="SEKR..." 
                            bind:value={address} 
                        />
                        <Button text={t('paste') || "Paste"} disabled={false} on:click={pasteAddress} />
                    </div>
                </div>

                <div class="field">
                    <label for="paymentId">{t('paymentId') || 'Payment ID'} ({t('optional') || 'optional'})</label>
                    <input 
                        id="paymentId"
                        type="text" 
                        placeholder="64 character hex string..." 
                        bind:value={paymentId} 
                    />
                </div>

                <div class="field">
                    <label for="amount">{t('amount') || 'Amount'}</label>
                    <div class="input-row">
                        <input 
                            id="amount"
                            type="number" 
                            step="0.00001"
                            placeholder="0.00000" 
                            bind:value={amount} 
                        />
                        <Button text={t('max') || "Max"} disabled={false} on:click={sendMaxAmount} />
                    </div>
                </div>

                <div class="actions">
                    <FillButton 
                        text={t('send') || "Send"} 
                        enabled={address.length > 0 && parseFloat(amount) > 0}
                        on:click={prepareSend} 
                    />
                </div>
            </div>
        {:else}
            <div class="confirm" in:fly|local="{{ y: 20 }}">
                <h4>{t('confirmTransaction') || 'Confirm Transaction'}</h4>
                
                <div class="tx-details">
                    <div class="tx-row">
                        <span class="label">{t('to') || 'To'}:</span>
                        <span class="value address">{address.substring(0, 20)}...{address.substring(address.length - 10)}</span>
                    </div>
                    <div class="tx-row">
                        <span class="label">{t('amount') || 'Amount'}:</span>
                        <span class="value amount-value">{amount} XKR</span>
                    </div>
                    {#if paymentId}
                        <div class="tx-row">
                            <span class="label">{t('paymentId') || 'Payment ID'}:</span>
                            <span class="value">{paymentId.substring(0, 16)}...</span>
                        </div>
                    {/if}
                    <div class="tx-row">
                        <span class="label">{t('fee') || 'Fee'}:</span>
                        <span class="value">0.00001 XKR</span>
                    </div>
                </div>

                <div class="field">
                    <label for="password">{t('enterPassword') || 'Enter Password to Confirm'}</label>
                    <input 
                        id="password"
                        type="password" 
                        placeholder="Your wallet password" 
                        bind:value={password} 
                    />
                </div>

                <div class="actions">
                    <Button text={t('cancel') || "Cancel"} disabled={false} on:click={cancelSend} />
                    <FillButton 
                        text={sending ? (t('sending') || "Sending...") : (t('confirm') || "Confirm")} 
                        enabled={password.length > 0 && !sending}
                        on:click={confirmSend} 
                    />
                </div>
            </div>
        {/if}
    </div>
</main>

<style lang="scss">
    main {
        display: flex;
        margin-left: 85px;
        height: 100vh;
        overflow: hidden;
        z-index: 3;
        width: 100%;
    }

    .content {
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
        padding: 0 2rem;
    }

    .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        height: 80px;
        border-bottom: 1px solid var(--border-color);
        margin-bottom: 1.5rem;
    }

    .balance-section {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .balance-card {
        padding: 1.5rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background-color: var(--card-background);

        h4 {
            font-weight: 600;
            margin-bottom: 0.5rem;
            opacity: 0.7;
        }

        .balance {
            font-family: "Major Mono Display";
            font-size: 1.25rem;
            margin: 0;
            color: var(--primary-color);
        }

        .ticker {
            font-family: 'Montserrat';
            font-size: 0.875rem;
            opacity: 0.6;
        }
    }

    .form, .confirm {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .field {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        label {
            font-size: 0.875rem;
            font-weight: 600;
            opacity: 0.8;
        }

        input {
            padding: 12px 16px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background-color: var(--input-background);
            color: var(--text-color);
            font-size: 1rem;
            transition: border-color 200ms ease-in-out;

            &:focus {
                outline: none;
                border-color: var(--primary-color);
            }

            &::placeholder {
                opacity: 0.5;
            }

            &::-webkit-outer-spin-button,
            &::-webkit-inner-spin-button {
                -webkit-appearance: none;
                margin: 0;
            }
        }
    }

    .input-row {
        display: flex;
        gap: 0.5rem;

        input {
            flex: 1;
        }
    }

    .actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1rem;
    }

    .confirm {
        h4 {
            font-weight: 700;
            margin-bottom: 0.5rem;
        }
    }

    .tx-details {
        padding: 1.5rem;
        border: 1px solid var(--border-color);
        border-radius: 8px;
        background-color: var(--card-background);
    }

    .tx-row {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem 0;
        border-bottom: 1px solid var(--border-color);

        &:last-child {
            border-bottom: none;
        }

        .label {
            opacity: 0.7;
        }

        .value {
            font-weight: 600;
        }

        .address {
            font-family: monospace;
            font-size: 0.875rem;
        }

        .amount-value {
            color: var(--primary-color);
        }
    }
</style>
