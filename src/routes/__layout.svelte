<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";
	import IncomingCall from "/src/components/webrtc/IncomingCall.svelte";
	import Webrtc from "/src/routes/webrtc/index.svelte";
	import { SvelteToast } from '@zerodevx/svelte-toast'
	import TrafficLights from "$components/TrafficLights.svelte";
	import CallerMenu from "/src/components/webrtc/CallerMenu.svelte";

	//Stores
	import { user, misc, webRTC } from "$lib/stores/user.js";
	import {messages} from "$lib/stores/messages.js";

	//Global CSS
	import '/src/lib/theme/global.scss'
		$: console.log('webrtc', $webRTC.peer);

	let ready = false;

	let incoming_call
	let showCallerMenu = false

	const closePopup = () => {
		incoming_call = false
	}

	const endThisCall = () => {
		showCallerMenu = false
	}

	const openCallerMenu = () => {
		showCallerMenu = true
	}

	onMount( async () => {
		window.process = {
			...window.process,
			env: { DEBUG: undefined },
			nextTick: function() {
				return null;
			}
		};

		ready = true

		//Handle incoming call
		window.api.receive('call-incoming', (msg, sender) => {
			incoming_call = true
			user.update(current => {
				return{
					...current,
					call: {msg, sender}
				}
			})
		})

		//Handle sync status
		window.api.receive('sync', res => {
			misc.update(user => {
				return{
					...user,
					syncState: res
				}
			})
		})



		window.api.receive('addr', async (huginAddr) => {
			console.log('Addr incoming')
			user.update(data => {
				return {
					...data,
					huginAddress: huginAddr,
				}
			})
		})

window.api.receive('node', async (node) => {

		misc.update(oldData => {
				return {
						...oldData,
						node: node
				}
		})
	})

		window.api.receive('node-sync-data', ({walletBlockCount, localDaemonBlockCount, networkBlockCount}) => {
			misc.update(current => {
				return {
					...current,
					walletBlockCount,
					localDaemonBlockCount,
					networkBlockCount
				}
			})
		})

	});

	$: console.log('$user.call.out', $user.call.out);


	const options = {
		duration: 10000,       // duration of progress bar tween to the `next` value
		initial: 1,           // initial progress bar value
		next: 0,              // next progress value
		pausable: false,      // pause progress bar tween on mouse hover
		dismissable: true,    // allow dismiss with close button
		reversed: false,      // insert new toast to bottom of stack
		intro: { x: 256 },    // toast intro fly animation settings
		classes: []
	}
</script>
<div class="wrap">
  <SvelteToast {options}/>
</div>
{#if ready}

<TrafficLights/>

	{#if $user.loggedIn && incoming_call}
		<IncomingCall on:click={closePopup} on:answerCall={openCallerMenu} paused={!incoming_call}/>
	{/if}

	{#if $user.loggedIn && showCallerMenu}
		<CallerMenu on:click={endThisCall} on:endCall={endThisCall} paused={!showCallerMenu}/>
	{/if}

	{#if $user.loggedIn}
		<LeftMenu />
		<Webrtc />
		<RightMenu on:startCall={openCallerMenu}/>
	{/if}

	<slot />
{/if}

<style>

    .wrap {
      display: contents;
      font-family: Roboto, sans-serif;
      font-size: 0.875rem;
    }
    .wrap :global(strong) {
      font-weight: 600;
    }
</style>
