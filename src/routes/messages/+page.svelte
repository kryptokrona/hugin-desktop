<script>
	import { run } from 'svelte/legacy';
	import { t } from '$lib/utils/translation.js';

	import { fade, fly } from 'svelte/transition';
	import { onDestroy, onMount, tick } from 'svelte';
	import { messages } from '$lib/stores/messages.js';
	import ChatBubble from '$lib/components/chat/ChatBubble.svelte';
	import ChatInput from '$lib/components/chat/ChatInput.svelte';
	import ChatList from '$lib/components/chat/ChatList.svelte';
	import AddChat from '$lib/components/chat/AddChat.svelte';
	import {
		boards,
		notify,
		transactions,
		user,
		beam,
		webRTC,
		swarm,
		files,
		keyboard
	} from '$lib/stores/user.js';
	import Rename from '$lib/components/chat/Rename.svelte';
	import SendTransaction from '$lib/components/finance/SendTransaction.svelte';
	import Dropzone from 'svelte-file-dropzone';
	import { sleep } from '$lib/utils/utils';
	import FileViewer from '$lib/components/popups/FileViewer.svelte';
	import { fileSettings, fileViewer, localFiles, remoteFiles } from '$lib/stores/files.js';
	import BigImage from '$lib/components/popups/BigImage.svelte';
	import DropFile from '$lib/components/popups/DropFile.svelte';
	import ActiveCall from './components/ActiveCall.svelte';
	import { flip } from 'svelte/animate';
	import Button from '$lib/components/buttons/Button.svelte';
	import { page } from '$app/stores';

	let active_contact = $state();
	let messageList = $state([]);
	let contact;
	let dragover = $state(false);
	let toggleRename = $state(false);
	let wantToAdd = $state(false);
	let windowHeight = $state();
	let windowChat;

	const getActiveConv = () => $user.activeChat?.conversation || $user.activeChat?.address || '';
	let thisSwarm = $derived($swarm.active.find((a) => a.chat === getActiveConv()));
	//Get messages on mount.
	onMount(async () => {
		$fileViewer.enhanceImage = false;
		$fileViewer.focusImage = '';
		boards.update((data) => {
			return {
				...data,
				replyTo: { reply: false }
			};
		});

		//If we have an active chat in store we show that conversation
		if ($user.activeChat) {
			printConversation($user.activeChat);
		} else {
			printConversation($user.contacts[0]);
		}

		scrollDown();

		//Listen for new message private messages saved in DB
		window.api.receive('newMsg', async (data) => {
			const activeConv = getActiveConv();
			if (!activeConv) return;
			const dataConv = data.conversation;
			if (dataConv === activeConv) {
				const file = isFile(data);
				if (file) data.file = file;
				printMessage(data);
			}
		});

		window.api.receive('remote-file-added', async (data) => {
			const activeConv = getActiveConv();
			if (!activeConv) return;
			if (data.conversation === activeConv) {
				messageList = sortMessages(messageList);
			}
		});

		window.api.receive('user-joined-voice-channel', async (data) => {
			await sleep(200);
			const activeConv = getActiveConv();
			if (!activeConv) return;
			if (data.address === activeConv) {
				messageList = sortMessages(messageList);
			}
		});

		window.api.receive('privateMsg', async (data) => {
			const activeConv = getActiveConv();
			if (!activeConv) return;
			if (data.conversation === activeConv) {
				scrollDown();
			}
		});

		window.api.receive('pm-send-error', async (data) => {
			const ts = data?.timestamp;
			let failed = ts
				? messageList.find((a) => parseInt(a.timestamp) === parseInt(ts))
				: messageList.find((a) => a.message === data.message);
			if (!failed) return;
			failed.error = true;
			messageList = messageList;
		});
	});

	onDestroy(() => {
		window.api.removeAllListeners('newMsg');
	});

	const isFile = (data) => {
		const findit = (arr) => {
			return arr.find((a) => parseInt(data.timestamp) === parseInt(a.timestamp || a.time));
		};
		let file = findit($files);
		if (file) {
			file.saved = true;
			return file;
		}
		const remote = findit($remoteFiles);
		if (remote) return remote;
		const local = findit($localFiles);
		if (local) return local;
		return false;
	};

	function sortMessages(arr) {
		const activeConv = getActiveConv();
		if (!activeConv) return removeDuplicates(arr);
		return removeDuplicates(
			[...arr, ...$messages.filter((x) => x.conversation === activeConv)].sort(
				(a, b) => b.timestamp - a.timestamp
			)
		);
	}

	function getActiveReceiver() {
		const activeConv = getActiveConv();
		if (!activeConv) return '';
		const activeKey = $user.activeChat?.key || '';
		return activeConv + activeKey;
	}
	async function loadMessages() {
		const activeConv = getActiveConv();
		if (!activeConv) return [];
		const dbMessages = await window.api.getConversation(activeConv, 0);
		return sortMessages(dbMessages);
	}

	const removeDuplicates = (arr) => {
		let uniq = {};
		return arr.filter(
			(obj) => !uniq[parseInt(obj.timestamp)] && (uniq[parseInt(obj.timestamp)] = true)
		);
	};

	function getActiveChat(chat) {
		return $keyboard.messages.get(chat);
	}

	//Prints conversation from active contact
	const printConversation = async (active) => {
		if (!active) return;
		messageList = [];
		$keyboard.input = '';
		const activeConv = active.conversation || active.address || active.chat || '';
		const active_chat = {
			address: activeConv,
			chat: activeConv,
			conversation: activeConv,
			key: active.key || '',
			name: active.name || active.nickname || 'Unknown'
		};
		$user.activeChat = active_chat;
		await window.api.markMessagesReadByChat(activeConv);
		const clear = $notify.unread.filter(
			(unread) => (unread.chat || unread.conversation || unread.address) !== activeConv
		);
		$notify.unread = clear;
		active_contact = activeConv + (active.key || '');

		const inChat = getActiveChat(activeConv);
		if (inChat) $keyboard.input = inChat.text;
		$keyboard = $keyboard;

		const allMessages = await loadMessages();

		let updated = [];
		for (const a of allMessages) {
			const file = isFile(a);
			if (file) a.file = file;
			updated.push(a);
		}
		messageList = removeDuplicates(updated);
		await tick();
		scrollDown();
	};

	//Chat to add
	const handleAddChat = (e) => {
		let addContact = e.chat + e.key;
		window.api.addChat(addContact, e.name, true);
		printConversation({
			conversation: e.chat,
			address: e.chat,
			chat: e.chat,
			key: e.key,
			name: e.name
		});
		wantToAdd = false;
	};
	//Update messages live if users keep chat mounted
	const printMessage = (data) => {
		messageList.unshift(data);
		messageList = messageList;
		scrollDown();
	};

	const scrollDown = async () => {
		await tick();
		if (!windowChat) return;
		const dir = getComputedStyle(windowChat).flexDirection;
		const isReversed = dir === 'column-reverse';
		windowChat.scrollTop = isReversed ? 0 : windowChat.scrollHeight;
	};

	run(() => {
		active_contact;
	});

	//Send message to store and DB
	const sendMsg = (e) => {
		let offChain = false;
		let beam = false;
		let msg = e.text;
		let error = checkErr(e);
		if (error) return;

		console.log('Sending message');

		if (e.offChain) {
			offChain = true;
		}

		if (e.beam) {
			beam = true;
			offChain = true;
		}

		const receiver = getActiveReceiver() || active_contact;
		if (!receiver || receiver.length !== 163) {
			window.api.errorMessage(t('noActiveChat') || 'No active chat selected.');
			return;
		}

		const timestamp = Date.now();
		let myMessage = {
			conversation: getActiveConv(),
			message: msg,
			sent: true,
			timestamp,
			beam: beam
		};

		$keyboard.input = '';

		printMessage(myMessage);
		window.api.sendMsg(msg, receiver, offChain, false, beam, false, timestamp);
		//printMessage(myMessage)
		console.log('Message sent');
	};

	//Check for possible errors
	const checkErr = (e) => {
		let error = false;
		if (e.text.length === 0) return true;
		if (e.text.length > 777) error = t('messageTooLong') || 'Message is too long';
		if ($user.wait)
			error =
				t('pleaseWaitBeforeSending') || 'Please wait a couple of minutes before sending a message.';
		if (!error) return false;

		window.api.errorMessage(error);
		return true;
	};

	//Default value should be false to hide the AddChat form.
	const openAdd = () => {
		wantToAdd = !wantToAdd;
	};

	function renameContact(e) {
		let thisContact = $user.rename.chat + $user.rename.key;
		//Send contact to backend and overwrite our old contact
		window.api.addChat(thisContact, e.text, false);
		toggleRename = false;
	}

	const openRename = (a) => {
		console.log('rename open!');
		toggleRename = !toggleRename;
	};

	const download = (link) => {
		console.log('downloading link', link);
		window.api.download(link);
	};

	async function dropFile(e) {
		dragover = false;
		if (!thisSwarm) {
			window.api.errorMessage(t('noConnection') || 'No connection...');
			return;
		}
		const { acceptedFiles, fileRejections } = e.detail;
		let filename = acceptedFiles[0].name;
		let path = acceptedFiles[0].path;
		let size = acceptedFiles[0].size;
		const activeConv = getActiveConv();
		let toHuginAddress = activeConv + ($user.activeChat?.key || '');
		let time = Date.now();
		let offchain = false;
		const hash = await window.api.createGroup();
		const beam = true;

		acceptedFiles[0].fileName = filename;
		acceptedFiles[0].time = time;
		acceptedFiles[0].conversation = activeConv;
		acceptedFiles[0].saved = true;

		if (fileRejections.length) {
			console.log('rejected file');
			return;
		}

		let message = {
			conversation: activeConv,
			message: '',
			sent: true,
			timestamp: time,
			file: acceptedFiles[0]
		};
		printMessage(message);

		window.api.groupUpload(filename, path, activeConv, size, time, hash, !beam);
	}

	function drag() {
		dragover = true;
	}

	function nodrag() {
		dragover = false;
	}

	const sendTransaction = (e) => {
		$transactions.tip = false;
		$transactions.send = false;
		let tx = e;
		window.api.sendTransaction(tx);
	};
	const hideModal = () => {
		$transactions.tip = false;
		$transactions.send = { name: '' };
	};

	let loadMore = $state(true);

	const noLoad = () => {
		pageNum--;
		loadMore = false;
		return;
	};

	async function loadMoreMessages() {
		pageNum++;
		const more = await window.api.getConversation(getActiveConv(), pageNum);
		messageList = sortMessages([...messageList, ...more]);
		if (more.length === 0) {
			noLoad();
			return;
		}
	}

	let imTyping = false;
	const typing = (e) => {
		if (imTyping === e.typing) return;
		imTyping = e.typing;
		if ($swarm.activeSwarm?.key) return;
		window.api.send('typing', { key: $swarm.activeSwarm?.key, typing: e.typing });
	};
	let lastContactFromUrl = null;

	$effect(() => {
		const contactId = $page.url.searchParams.get('chat');
		if (!contactId) return;

		// prevent loops
		if (contactId === lastContactFromUrl) return;

		// wait until contacts are loaded
		if (!$user.contacts?.length) return;

		const contact = $user.contacts.find(
			(c) => (c.chat || c.conversation || c.address) === contactId
		);

		if (!contact) {
			console.log('No contact found');
			return;
		}

		lastContactFromUrl = contactId;
		const active_chat = {
			address: contactId,
			chat: contactId,
			conversation: contactId,
			key: contact.key || '',
			name: contact.name || contact.nickname || 'Anon'
		};
		printConversation(active_chat);
	});

	const handlePaste = async (e) => {
		// First check for files with paths (like from File Explorer)
		if (e.clipboardData && e.clipboardData.files.length > 0) {
			const files = Array.from(e.clipboardData.files);
			// Check if the file has a path (from file system)
			if (files[0].path) {
				e.preventDefault();
				const event = {
					detail: {
						acceptedFiles: files,
						fileRejections: []
					}
				};
				dropFile(event);
				return;
			}
		}

		// Check for clipboard items (like screenshots without file paths)
		if (e.clipboardData && e.clipboardData.items) {
			for (const item of e.clipboardData.items) {
				if (item.type.startsWith('image/')) {
					e.preventDefault();
					const blob = item.getAsFile();
					if (!blob) continue;

					// Convert blob to base64
					const reader = new FileReader();
					reader.onload = async () => {
						const base64Data = reader.result;
						const extension = blob.type.split('/')[1] || 'png';
						const filename = `screenshot.${extension}`;

						// Save to temp file via IPC
						const result = await window.api.saveClipboardImage(base64Data, filename);
						if (result && result.path) {
							// Create a file-like object with the path
							const fileObj = {
								name: filename,
								path: result.path,
								size: result.size,
								type: blob.type
							};
							const event = {
								detail: {
									acceptedFiles: [fileObj],
									fileRejections: []
								}
							};
							dropFile(event);
						}
					};
					reader.readAsDataURL(blob);
					return;
				}
			}
		}
	};
