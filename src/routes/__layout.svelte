<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";
	import IncomingCall from "/src/components/webrtc/IncomingCall.svelte";
	//Stores
	import { user } from "$lib/stores/user.js";
	import {messages} from "$lib/stores/messages.js";

	//Global CSS
	import '/src/lib/theme/global.scss'

	//Handle incoming call
	let incoming_call = false
	const closePopup = () => {
		incoming_call = false
	}

	let ready = false;


	onMount( async () => {
		ready = true

		messages.set(await window.api.getMessages())

		window.api.receive('call-incoming', (msg, sender) => {
			incoming_call = true
			user.update(current => {
				return{
					...current,
					call: {msg, sender}
				}
			})
		})

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
		<LeftMenu/>
		<RightMenu/>
	{/if}

	<slot />
{/if}

<style>
</style>

