<script>
    import { createBubbler } from 'svelte/legacy';

    const bubble = createBubbler();

    /** @type {{bigtext?: string, text?: string}} */
    let { bigtext = "", text = "" } = $props();

</script>

    <div class="card" onclick={bubble('click')}>
        <h4>{bigtext}</h4>
        <p>{text}</p>
    </div>

    <style lang="scss">
        .card {
            height: 100px;
            width: 230px;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            text-align: center;
            padding: 1rem;
            background-color: var(--card-background);
            border: 1pxsolidvar(--card-border);
            border-radius: 0.4rem;
            grid-column: span 3/span 3;
            cursor: pointer;
            display: flex;
            justify-content: flex-end;
        p {
            margin: 0;
        }

        &:hover {
            opacity: 80%;
        }
    }
    </style>