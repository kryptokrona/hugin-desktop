<script>
    export let text = 'Button'
    export let disabled = true
    export let red = false

</script>

<button
        on:click
        disabled={disabled}
        class:red
>{text}</button>

<style lang="scss">

  button {
    box-sizing: border-box;
    padding: 10px 15px;
    border-radius: 5px;
    color: var(--title-color);
    border: 1px solid var(--button-border);
    background-color: var(--button-background);
    transition: 250ms ease-in-out;
    cursor: pointer;
    font-family: "Montserrat";

    &:hover {
      opacity: 80%;
    }

    &:focus, :active {
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