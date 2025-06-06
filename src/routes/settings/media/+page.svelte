<script>
	import { preventDefault } from 'svelte/legacy';
	import Button from "$lib/components/buttons/Button.svelte";
	import FillButton from "$lib/components/buttons/FillButton.svelte";
  import { pushToTalk, sounds, swarm } from "$lib/stores/user"
  import { get_avatar } from "$lib/utils/hugin-utils"
  import { fade } from "svelte/transition"


	let active = $derived($pushToTalk.on)
	let key = $state($pushToTalk.name)
	let code = $state(0)

  function save() {
    $pushToTalk = {key: code, on: $pushToTalk.on, name: key}
    window.api.send('push-to-talk', $pushToTalk)
		window.api.successMessage('Updated media settings...')
		
		if ($pushToTalk.on === false) {
				key = ''
				code = 0
		if ($swarm.call.length) {
				setAudio(true)
			
			} else {
				setAudio(false)
			}
		}
  }

	function setAudio(mode) {
		$swarm.call.forEach((a) => {
        a.myStream.getAudioTracks().forEach((track) => (track.enabled = mode))
    	})
	}
	function onkey(e) {
		if (!$pushToTalk.on) return
		key = e.key
		code = e.keyCode
	}
  
	function toggleSounds() {
		$sounds.on = !$sounds.on
		window.api.send('sounds', $sounds.on)
	}

  </script>
  
	<svelte:window on:keyup|preventDefault="{onkey}" />
  <h2>Media</h2>
  <div class="settings" in:fade|global>
      <div class="inner">
          <div class="list-wrapper">
						
						<h4>Push to talk</h4>
						<br>
						<div class="push">
							<br>
							<FillButton
							on:click="{() => $pushToTalk.on = !$pushToTalk.on}"
							enabled="{active}"
							disabled="{false}"
							red={!active}
							text="{active ? 'On' : 'Off'}"
					/>
					
						</div>
					<p style="height: 10px;">
             {#if active}
							{#if key !== null}
								{#if key.length === 0}
									Press any key
								{:else}
									{key}
								{/if}
							{/if}
             {/if}
						 </p>
      </div>
			<br>
			<div class="save">
			<Button text="Save"	disabled="{false}" on:click={save} />
			</div>
			<br>

			<br>
 				<h2>Sounds</h2>
			<br>

			<h4>Notifications</h4>
			<br>
			<div class="push">
				<FillButton
					on:click="{() => toggleSounds()}"
					enabled="{$sounds.on}"
					disabled="{false}"
					red={!$sounds.on}
					text="{$sounds.on ? 'On' : 'Off'}"
			/>
			</div>
  </div>
</div>
  
  <style lang="scss">
  
  h2 {
      margin-bottom: 10px;
  }
  .push {
		display: flex;
		flex-direction: row;
	}
  .card {
      display: flex;
      height: 80px;
      padding: 1rem;
      width: 100%;
      color: var(--title-color);
      border-bottom: 1px solid var(--border-color);
      background-color: var(--backgound-color);
      transition: 200ms ease-in-out;
      cursor: pointer;
      opacity: 0.9;
  
      &:hover {
          color: var(--text-color);
          opacity: 1;
      }
  }
  

	.list-wrapper {
		width: 20%;
	}
  p {
      font-family: "Montserrat";
      margin-right: 15px;
  }
  
	.push {
    width: 40px !important;
	}

	.save {
		width: 50px;
	}
  </style>