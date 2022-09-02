<script>
	import { onMount } from 'svelte';
	import LeftMenu from "../components/navbar/LeftMenu.svelte";
	import RightMenu from "/src/components/navbar/RightMenu.svelte";
	import IncomingCall from "/src/components/webrtc/IncomingCall.svelte";
	import Webrtc from "/src/components/webrtc/Calls.svelte";
	import TrafficLights from "$components/TrafficLights.svelte";
	import CallerMenu from "/src/components/webrtc/CallerMenu.svelte";
	import PeerAudio from "/src/components/webrtc/PeerAudio.svelte";
	import VideoGrid from "$components/webrtc/VideoGrid.svelte";
	import Loader from '/src/components/popups/Loader.svelte';
	//Stores
	import { user, webRTC, misc, notify, boards } from "$lib/stores/user.js";
	import {messages} from "$lib/stores/messages.js";

	//Global CSS
	import '/src/lib/theme/global.scss'
	import Notification from '/src/components/popups/Notification.svelte';

	let ready = false
	let myVideo = false
	let peerVideo = true
	let incoming_call
	let showCallerMenu = false
	let new_messages = false
	let board_message_sound
	let errors = []
	let loading = false

	const closePopup = () => {
		incoming_call = false
	}

	const toggleMyWindow = () => {
		console.log('toggleee my window');
		myVideo = !myVideo
	}

	const endThisCall = () => {
		showCallerMenu = false
		myVideo = false
	}

	const openCallerMenu = () => {
		showCallerMenu = true
		myVideo = true
		incoming_call = false
	}

	const toggleCallMenu = () => {
		showCallerMenu = !showCallerMenu
	}

	onMount( async () => {
		window.process = {
			...window.process,
			env: { DEBUG: undefined },
			nextTick: function() {
				return null;
			}
		};
		board_message_sound = new Audio("/static/audio/boardmessage.mp3");
		ready = true

		//Handle incoming call
		window.api.receive('call-incoming', (msg, chat) => {

			console.log('INCMING');
			$webRTC.call.unshift({msg, chat, type: 'incoming'})
			incoming_call = true
		})

		//Handle sync status
		window.api.receive('sync', data => {
			misc.update(current => {
				return{
					...current,
					syncState: data
				}
			})
		})

		window.api.receive("boardMsg", data => {
			new_messages = true
			if (data.brd === $boards.thisBoard) return
			board_message_sound.play();
			$notify.new.push(data)
			console.log('notif', $notify.new)
			$notify.new = $notify.new
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

		misc.update(current => {
				return {
						...current,
						node: node
				}
		})
	})

		window.api.receive('node-sync-data', data => {
			misc.update(current => {
				return {
					...current,
					walletBlockCount: data.walletBlockCount,
					networkBlockCount: data.networkBlockCount,
					localDaemonBlockCount: data.localDaemonBlockCount,

				}
			})
		})
  window.api.receive('newMsg', async (data) => {
		console.log('newmsg in layout', data);
		saveToStore(data)
	})

		const saveToStore = (data) => {

			messages.update(current => {
					return [...current, data]
			})
		}

		window.api.receive('endCall', async (data) => {
		console.log('endcall in layout', data);
		endThisCall()
	})

	window.api.receive('error_msg', async (error) => {
		console.log('Error', error)
		errors.push(error)
		errors = errors
	})


	});

	function removeErrors(e) {
		let filterArr = errors.filter(a => a.h !== e.detail.hash)
		console.log('filtered', filterArr)
		errors = filterArr
	}

	function removeNotification(e) {
		let filterArr = $notify.new.filter(a => a.h !== e.detail.hash)
		console.log('filtered', filterArr)
		$notify.new = filterArr
	}

    $: loading = $misc.loading

</script>



<TrafficLights/>




{#if ready}
	{#if loading}
	<Loader/>
	{/if}

	{#if $user.loggedIn && $webRTC.call.length != 0 }

	{#if $webRTC.active && $webRTC.myStream}
		<VideoGrid />
	{/if}

		{#each $webRTC.call as thiscall}

		{#if $webRTC.peerAudio}

		<PeerAudio audioCall={thiscall}/>


		{/if}
			{#if incoming_call}
				<IncomingCall
				thisCall={thiscall}
				on:click={closePopup}
				on:answerCall={openCallerMenu}
				paused={!incoming_call}/>
			{/if}
			{#if showCallerMenu}
				<CallerMenu
				this_call={thiscall}
				on:click={endThisCall}
				on:endCall={endThisCall}
				paused={!showCallerMenu}
				on:toggleMyWindow={toggleMyWindow}/>
			{/if}
		{/each}

	{/if}

	{#if $user.loggedIn && $notify.new.length > 0 && new_messages}
		<div class="notifs">
		{#each $notify.new as notif (notif.h)}
		<Notification on:hide={removeNotification} message={notif} error={false}/>
		{/each}
		</div>
	{/if}

	{#if errors.length > 0 && $user.loggedIn}
		<div class="notifs">
		{#each errors as error (error.h)}
		<Notification message={error} error={true}  on:hide={removeErrors} />
		{/each}
		</div>
	{/if}

	{#if $user.loggedIn}

		<LeftMenu />
		<RightMenu on:startCall={openCallerMenu} on:toggleCallMenu={toggleCallMenu}/>
		<Webrtc/>
	{/if}

	<slot />
{/if}

<style>

    .close {
      pointer-events: visible;
    }

    .wrap :global(strong) {
      font-weight: 600;
    }

	.notifs {
		display: flex;
		flex-direction: column;
		gap: 10px;
		position: absolute;
		top: 20px;
		right: 20px;
		height: 100%;
	}
</style>
