<script>

    //TODO move in to a store or seperate group file

    import {goto} from "$app/navigation";
    import {groups} from "$lib/stores/user.js";
    import Button from "$lib/components/buttons/Button.svelte"
    import {get_avatar} from "$lib/utils/hugin-utils.js";

    let standardGroups = [
        { name: 'Kryptokrona',     key: '33909fb89783fb15b5c2df50ff7107c112c3b232681f77814c024c909c07e932' },
        { name: 'Hugin',           key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8' },
        { name: 'Programming',     key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0' },
        { name: 'Gaming',          key: 'aab2b5493d95074e03090501a1cbc34955c29d4f0bfe5eed76445b2f049031b2' },
        { name: 'Cryptocurrency',  key: 'f28311919d9516831d79bc7ca68d108ba53f8432c639445e565cd2b1ecd70510' },
        { name: 'Privacy',         key: '437f28724fc65df4bb81d0ffd938871607ae0c2ea96cdb13d374c2f76630161a' },
        { name: 'Politics',        key: '8330283b1323038a6fb60165e1ef7fabb2ec60ae5dd5c66ab0fcc41511fd99fc' },
        { name: 'Sweden',          key: '08fcbb782f8c3304a0bcd5ab946f347de0514ec983f54536a47edd9753eaad47' },
        { name: 'Norway',          key: 'c70fb6179cecf1c3438d5789b2bac13e8231a97717ac0c16f9d0039a314dfb0c' },
        { name: 'Denmark',         key: '1ca321697271265b2ce80f4dd70632682915aef8fc6bbd8be0492673e9ffda72' },
        { name: 'Finland',         key: '6e0861b7e3bcb3c83040d6003f2cd407bb249959f5c6c0959ac1de4f91f6e756' },
        { name: 'China',           key: '03aed1def7f6010f810c3347cab7970a0c5a6950fb0fccb75b10b891c4181400' },
    ]

    $: groupSuggestions = standardGroups.filter(a => !$groups.groupArray.map(b=>b.key).includes(a.key))

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
