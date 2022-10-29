<script>
import { createEventDispatcher } from 'svelte'
import { fade } from 'svelte/transition'
import { get_avatar } from '$lib/utils/hugin-utils.js'
import { groups } from '$lib/stores/user.js'

export let group
const dispatch = createEventDispatcher()

const printThis = (contact) => {
    dispatch('print')
}
</script>

<div
    class="card"
    in:fade="{{ duration: 100 }}"
    out:fade="{{ duration: 100 }}"
    class:active="{$groups.thisGroup.key === group.key}"
    on:click="{(e) => printThis(group)}"
>
    {#if group.new}
        <div class:unread="{group.new}"></div>
    {/if}

    <img class="avatar" src="data:image/png;base64,{get_avatar(group.key)}" alt="" />
    <div class="content">
        <h4>{group.name}</h4>
        <div class="text">
            <p class="from">{group.nick}:</p>
            <p>{group.msg}</p>
        </div>
    </div>
</div>

<style lang="scss">
.card {
    display: flex;
    height: 80px;
    padding: 1rem;
    width: 100%;
    color: var(--title-color);
    border-bottom: 1px solid var(--border-color);
    transition: 200ms ease-in-out;
    cursor: pointer;
    opacity: 0.9;

    &:hover {
        color: white;
        opacity: 1;
        background-color: var(--card-border);
        border-bottom: 1px solid transparent;
    }
}

.avatar {
    margin-bottom: 10px;
    opacity: 0.92;
    cursor: pointer;
}

.content {
    margin-left: 10px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    overflow: hidden;
}

h4 {
    margin: 0;
    white-space: nowrap;
    max-width: 180px;
    overflow: hidden;
    font-family: 'Montserrat', sans-serif;
    text-overflow: ellipsis;
    font-weight: bold;
}

p {
    margin: 5px 0 0 0;
    white-space: nowrap;
    max-width: 200px;
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    font-family: 'Montserrat', sans-serif;
}

.unread {
    animation: border_rgb 30s infinite;
    background-color: white;
    width: 5px;
    height: 2px;
    border-radius: 30%;
    left: 340px;
    margin-top: 25px;
    position: absolute;
}

.active {
    background-color: var(--border-color);
    border-bottom: 1px solid transparent;
}

.from {
    font-weight: bold;
    display: inline-table;
}

.text {
    display: flex;
    gap: 4px;
}
</style>
