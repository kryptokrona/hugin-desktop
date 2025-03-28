<script>
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	/** @type {{text?: string, disabled?: boolean, red?: boolean, hover?: boolean}} */
	let {
		text = 'Button',
		disabled = true,
		red = false,
		hover = false
	} = $props();
</script>

<button class:hover={hover} onclick={bubble('click')} disabled="{disabled}" class:red>{text}</button>

<style lang="scss">
button {
    box-sizing: border-box;
    padding: 10px 15px;
    border-radius: 5px;
    color: var(--title-color);
    border: 1px solid var(--border-color);
    background-color: var(--button-background);
    transition: 250ms ease-in-out;
    cursor: pointer;
    font-family: 'Montserrat';

    &:hover {
        opacity: 80%;
        border: 1px solid var(--success-color);
    }

    &:focus,
    :active {
        outline: none;
        border: 1px solid #404040;
    }

    &:active {
        background-color: var(--primary-color);
    }
}

.red {
    background-color: transparent;
    border-color: #c34169;
    color: #c34169;

    &:hover {
        background-color: #ce3264;
        border-color: #d54773;
        color: white;
    }
}
</style>
