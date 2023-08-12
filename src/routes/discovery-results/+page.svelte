<script>
import { onMount } from 'svelte'
import { writable } from 'svelte/store'
import SearchBar from '$lib/components/discovery/SearchBar.svelte'

let colorIndex = writable(0)

const colors = ['red', 'green', 'blue', 'purple', 'orange']

onMount(() => {
    const interval = setInterval(() => {
        colorIndex.update((index) => (index + 1) % colors.length)
    }, 5000)
    return () => clearInterval(interval)
})
</script>

<div class="header">
    <div class="search-bar">
        <SearchBar />
    </div>
</div>

<div class="grid">
    {#each Array.from({ length: 12 }) as _, i}
        <div class="box"></div>
    {/each}
</div>

<style lang="scss">
.grid {
    height: calc(100vh - 60px);
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    grid-gap: 20px;
    overflow-y: scroll;
    padding: 20px;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.grid::-webkit-scrollbar {
    display: none;
}

.box {
    height: 150px;
    display: flex;
    align-items: center;
    justify-content: left;
    font-size: 1.5rem;
    border-radius: 10px;
    color: white;
    text-align: left;
    background-color: #1f1f1f;
    margin: 0px 0;
}
</style>
