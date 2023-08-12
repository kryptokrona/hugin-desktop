<script>
import { user } from '$lib/stores/user.js'
import { onMount } from 'svelte'
import { writable } from 'svelte/store'
import Share from '$routes/dashboard/components/Share.svelte'
import Funds from '$routes/dashboard/components/Funds.svelte'
import EditName from '$routes/dashboard/components/EditName.svelte'
import { layoutState } from '$lib/stores/layout-state.js'
import FillButton from '$lib/components/buttons/FillButton.svelte'
import { openURL } from '$lib/utils/utils.js'
import StandardGroups from '$routes/dashboard/components/StandardGroups.svelte'
import Transactions from '$routes/dashboard/components/Transactions.svelte'
import SearchBar from '$lib/components/discovery/SearchBar.svelte'

let colorIndex = writable(0)

const colors = ['red', 'green', 'blue', 'purple', 'orange'] // Add more colors if needed

onMount(() => {
    const interval = setInterval(() => {
        colorIndex.update((index) => (index + 1) % colors.length)
    }, 5000) // Change color every 1 second
    return () => clearInterval(interval)
})
</script>

<div class="search">
    <h1 id="presentation-text">
        Find <span style="color: {colors[$colorIndex]}">your</span> community
    </h1>
    <div class="search-bar">
        <SearchBar />
    </div>
</div>

<style lang="scss">
.search {
    margin-top: 12em;
    text-align: center;
    margin-right: 85px;
}

.search-bar {
    padding-top: 1.5em;
    width: 60%;
    margin: 0 auto;
}
#presentation-text {
    font-size: 3em;
}

#presentation-text span {
    font-style: italic;
    animation: colorChange 10s infinite;
}

@keyframes colorChange {
    0%,
    100% {
        color: red;
    }
    20% {
        color: green;
    }
    40% {
        color: blue;
    }
    60% {
        color: purple;
    }
    80% {
        color: orange;
    }
}
</style>
