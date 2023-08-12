<script>
export let onClose
</script>

<div class="popup">
    <h2>Popup Content</h2>
    <p>This is the content of the popup.</p>
    <button on:click="{onClose}">Close</button>
</div>

<style>
.popup {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background-color: white;
    padding: 20px;
    border-radius: 5px;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.1);
}
</style>
