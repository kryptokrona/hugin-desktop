<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";
	import IncomingCall from "/src/components/audio-call/IncomingCall.svelte";
	import { user } from "$lib/stores/user.js";

	import '$lib/theme/global.css'
	import {messages} from "$lib/stores/messages.js";

	let incoming_call = false

	let ready = false;
	onMount( async () =>{
		ready = true
		messages.set(await window.api.getMessages())
	});


	const closePopup = () => {
		incoming_call = false
	}

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

