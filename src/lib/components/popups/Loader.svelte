<script>
//To handle true and false, or in this case show and hide.
import { fade, fly } from 'svelte/transition'
import { Moon } from 'svelte-loading-spinners'
</script>

<div
    in:fade|local="{{ duration: 150 }}"
    out:fade|local="{{ delay: 300, duration: 170 }}"
    class="backdrop"
    on:click|self
>
    <div class="card" in:fly="{{ y: 50 }}" out:fly="{{ y: -50 }}">
        <p in:fade="{{ duration: 170 }}">Loading</p>
        <Moon color="var(--title-color)" size="30" unit="px" />
    </div>
</div>

<style lang="scss">
.card {
    box-sizing: border-box;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    padding: 20px;
    border-radius: 0.4rem;
    width: 300px;
    display: flex;
    justify-content: space-between;
    align-items: center;

    // @media only screen and (max-width: 1000px) {
    //     max-width: 100%;
    // }
}

p {
    margin: 0;
    color: var(--title-color);
    font-family: 'Montserrat';
    font-size: 17px;
}

.backdrop {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    top: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--backgound-color);
    z-index: 103;
    border-radius: 15px;
    margin-bottom: 100px;
}

.wrapper {
    width: 100%;
}

h4 {
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
    margin-left: 4px;
}

.key {
    background-color: rgba(255, 255, 255, 0.2);
}
</style>
