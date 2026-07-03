<script>
import { user } from '$lib/stores/user.js'
import { t } from '$lib/utils/translation.js'
import QRIcon from '$lib/components/icons/QRIcon.svelte'
import WalletIcon from '$lib/components/icons/WalletIcon.svelte'

let { onShowQR } = $props();

let hovered = $state(false)
let copied = $state(false)

// SEKR…1337 style clip — take enough of the head to keep the prefix
// recognizable and the tail to look like a signature.
let address = $derived($user.myAddress || '')
let clipped = $derived(
    address.length > 10
        ? `${address.slice(0, 4)}…${address.slice(-4)}`
        : address
)

function copy() {
    if (!address) return
    navigator.clipboard.writeText(address)
    copied = true
    setTimeout(() => { copied = false }, 1200)
}

function showQR(e) {
    e.stopPropagation()
    onShowQR(address)
}
</script>

<!--
    Single pill that:
      - collapsed: mirrors Button.svelte's default look ("Address" + wallet icon)
      - hover:     expands to reveal `SEKR…1337` + a QR button beside it
      - copied:    green glow feedback for ~1.2s

    All animation is CSS-only (width, opacity, translate) so the DOM never
    swaps and there's no layout thrash between states.
-->
<button
    type="button"
    class="share"
    class:hovered
    class:copied
    onmouseenter={() => (hovered = true)}
    onmouseleave={() => (hovered = false)}
    onclick={copy}
    aria-label={copied ? (t('copied') || 'Copied') : (t('address') || 'Address')}
>
    <span class="icon">
        <WalletIcon size={16} />
    </span>

    <span class="labels">
        <span class="label collapsed">
            {copied ? (t('copied') || 'Copied') : (t('address') || 'Address')}
        </span>
        <span class="label expanded" aria-hidden="true">
            {copied ? (t('copied') || 'Copied') : clipped}
        </span>
    </span>

    <span
        class="qr"
        role="button"
        tabindex="0"
        aria-label="Show QR"
        onclick={showQR}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && showQR(e)}
    >
        <QRIcon size={16} />
    </span>

    <span class="shimmer" aria-hidden="true"></span>
</button>

<style lang="scss">
    // The collapsed pill mirrors Button.svelte's default look — same border,
    // background, radius, padding rhythm — so it slots into the dashboard
    // header without looking like a different design system. The extras
    // (shimmer, glow, hover expansion) are additive polish.
    .share {
        position: relative;
        overflow: hidden;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        gap: 0.55rem;
        height: 40px;
        width: 130px;
        padding: 0 14px;
        border: 1px solid var(--border-color);
        border-radius: 6px;
        background-color: var(--button-background);
        color: var(--title-color);
        font-family: 'Montserrat', sans-serif;
        font-size: 0.85rem;
        cursor: pointer;
        // A single easing curve everywhere so the width, colors, and
        // internal-element transforms all glide in lockstep. `cubic-bezier`
        // with an overshoot at the end gives it the "cool as hell" snap.
        transition:
            width 380ms cubic-bezier(0.22, 1, 0.36, 1),
            border-color 250ms ease,
            background-color 250ms ease,
            box-shadow 250ms ease,
            transform 250ms ease;

        &:hover {
            border-color: var(--success-color);
            box-shadow: 0 0 0 1px var(--success-color-transparent, transparent),
                        0 8px 24px -12px rgba(0, 0, 0, 0.35);
        }

        &:active {
            transform: scale(0.98);
        }

        &.hovered {
            width: 240px;
        }

        &.copied {
            border-color: var(--success-color);
            box-shadow: 0 0 0 2px var(--success-color), 0 0 20px -4px var(--success-color);
        }
    }

    .icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 18px;
        opacity: 0.85;
        // Very small rotate on hover — a wink, not a spin.
        transition: transform 380ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease;
    }
    .share.hovered .icon {
        opacity: 1;
        transform: rotate(-8deg);
    }

    // The two labels live stacked in the same box — one crossfades out as
    // the other crossfades in. Using a fixed height + absolute positioning
    // keeps the pill's vertical rhythm perfectly stable during the swap.
    .labels {
        position: relative;
        flex: 1 1 auto;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        overflow: hidden;
    }
    .label {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        letter-spacing: 0.02em;
        transition:
            opacity 260ms ease,
            transform 380ms cubic-bezier(0.22, 1, 0.36, 1);
    }
    .label.collapsed {
        opacity: 1;
        transform: translateY(0);
    }
    .label.expanded {
        opacity: 0;
        transform: translateY(6px);
        font-family: 'Fira Mono', ui-monospace, monospace;
        font-size: 0.8rem;
    }
    .share.hovered .label.collapsed {
        opacity: 0;
        transform: translateY(-6px);
    }
    .share.hovered .label.expanded {
        opacity: 1;
        transform: translateY(0);
    }

    // QR slot slides in from the right with the width expansion. When
    // collapsed it's translated off-canvas + zero-opacity + zero-width so
    // it doesn't push the layout.
    .qr {
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        width: 0;
        opacity: 0;
        transform: translateX(12px);
        border-radius: 4px;
        cursor: pointer;
        // Snappier than the width so the QR "catches up" once the pill has
        // finished expanding.
        transition:
            width 320ms cubic-bezier(0.22, 1, 0.36, 1) 60ms,
            opacity 220ms ease 120ms,
            transform 320ms cubic-bezier(0.22, 1, 0.36, 1) 60ms,
            background-color 200ms ease;
    }
    .qr:hover {
        background-color: var(--card-border);
    }
    .share.hovered .qr {
        width: 24px;
        opacity: 1;
        transform: translateX(0);
    }

    // Subtle diagonal shimmer that sweeps across the pill exactly once when
    // it expands. Purely decorative — kicks off via the .hovered animation
    // class and finishes on its own.
    .shimmer {
        position: absolute;
        inset: 0;
        pointer-events: none;
        background: linear-gradient(
            110deg,
            transparent 0%,
            transparent 45%,
            rgba(255, 255, 255, 0.08) 50%,
            transparent 55%,
            transparent 100%
        );
        background-size: 200% 100%;
        background-position: 100% 0;
        opacity: 0;
        transition: opacity 200ms ease;
    }
    .share.hovered .shimmer {
        opacity: 1;
        animation: shimmer-sweep 900ms cubic-bezier(0.22, 1, 0.36, 1) both;
    }

    @keyframes shimmer-sweep {
        0%   { background-position: 100% 0; }
        100% { background-position: -100% 0; }
    }
</style>
