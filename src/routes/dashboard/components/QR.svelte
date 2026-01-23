
<script>

  import FillButton from "$lib/components/buttons/FillButton.svelte"
  import Backdrop from "$lib/components/layouts/Backdrop.svelte"
  import Cards from "$lib/components/layouts/Cards.svelte"
  import { fly } from "svelte/transition"
  import { user } from '$lib/stores/user.js'
	import { onMount } from "svelte";
	import { qr } from '@svelte-put/qr/img';


  let sent = $state(false)
  let sign = $state("")
  let publicKey = $state("")
  let showQR = $state("")

  let bgColor = $state("")
  let fgColor = $state("")

  let {
      onClose,
      data
  } = $props()

  onMount(() => {
    const styles = getComputedStyle(document.documentElement)
    bgColor = styles.getPropertyValue("--card-background").trim()
    fgColor = styles.getPropertyValue("--text-color").trim()
    console.log('bgcolor', bgColor, "fgcoor", fgColor)
  })
  
  const close = () => {
      onClose()
  }

  </script>
  <Backdrop onClose={close}>
      <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="field">
      
      <div> 

        <img
          use:qr={{
            data,
            shape: 'circle',
            anchorInnerFill: fgColor,
            anchorOuterFill: fgColor,
            moduleFill: fgColor,
            backgroundFill: bgColor,
            width: 500,
            height: 500,
          }}
          alt="qr"
        />

        </div>
  </div>
  </Backdrop>
  
  <style>
  
  .field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: absolute;
      padding: 0;
      background-color: var(--card-background);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
  }

  p {
    font-family: "Montserrat" !important;
  }
  
  </style>