<script>

    //TODO move in to a store or seperate group file

    const groups = [
        {name: 'Random1', key: '123'},
        {name: 'Random2', key: '123'},
        {name: 'Random3', key: '123'},
        {name: 'Random4', key: '123'},
        {name: 'Random5', key: '123'},
        {name: 'Random6', key: '123'},
        {name: 'Random7', key: '123'},
        {name: 'Random8', key: '123'},
    ]

    const joinGroup = (group) => {
        console.log('want to join ', group)
    }

</script>

<div class="card">
    <div class="header">
        <h3>Recommended groups</h3>
    </div>
    <div class="list">
        {#each groups as group}
            <div class="row">
                <p>{group.name}</p>
                <button on:click={() => joinGroup(group)}>Join</button>
            </div>
        {/each}
    </div>
</div>

<style lang="scss">

  .card {
    grid-column: span 6 / span 6;
    position: relative;
    background-color: var(--card-background);
    border: 1px solid var(--card-border);
    border-radius: 0.4rem;
    width: 100%;
    height: 300px;
  }

  .header {
    border-bottom: 1px solid var(--border-color);
    padding: 0.75rem 1rem;
    height: 50px;
  }

  .list {
    overflow: scroll;
    height: calc(100% - 50px);

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 1rem;
    height: 50px;

    border-bottom: 1px solid var(--border-color);

    &:last-child {
      border-bottom: none;
    }
  }

</style>