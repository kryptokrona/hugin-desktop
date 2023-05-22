<script>
  import {goto} from '$app/navigation'
  import {fade} from 'svelte/transition'
  import SettingsList from '/src/routes/(app)/settings/SettingsList.svelte'
  import {page} from "$app/stores";

  const gotoPage = async (route) => {
    await goto(route)
  }

</script>


  <SettingsList on:changeCategory={(e) => gotoPage(e.detail)}/>
  <div in:fade="{{ duration: 350 }}" out:fade="{{ duration: 100 }}">
    <div>
      {#key $page.url.href}
        <div class="w-full h-full" in:fade>
          <slot/>
        </div>
      {/key}
    </div>
  </div>