</script>

<svelte:window on:paste={handlePaste} />

{#if $fileViewer.enhanceImage}
	<BigImage />
{/if}

{#if toggleRename}
	<Rename
		onRename={(a) => renameContact(a)}
		OpenRename={openRename}
		this_contact={contact}
		on:click={openRename}
	/>
{/if}

{#if wantToAdd}
	<AddChat on:click={openAdd} AddChat={(e) => handleAddChat(e)} />
{/if}

{#if dragover}
	<DropFile />
{/if}

{#if $transactions.tip}
	<SendTransaction on:click={hideModal} onSendTx={(e) => sendTransaction(e)} />
{/if}

<Dropzone
	noClick={true}
	disableDefaultStyles={true}
	on:dragover={() => drag()}
	on:dragleave={() => nodrag()}
	on:drop={dropFile}
>
	<main in:fade|global={{ duration: 250 }}>
		<ChatList
			OpenRename={(a) => openRename(a)}
			onConversation={(e) => printConversation(e)}
			onOpen={openAdd}
		/>

		<div class="right_side" out:fade|global={{ duration: 100 }}>
			<div
				class="outer"
				id="chat_window"
				in:fly|global={{ y: 50 }}
				bind:this={windowChat}
				bind:clientHeight={windowHeight}
			>
				<div class="fade"></div>
				{#each messageList as message, i (message.timestamp)}
					{@const nextMessage = i < messageList.length - 1 ? messageList[i + 1] : null}
					{@const currentSender = message.sent
						? $user.myAddress
						: message.conversation || message.chat}
					{@const nextSender = nextMessage
						? nextMessage.sent
							? $user.myAddress
							: nextMessage.conversation || nextMessage.chat
						: null}
					{@const currentTs = parseInt(message.timestamp)}
					{@const nextTs = nextMessage ? parseInt(nextMessage.timestamp) : null}
					{@const isGrouped =
						nextMessage &&
						currentSender === nextSender &&
						!nextMessage.file &&
						!message.file &&
						currentTs - nextTs < 300000}
					<div animate:flip={{ duration: 100 }}>
						<ChatBubble
							on:download={() => download(message.message)}
							files={message.file}
							message={message.message}
							ownMsg={message.sent}
							msgFrom={message.conversation}
							timestamp={message.timestamp}
							beamMsg={message.beam}
							error={message?.error}
							grouped={isGrouped}
						/>
					</div>
				{/each}
				{#if messageList.length > 99 && loadMore}
					<Button
						text={t('loadMore') || 'Load more'}
						disabled={false}
						on:click={() => loadMoreMessages()}
					/>
				{/if}
			</div>
			<ChatInput onMessage={sendMsg} onTyping={(e) => typing(e)} />
		</div>
	</main>
</Dropzone>

<style lang="scss">
	main {
		display: flex;
		margin-left: 85px;
		height: 100vh;
		overflow: hidden;
		z-index: 3;
		width: 100%;
	}

	.right_side {
		display: flex;
		flex-direction: column;
		justify-content: flex-end;
		position: relative;
		width: 100%;
		margin-right: 170px;
		position: relative;
	}

	.inner {
		display: flex;
		flex-direction: column;
		padding-top: 20px;
		width: 100%;
	}

	.outer {
		display: flex;
		flex-direction: column-reverse;
		overflow: scroll;
	}

	.fade {
		position: absolute;
		top: 0;
		width: 100%;
		height: 40px;
		background: linear-gradient(180deg, var(--fade-color), var(--fade-to-color));
		z-index: 100;
		pointer-events: none;
	}

	.outer {
		--scrollbarBG: transparent;
		--thumbBG: #3337;
		overflow: auto;
		scrollbar-width: thin;
		scrollbar-color: var(--thumbBG) var(--scrollbarBG);
	}

	.outer::-webkit-scrollbar {
		width: 8px;
	}

	.outer::-webkit-scrollbar-track {
		background: var(--scrollbarBG);
	}

	.outer::-webkit-scrollbar-thumb {
		background-color: var(--thumbBG);
		border-radius: 3px;
		border: 3px solid var(--scrollbarBG);
	}
</style>
