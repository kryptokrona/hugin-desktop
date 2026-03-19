<script>
import { friendRequests } from '$lib/stores/user.js'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import { fly } from 'svelte/transition'
import { cubicOut } from 'svelte/easing'

let { onClose } = $props()

const accept = (address) => {
    window.api.acceptFriendRequest(address)
}

const reject = (address) => {
    window.api.rejectFriendRequest(address)
}

const truncate = (str, len = 12) => {
    if (!str) return ''
    return str.length > len ? str.substring(0, len) + '...' : str
}
</script>

<div class="overlay" onclick={onClose} role="presentation">
    <div
        class="popup"
        onclick={(e) => e.stopPropagation()}
        in:fly={{ y: -10, duration: 200, easing: cubicOut }}
        role="dialog"
    >
        <div class="popup-header">
            <h3>Friend Requests</h3>
            <button class="close-btn" onclick={onClose}>&times;</button>
        </div>
        {#if $friendRequests.length === 0}
            <p class="empty">No pending requests</p>
        {:else}
            <div class="request-list">
                {#each $friendRequests as req}
                    <div class="request-item">
                        <img class="avatar" src="data:image/png;base64,{get_avatar(req.address)}" alt="" />
                        <div class="request-info">
                            <span class="req-name">{req.name || 'Anon'}</span>
                            <span class="req-addr">{truncate(req.address, 20)}</span>
                            {#if req.room_name}
                                <span class="req-room">from: {req.room_name}</span>
                            {/if}
                        </div>
                        <div class="actions">
                            <button class="accept-btn" style="cursor: pointer;" onclick={() => accept(req.address)}>Accept</button>
                            <button class="reject-btn" style="cursor: pointer;" onclick={() => reject(req.address)}>Reject</button>
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    </div>
</div>

<style lang="scss">
.overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.4);
    z-index: 10000;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding-top: 80px;
}

.popup {
    background: var(--card-background, #1a1a2e);
    border: 1px solid var(--border-color, rgba(255,255,255,0.1));
    border-radius: 10px;
    width: 360px;
    max-height: 420px;
    overflow-y: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.popup-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px 10px;
    border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));

    h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color, #eee);
    }
}

.close-btn {
    background: none;
    border: none;
    color: var(--text-color, #999);
    font-size: 20px;
    cursor: pointer;
    padding: 0 4px;
    line-height: 1;

    &:hover {
        color: #fff;
    }
}

.empty {
    text-align: center;
    color: var(--text-color, #888);
    padding: 24px;
    font-size: 13px;
}

.request-list {
    display: flex;
    flex-direction: column;
    padding: 8px 0;
}

.request-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 18px;
    transition: background 150ms;

    &:hover {
        background: rgba(255, 255, 255, 0.04);
    }
}

.avatar {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    flex-shrink: 0;
}

.request-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.req-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-color, #eee);
}

.req-addr {
    font-size: 11px;
    color: var(--text-color, #777);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.req-room {
    font-size: 10px;
    color: var(--accent-color, #7c5cbf);
    font-style: italic;
    margin-top: 1px;
}

.actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

.accept-btn, .reject-btn {
    border: none;
    border-radius: 6px;
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
}

.accept-btn {
    background: var(--success-color, #2ecc71);
    color: #fff;

    &:hover {
        filter: brightness(1.1);
    }
}

.reject-btn {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-color, #ccc);

    &:hover {
        background: rgba(255, 60, 60, 0.25);
        color: #ff6b6b;
    }
}
</style>
