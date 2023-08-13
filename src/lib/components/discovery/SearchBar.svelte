<script>
import { goto } from '$app/navigation'
import { search } from '$lib/stores/search.js'
let searchTerm = ''

function handleSearch(event) {
    if (event.key === 'Enter') {
        searchTerm = event.target.value
        $search.term = searchTerm
        // You can perform your search logic here, such as filtering a list of items.
        console.log('Search term:', $search.term)
        goto('/discovery-results')
    }
}
</script>

<div class="search-bar">
    <input
        class="search-input"
        type="text"
        placeholder="Search..."
        bind:value="{$search.term}"
        on:keydown="{handleSearch}" />
</div>

<style lang="scss">
.search-bar {
    width: 100%;
    margin-top: 1em;
    display: flex;
    align-items: center;
    justify-content: center;
}

.search-input {
    width: 100%;
    padding: 0.6em;
    font-size: 1.5em;
    border: 1px solid var(--border-color);
    background-color: transparent;
    color: #818181;
    border-radius: 9px;
    outline: none;
    transition: border-color 0.3s;
}

.search-input:focus {
    border-color: #9d9d9d;
    box-shadow: 0 0 3px #9d9d9d;
}
</style>
