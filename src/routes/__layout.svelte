<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";
	import IncomingCall from "/src/components/webrtc/IncomingCall.svelte";
	import Webrtc from "/src/routes/webrtc/index.svelte";

	//Stores
	import { user } from "$lib/stores/user.js";
	import {messages} from "$lib/stores/messages.js";

	//Global CSS
	import '/src/lib/theme/global.scss'

	let ready = false;

	let incoming_call
	const closePopup = () => {
		incoming_call = false
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

		messages.set(await window.api.getMessages())
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
			user.update(user => {
				return{
					...user,
					syncState: res
				}
			})
		})
	});
</script>


{#if ready}

	{#if $user.loggedIn && incoming_call}
		<IncomingCall on:click={closePopup} paused={!incoming_call}/>

	{/if}

	{#if $user.loggedIn}
		<LeftMenu />
		<Webrtc />
		<RightMenu/>
	{/if}

	<slot />
{/if}

<style>
</style>

