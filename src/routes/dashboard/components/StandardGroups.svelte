<script>

    //TODO move in to a store or seperate group file

    import {goto} from "$app/navigation";
    import {groups} from "$lib/stores/user.js";
    import Button from "$lib/components/buttons/Button.svelte"
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {standardGroups} from "$lib/stores/standardgroups.js";

    let standard = $standardGroups

    $: groupSuggestions = standard.filter(a => !$groups.groupArray.map(b=>b.key).includes(a.key))

    const addNewGroup = (group) => {
        if (group.length < 32) return
        let data = {
            m: 'Joined group',
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
        groups.update((data) => {
        return {
            ...data,
            thisGroup: { key: group.key, name: group.name, chat: true},
        }
      })
        goto('/groups')
    }

</script>

<div class="card">
    <div class="header">
        <h3>Recommended groups</h3>
    </div>
    <div class="list">
        {#each groupSuggestions as group}
            <div class="row">
                <img
                  class="avatar"
                  src="data:image/png;base64,{get_avatar(group.key)}"
                  alt=""
                />
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
    height: calc(100%);
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
