<script>
    //Export variables with default values
    export let url
    export let text = 'Button'

</script>

<!-- The button in HTML with variables-->
<a href={url} on:click >{text}</a>


<style>
    /* Button style */
    a {
        background-color: transparent;
        color: white;
        border-radius: 5px;
        border: 1px solid white;
        padding: 8px 15px;
        text-decoration: none;
        transition: 250ms ease-in-out;
        cursor: pointer;
        margin-top: 10px;
    }

    a:hover {
        background-color: white;
        color: #1d1d1d;
    }

</style>
