
<script>

  import FillButton from "$lib/components/buttons/FillButton.svelte"
  import Backdrop from "$lib/components/layouts/Backdrop.svelte"
  import Cards from "$lib/components/layouts/Cards.svelte"
  import { fly } from "svelte/transition"
  import { user } from '$lib/stores/user.js'
	import { onMount } from "svelte";

  let sent = $state(false)
  let sign = $state("")
  let publicKey = $state("")

  let {
      onClose
  } = $props()
  
  const close = () => {
      onClose()
  }

  onMount(async () => {
    
  [sign, publicKey] = await window.api.messageKeyPair()

  })

  // Dispatch the inputted data
const sendTransaction = async () => {
  sent = await window.api.sendTransaction({
        to: 'SEKReVsk6By22AuCcRnQGkSjY6r4AxuXxSV9ygAXwnWxGAhSPinP7AsYUdqPNKmsPg2M73FiA19JT3oy31WDZq1jBkfy3kxEMNM',
        amount: parseInt(99) * 100000,
        paymentID: publicKey,
    })

    if (sent) {
      localStorage.setItem('hugin+', true)
    }
}

  
  </script>
  <Backdrop onClose={close}>
      <div in:fly|global="{{ y: 50 }}" out:fly|global="{{ y: -50 }}" class="field">
      
      <Cards> 
        {#if !sent && localStorage.getItem('hugin+') === undefined}
          <p>-✅Send messages to your contacts if they are offline.</p>
          <p>-✅Unlock future perks and special features.</p>
          <p>-✅Support the project and help grow Hugin</p>
          <p>Price: 99 XKR</p>
              <FillButton enabled={true} disabled={false} text={'Upgrade'} on:click={sendTransaction}/>
              {:else if sent || localStorage.getItem('hugin+') === 'true'}
              <p in:fly>✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅</p>
              <p in:fly> You have upgraded to Hugin +</p>
              <p in:fly> Wait a couple of minutes for the transaction to settle..</p>
              <p in:fly> Thanks for your support.</p>
              <p in:fly>✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅</p>
        {/if}
      </Cards>
  </div>
  </Backdrop>
  
  <style>
  
  .field {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: absolute;
      padding: 0 10px;
      background-color: var(--card-background);
      border: 1px solid var(--card-border);
      border-radius: 0.4rem;
  }
  
  </style>