<script>
import { onMount } from 'svelte'
import { derived, writable } from 'svelte/store'
import { search } from '$lib/stores/search.js'
import SearchBar from '$lib/components/discovery/SearchBar.svelte'

let colorIndex = writable(0)

let db = {
    groups: [
        {
            name: 'Kryptokrona',
            standard: true,
            category: ['xkr', 'kryptokrona'],
            key: '33909fb89783fb15b5c2df50ff7107c112c3b232681f77814c024c909c07e932',
        },
        {
            name: 'Hugin',
            standard: true,
            category: ['xkr', 'kryptokrona', 'hugin'],
            key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8',
        },
        {
            name: 'Support',
            standard: true,
            category: ['xkr', 'kryptokrona', 'hugin'],
            key: '345e8da2223971f1dc9ad39f2cd8b9d875256c9041ac9d7af793be2c137670ac',
        },
        {
            name: 'Programming',
            standard: true,
            category: ['software', 'development'],
            key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0',
        },
        {
            name: 'Gaming',
            standard: true,
            category: ['gaming'],
            key: 'aab2b5493d95074e03090501a1cbc34955c29d4f0bfe5eed76445b2f049031b2',
        },
        {
            name: 'Cryptocurrency',
            standard: true,
            category: ['crypto', 'cryptocurrency', 'blockchain'],
            key: 'f28311919d9516831d79bc7ca68d108ba53f8432c639445e565cd2b1ecd70510',
        },
        {
            name: 'Privacy',
            standard: true,
            category: ['privacy', 'security'],
            key: '437f28724fc65df4bb81d0ffd938871607ae0c2ea96cdb13d374c2f76630161a',
        },
        {
            name: 'Politics',
            standard: true,
            category: ['politics'],
            key: '8330283b1323038a6fb60165e1ef7fabb2ec60ae5dd5c66ab0fcc41511fd99fc',
        },
        {
            name: 'Sweden',
            standard: true,
            category: ['sweden', 'country', 'region'],
            key: '08fcbb782f8c3304a0bcd5ab946f347de0514ec983f54536a47edd9753eaad47',
        },
        {
            name: 'Norway',
            standard: true,
            category: ['norway', 'country', 'region'],
            key: 'c70fb6179cecf1c3438d5789b2bac13e8231a97717ac0c16f9d0039a314dfb0c',
        },
        {
            name: 'Denmark',
            standard: true,
            category: ['denmark', 'country', 'region'],
            key: '1ca321697271265b2ce80f4dd70632682915aef8fc6bbd8be0492673e9ffda72',
        },
        {
            name: 'Finland',
            standard: true,
            category: ['finland', 'country', 'region'],
            key: '6e0861b7e3bcb3c83040d6003f2cd407bb249959f5c6c0959ac1de4f91f6e756',
        },
        {
            name: 'China',
            standard: true,
            category: ['china', 'country', 'region'],
            key: '03aed1def7f6010f810c3347cab7970a0c5a6950fb0fccb75b10b891c4181400',
        },
        {
            name: 'Rust',
            standard: false,
            category: ['rust', 'software', 'language'],
            key: '50b0354f0e84d1208b626577757102775c2fa1c708ce7f5f6a0495946368f9f0',
        },
    ],
}

const colors = ['red', 'green', 'blue', 'purple', 'orange']

const filteredGroups = derived(
    search, // Only include the search store
    ($search) => {
        const searchTerm = $search.term.toLowerCase()
        return db.groups.filter((item) => item.name.toLowerCase().includes(searchTerm))
    }
)

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
    {#each $filteredGroups as item, i}
        <div class="box">
            <div class="box-content">
                <div class="box-info">
                    <p class="box-name">{item.name}</p>
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
