<script>
	import { preventDefault } from 'svelte/legacy';
	import Button from "$lib/components/buttons/Button.svelte";
	import FillButton from "$lib/components/buttons/FillButton.svelte";
  import { pushToTalk, sounds, swarm } from "$lib/stores/user"
  import { voiceActivation } from "$lib/stores/mediasettings"
  import { get_avatar } from "$lib/utils/hugin-utils"
  import { fade } from "svelte/transition"
  import { t } from '$lib/utils/translation.js'


	let mode = $derived($pushToTalk.on ? 'push' : 'voice')
	let key = $state($pushToTalk.name)
	let code = $state(0)
	
	// Convert sensitivity (50-255) to percentage (0-100%)
	let sensitivityPercent = $derived(Math.round(((255 - $voiceActivation.sensitivity) / (255 - 50)) * 100))

  function setMode(newMode) {
		if (newMode === 'push') {
			$pushToTalk.on = true
			$voiceActivation.enabled = false
			console.log('[Media Settings] Mode changed to PUSH-TO-TALK')
		} else {
			$pushToTalk.on = false
			$voiceActivation.enabled = true
			console.log('[Media Settings] Mode changed to VOICE ACTIVATION', {
				sensitivity: $voiceActivation.sensitivity,
				sensitivityPercent: Math.round(((255 - $voiceActivation.sensitivity) / (255 - 50)) * 100) + '%'
			})
		}
		window.api.send('push-to-talk', $pushToTalk)
		window.api.send('voice-activation', $voiceActivation)
		window.api.successMessage(t('updatedMediaSettings') || 'Updated media settings...')
		
		if ($swarm.call.length && !$pushToTalk.on) {
			setAudio(true)
			console.log('[Media Settings] Audio enabled for all calls (voice activation mode)')
		} else if ($swarm.call.length) {
			setAudio(false)
			console.log('[Media Settings] Audio disabled for all calls (push-to-talk mode)')
		}
	}

  function savePushKey() {
    $pushToTalk = {key: code, on: $pushToTalk.on, name: key}
    window.api.send('push-to-talk', $pushToTalk)
		window.api.successMessage(t('updatedMediaSettings') || 'Updated media settings...')
  }
	
	function updateSensitivity(percent) {
		// Convert percentage (0-100%) to sensitivity (255-50)
		$voiceActivation.sensitivity = Math.round(255 - (percent / 100) * (255 - 50))
		console.log('[Media Settings] Voice activation sensitivity updated:', {
			percent: percent + '%',
			sensitivity: $voiceActivation.sensitivity,
			enabled: $voiceActivation.enabled,
			note: 'Lower sensitivity value = more sensitive (triggers at lower audio levels)'
		})
		window.api.send('voice-activation', $voiceActivation)
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
  <h2>{t('media') || 'Media'}</h2>
  <div class="settings" in:fade|global>
      <div class="inner">
					<h2>{t('inputMode') || 'Input Mode'}</h2>
					<br>
					
					<div class="mode-selector">
						<button 
							class="mode-btn"
							class:active={mode === 'voice'}
							onclick={() => setMode('voice')}
						>
							<div class="mode-label">{t('voiceActivated') || 'Voice Activated'}</div>
							<div class="mode-desc">{t('voiceActivatedDesc') || 'Auto-detect speech'}</div>
						</button>
						
						<button 
							class="mode-btn"
							class:active={mode === 'push'}
							onclick={() => setMode('push')}
						>
							<div class="mode-label">{t('pushToTalk') || 'Push to Talk'}</div>
							<div class="mode-desc">{t('pushToTalkDesc') || 'Hold key to speak'}</div>
						</button>
					</div>
					
					<br>
					
					{#if mode === 'voice'}
					<div class="config-panel" in:fade|global>
						<h4>{t('sensitivity') || 'Sensitivity'}</h4>
						<p class="help-text">
							{t('sensitivityDesc') || 'Higher = more sensitive (activates with quieter speech)'}
						</p>
						<div class="slider-wrapper">
							<input 
								type="range" 
								min="0" 
								max="100" 
								step="1"
								value={sensitivityPercent}
								oninput={(e) => updateSensitivity(e.target.value)}
								class="slider"
							/>
							<span class="slider-value">{sensitivityPercent}%</span>
						</div>
					</div>
					<br>
					{/if}
					
					{#if mode === 'push'}
					<div class="config-panel" in:fade|global>
						<h4>{t('pushToTalkKey') || 'Push to Talk Key'}</h4>
						<p class="help-text">
							{t('pressKeyToSet') || 'Press any key to set as your push-to-talk key'}
						</p>
						<div class="key-container">
							<div class="key-display">
								{#if key && key.length > 0}
									<div class="key-visual">
										<span class="key-text">{key}</span>
									</div>
								{:else}
									<div class="key-visual empty">
										<span class="key-placeholder">{t('pressAnyKey') || 'Press any key'}</span>
									</div>
								{/if}
							</div>
							{#if key && key.length > 0}
							<div class="key-info">
								<p class="key-hint">Press <strong>{key}</strong> to talk during calls</p>
							</div>
							{/if}
						</div>
						<br>
						<div class="save">
							<Button text={t('save') || 'Save'} disabled="{false}" on:click={savePushKey} />
						</div>
					</div>
					<br>
					{/if}

			<br>
			<h2>{t('sounds') || 'Sounds'}</h2>
			<br>

			<h4>{t('notifications') || 'Notifications'}</h4>
			<br>
			<div class="push">
				<FillButton
					on:click="{() => toggleSounds()}"
					enabled="{$sounds.on}"
					disabled="{false}"
					red={!$sounds.on}
					text="{$sounds.on ? t('on') || 'On' : t('off') || 'Off'}"
			/>
			</div>
  </div>
</div>
  
  <style lang="scss">
  
  .settings {
		height: 100vh;
		overflow-y: auto;
		overflow-x: hidden;
		padding-right: 10px;
		--scrollbarBG: transparent;
		--thumbBG: #3337;
		scrollbar-width: thin;
		scrollbar-color: var(--thumbBG) var(--scrollbarBG);
	}
	
	.settings::-webkit-scrollbar {
		width: 8px;
	}
	
	.settings::-webkit-scrollbar-track {
		background: var(--scrollbarBG);
	}
	
	.settings::-webkit-scrollbar-thumb {
		background-color: var(--thumbBG);
		border-radius: 3px;
		border: 3px solid var(--scrollbarBG);
	}
	
	.inner {
		max-width: 100%;
		padding-bottom: 40px;
	}
	
  h2 {
      margin-bottom: 10px;
  }
	
	h4 {
		margin-bottom: 8px;
	}
	
	.help-text {
		font-size: 12px;
		opacity: 0.7;
		margin-bottom: 15px;
		font-family: "Montserrat";
	}
	
	.mode-selector {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 20px;
		margin-bottom: 20px;
		max-width: 600px;
	}
	
	.mode-btn {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 20px;
		background: var(--background-color, #1a1a1a);
		border: 2px solid var(--border-color, #2a2a2a);
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.3s ease;
		min-height: 140px;
		
		&:hover {
			border-color: var(--accent-color, #4CAF50);
			transform: translateY(-2px);
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		}
		
		&.active {
			border-color: var(--accent-color, #4CAF50);
			background: rgba(76, 175, 80, 0.1);
			box-shadow: 0 0 20px rgba(76, 175, 80, 0.2);
		}
	}
	
	.mode-icon {
		font-size: 32px;
		margin-bottom: 10px;
	}
	
	.mode-label {
		font-family: "Montserrat";
		font-size: 16px;
		font-weight: 600;
		color: var(--text-color);
		margin-bottom: 5px;
	}
	
	.mode-desc {
		font-family: "Montserrat";
		font-size: 12px;
		color: var(--text-color);
		opacity: 0.6;
		text-align: center;
	}
	
	.config-panel {
		background: var(--background-color, #1a1a1a);
		border: 1px solid var(--border-color, #2a2a2a);
		border-radius: 8px;
		padding: 20px;
	}
	
	.key-container {
		display: flex;
		flex-direction: column;
		gap: 15px;
		margin: 20px 0;
	}
	
	.key-display {
		display: flex;
		justify-content: center;
		align-items: center;
		padding: 20px;
		background: rgba(0, 0, 0, 0.2);
		border-radius: 12px;
		border: 2px dashed var(--border-color, #3a3a3a);
		min-height: 100px;
	}
	
	.key-visual {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px 40px;
		background: linear-gradient(135deg, var(--accent-color, #4CAF50) 0%, rgba(76, 175, 80, 0.8) 100%);
		border-radius: 12px;
		box-shadow: 
			0 4px 15px rgba(76, 175, 80, 0.3),
			0 0 0 4px rgba(76, 175, 80, 0.1),
			inset 0 1px 0 rgba(255, 255, 255, 0.2);
		border: 2px solid rgba(255, 255, 255, 0.1);
		position: relative;
		
		&::before {
			content: '';
			position: absolute;
			top: 3px;
			left: 3px;
			right: 3px;
			height: 50%;
			background: linear-gradient(180deg, rgba(255, 255, 255, 0.15) 0%, transparent 100%);
			border-radius: 8px 8px 0 0;
		}
		
		&.empty {
			background: transparent;
			box-shadow: none;
			border: 2px dashed var(--border-color, #3a3a3a);
			
			&::before {
				display: none;
			}
		}
	}
	
	.key-text {
		font-family: "RobotoMono", monospace;
		font-size: 28px;
		font-weight: 700;
		color: #fff;
		text-shadow: 
			0 2px 4px rgba(0, 0, 0, 0.3),
			0 0 20px rgba(255, 255, 255, 0.2);
		text-transform: uppercase;
		letter-spacing: 2px;
		position: relative;
		z-index: 1;
	}
	
	.key-placeholder {
		font-family: "Montserrat";
		font-size: 16px;
		color: var(--text-color);
		opacity: 0.4;
		font-style: italic;
	}
	
	.key-info {
		text-align: center;
		padding: 12px;
		background: rgba(76, 175, 80, 0.1);
		border-radius: 8px;
		border: 1px solid rgba(76, 175, 80, 0.2);
	}
	
	.key-hint {
		font-family: "Montserrat";
		font-size: 14px;
		color: var(--text-color);
		margin: 0;
		opacity: 0.9;
		
		strong {
			color: var(--accent-color, #4CAF50);
			font-weight: 600;
		}
	}
  
  .push {
		display: flex;
		flex-direction: row;
	}

	.save {
		width: 50px;
	}

	.slider-wrapper {
		display: flex;
		align-items: center;
		gap: 15px;
		margin-top: 10px;
	}

	.slider {
		flex: 1;
		max-width: 400px;
		height: 8px;
		border-radius: 5px;
		background: var(--border-color);
		outline: none;
		opacity: 0.7;
		transition: opacity 0.2s;
		cursor: pointer;
	}

	.slider:hover {
		opacity: 1;
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent-color, #4CAF50);
		cursor: pointer;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--accent-color, #4CAF50);
		cursor: pointer;
		border: none;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
	}

	.slider-value {
		min-width: 60px;
		font-family: "Montserrat";
		font-size: 16px;
		color: var(--text-color);
		font-weight: 700;
		text-align: right;
	}
  </style>