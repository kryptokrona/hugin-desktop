<script>
    import {goto} from '$app/navigation'
    import Boxcard from '$lib/components/layouts/Boxcard.svelte'

    const createRoom = () => {
    let video = true
    console.log('creating room..')
    window.api.createRoom(video)
}
</script>

<div class="cards">
        <Boxcard bigtext={'Create video room'} on:click="{createRoom}" />
    <div class="card" onclick={() => goto('/groups')}>
        <h4>Create group chat</h4>
    </div>
</div>

<style lang="scss">
.cards {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    cursor: pointer;
    height: 100%;
    margin-right: 1rem;
}
</style>
