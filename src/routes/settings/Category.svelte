<script>
    import { createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();
    import { page } from '$app/stores'
    import {fade} from 'svelte/transition'
    
    /** @type {{tab: any}} */
    let { tab } = $props();

    </script>
    
    <div
        class="card"
        in:fade|global
        out:fade|global
        onclick={bubble('click')}
        class:active="{tab.route === $page.url.pathname}"

    >
    
        <div class="content">
            <h4>{tab.name}</h4>
            <div class="text">
                <p>{tab.text}</p>
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
        background-color: var(--backgound-color);
        transition: 200ms ease-in-out;
        cursor: pointer;
        opacity: 0.9;
    
        &:hover {
            color: var(--text-color);
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
        background-color: var(--background-color);
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

    .active {
        background-color: var(--border-color);
        border-bottom: 1px solid transparent;
    }
    </style>
    