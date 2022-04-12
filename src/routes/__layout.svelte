<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";
	import IncomingCall from "/src/components/webrtc/IncomingCall.svelte";
	//Stores
	import { user } from "$lib/stores/user.js";
	import {messages} from "$lib/stores/messages.js";

	//Global CSS
	import '$lib/theme/global.css'

	//Handle incoming call
	let incoming_call = true
	const closePopup = () => {
		incoming_call = false
	}

	let ready = false;

	//Load stores on first mount
	onMount( async () => {
		ready = true

		messages.set(await window.api.getMessages())

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

