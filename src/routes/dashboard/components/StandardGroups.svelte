<script>

    //TODO move in to a store or seperate group file

    import {goto} from "$app/navigation";
    import {groups} from "$lib/stores/user.js";
    import Button from "$lib/components/buttons/Button.svelte"
    import {get_avatar} from "$lib/utils/hugin-utils.js";
    import {standardGroups} from "$lib/stores/standardgroups.js";
	  import FillButton from "$lib/components/buttons/FillButton.svelte";

    let {
        onClick
    } = $props()
    

</script>

<div class="card">
    <div class="header">
        <h3>Upgrade to Hugin +</h3>
    </div>
    <p>-✅Send messages to your contacts if they are offline.</p>
    <p>-✅Unlock future perks and special features.</p>
    <p>-✅Support the project and help grow Hugin!</p>
    <FillButton disabled={false} enabled={true} text="Upgrade" on:click={() => onClick()} /> 
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
