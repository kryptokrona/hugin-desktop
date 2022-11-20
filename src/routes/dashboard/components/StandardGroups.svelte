<script>

    //TODO move in to a store or seperate group file

    import {goto} from "$app/navigation";
    import Button from "$lib/components/buttons/Button.svelte"

    let groups = [
        {name: 'Hugin', key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8'},
        {name: 'Programming', key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0'},
        {name: 'Hugin', key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8'},
        {name: 'Programming', key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0'},
        {name: 'Hugin', key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8'},
        {name: 'Programming', key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0'},
        {name: 'Hugin', key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8'},
        {name: 'Programming', key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0'},
        {name: 'Hugin', key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8'},
        {name: 'Programming', key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0'},
        {name: 'Hugin', key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8'},
        {name: 'Programming', key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0'},
        {name: 'Hugin', key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8'},
        {name: 'Programming1', key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0'},
    ]
    
    const addNewGroup = (group) => {
        if (group.length < 32) return
        let data = {
            m: 'Added group',
            n: group.name,
            hash: Date.now() * 2,
            t: Date.now().toString(),
            s: '',
            k: group.key,
            sent: false,
            r: '',
            g: group.key,
            h: parseInt(Date.now()),
        }
        window.api.addGroup(data)
        goto('/groups')
    }

</script>

<div class="card">
    <div class="header">
        <h3>Recommended groups</h3>
    </div>
    <div class="list">
        {#each groups as group}
            <div class="row">
                <p style="font-size: 1rem">{group.name}</p>
                <Button text="Join" disabled={false} on:click={() => addNewGroup(group)}/>
            </div>
        {/each}
    </div>
</div>

<style lang="scss">

  .card {
    grid-column: span 6 / span 6;
    position: relative;
    width: 100%;
    height: calc(100% );
    border-right: 1px solid var(--border-color);

    h3 {
      font-weight: 800;
    }

    p {
      opacity: 80%;
    }
  }

  .header {
    border-bottom: 1px solid var(--border-color);
    padding: 0.75rem 2rem;
    height: 50px;
  }

  .list {
    overflow: scroll;
    height: calc(100% - 415px);

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    height: 50px;

    border-bottom: 1px solid var(--border-color);

  }

</style>