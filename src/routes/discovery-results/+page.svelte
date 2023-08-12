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
        <div class="box">
            <div class="box-content">
                <div class="box-info">
                    <p class="box-name">Rust</p>
                    <p class="box-text">Join</p>
                </div>
            </div>
        </div>
    {/each}
</div>

<style lang="scss">
.header {
    padding: 20px;
}

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
    background-color: #1f1f1f;
    border-radius: 9px;
    overflow: hidden;
}

.box-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 15px;
    position: relative;
}

.box-image {
    width: 80px; /* Adjust image size as needed */
    height: 80px;
}

.box-info {
    margin-top: auto; /* Push to the bottom of the box */
    display: flex;
    flex-direction: column;
}

.box-name {
    font-weight: bold;
    margin-bottom: 5px;
    color: white;
}

.box-text {
    font-size: 0.9rem;
    color: white;
    text-align: right;
}
</style>
