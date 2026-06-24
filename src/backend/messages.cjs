const { keychain } = require('./crypto.cjs');
const {
	loadKnownTxs,
	saveHash,
	saveGroupMsg,
	messageExists,
	saveMsg,
	saveThisContact,
	getConversation,
	getConversations,
	getContacts,
	getMessages,
	removeMessages,
	removeContact,
	addGroup,
	unBlockContact,
	loadBlockList,
	blockContact,
	getGroupReply,
	loadGroups,
	deleteMessage,
	deletePrivateMessage,
	addRoom,
	addRoomKeys,
	printFeed,
	removeRoom,
	saveFeedMessage,
	getFeedMessageReplies,
	getUnreadMessages,
	getUnreadGroupMessages,
	getUnreadFeedMessages,
	markMessagesReadByChat,
	markGroupMessagesReadByGroup,
	markAllFeedMessagesRead,
	markMessageRead,
	markGroupMessageRead,
	markFeedMessageRead,
	getFriendRequests,
	removeFriendRequest
} = require('./database.cjs');
const {
	trimExtra,
	sanitize_pm_message,
	sleep,
	hexToUint,
	randomKey,
	nonceFromTimestamp,
	toHex
} = require('./utils.cjs');
const { sanitize_group_message } = require('hugin-p2p/utils');

const {
	send_swarm_message,
	new_swarm,
	end_swarm,
	Nodes,
	send_feed_message
} = require('./swarm.cjs');

const { Address, Crypto, CryptoNote } = require('kryptokrona-utils');
const hc = require('hugin-crypto');
const { default: fetch } = require('electron-fetch');
const sodium = require('sodium-native');
const { sanitizeHtml } = require('./utils.cjs');
const crypto = new Crypto();
const xkrUtils = new CryptoNote();
const { ipcMain, powerMonitor } = require('electron');
const Store = require('electron-store');
const { Hugin } = require('./account.cjs');
const { expand_sdp_offer, parse_sdp } = require('./sdp.cjs');
const store = new Store();
const { Notification } = require('electron');

let known_pool_txs = [];
let block_list = [];
let incoming_messages = [];
let incoming_pm_que = [];
let incoming_group_que = [];
const BACKGROUND_SYNC_INTERVAL = 1000 * 15;
//IPC MAIN LISTENERS
//MISC

// ipcMain.on('optimize', async (e) => {
//     optimize_message_inputs(force = true)
// })
//GROUPS MESSAGES

ipcMain.on('notify-room', (e, data) => {
	console.log('Send notification', data);
	const notification = new Notification({
		title: data.name + ' in ' + data.roomName,
		body: data.message,
		icon: 'src/static/icon.png'
	});
	notification.show();
});

ipcMain.on('notify-dm', (e, data) => {
	const notification = new Notification({
		title: data.name,
		body: data.message,
		icon: 'src/static/icon.png'
	});
	notification.show();
});

ipcMain.on('send-room-message', (e, m) => {
	send_room_message(m);
});

ipcMain.handle('send-feed-message', async (e, m) => {
	const sent = await send_feed_message(m.message, m.reply, false);
	saveFeedMessage(sent);
	return sent;
});

ipcMain.handle('get-feed-replies', async (e, hash) => {
	const replies = await getFeedMessageReplies(hash);
	return replies;
});

ipcMain.handle('get-group-reply', async (e, data) => {
	return await getGroupReply(data);
});

ipcMain.handle('create-group', async () => {
	return randomKey();
});

ipcMain.on('add-group', async (e, grp) => {
	if (!grp?.key || !grp?.name) return;
	addGroup(grp);
	const timestamp = Date.now();
	const message = sanitize_group_message({
		timestamp: String(timestamp),
		room: grp.key,
		message: 'Joined group',
		address: Hugin.address,
		reply: '',
		signature: '',
		name: Hugin.nickname,
		hash: randomKey(),
		tip: false
	});
	if (!message) return;
	message.sent = true;
	save_group_message(message, message.hash, parseInt(message.timestamp), false, false, true);
});

ipcMain.on('add-room', async (e, room, admin) => {
	if (!room?.key || !room?.name) return;
	addRoom(room);
	if (!Hugin.syncImages.includes(room.key)) {
		Hugin.syncImages.push(room.key);
		store.set({ syncImages: Hugin.syncImages });
	}
	const timestamp = Date.now();
	const message = sanitize_group_message({
		timestamp: String(timestamp),
		room: room.key,
		message: 'Joined room',
		address: Hugin.address,
		reply: '',
		signature: '',
		name: Hugin.nickname,
		hash: room.hash || randomKey(),
		tip: false
	});
	if (!message) return;
	message.sent = true;
	save_group_message(message, message.hash, parseInt(message.timestamp), false, false, true, true);
	if (admin) addRoomKeys(room.key, admin);
	new_swarm({ key: room.key });
});

ipcMain.on('remove-room', async (e, room) => {
	end_swarm(room);
	removeRoom(room);
});

ipcMain.on('unblock', async (e, address) => {
	unBlockContact(address);
	block_list = await loadBlockList();
	Hugin.block_list = block_list;
	Hugin.send('update-blocklist', block_list);
});

ipcMain.on('block', async (e, block) => {
	blockContact(block.address, block.name);
	block_list = await loadBlockList();
	Hugin.block_list = block_list;
	Hugin.send('update-blocklist', block_list);
});

ipcMain.on('delete-message', async (e, hash) => {
	deleteMessage(hash);
});

ipcMain.on('delete-messages-after', async (e, days) => {
	if (days === 0) days = 100000;
	store.set({
		delete: {
			after: days
		}
	});
});

ipcMain.handle('get-feed-messages', async (e, page) => {
	return await printFeed(page);
});

ipcMain.handle('get-conversation', async (e, chat, page) => {
	return await getConversation(chat, page);
});

ipcMain.handle('get-unread-messages', async () => getUnreadMessages());
ipcMain.handle('get-unread-group-messages', async () => getUnreadGroupMessages());
ipcMain.handle('get-unread-feed-messages', async () => getUnreadFeedMessages());
ipcMain.handle('mark-messages-read-by-chat', async (e, chat) => markMessagesReadByChat(chat));
ipcMain.handle('mark-group-messages-read-by-group', async (e, grp) =>
	markGroupMessagesReadByGroup(grp)
);
ipcMain.handle('mark-all-feed-messages-read', async () => markAllFeedMessagesRead());
ipcMain.handle('mark-message-read', async (e, timestamp) => markMessageRead(timestamp));
ipcMain.handle('mark-group-message-read', async (e, hash) => markGroupMessageRead(hash));
ipcMain.handle('mark-feed-message-read', async (e, hash) => markFeedMessageRead(hash));

//PRIVATE MESSAGES

ipcMain.on('hugin-node', (e, { address, pub }) => {
	Nodes.change(address, pub);
	store.set({
		huginNode: {
			address,
			pub
		}
	});
	Hugin.huginNode = { address, pub };
});

Nodes.on('new-message', (messages) => {
	console.log('New messages from node', messages.length);
	decrypt_hugin_messages(messages);
});

ipcMain.handle('get-conversations', async (e) => {
	let contacts = await getConversations();
	return contacts.reverse();
});

ipcMain.handle('get-messages', async (data) => {
	return await getMessages();
});

ipcMain.on('send-msg', (e, msg, receiver, p2p, grp, beam, call, timestamp) => {
	send_message(msg, receiver, p2p, grp, beam, call, timestamp);
});

//Listens for event from frontend and saves contact and nickname.
ipcMain.on('add-chat', async (e, hugin_address, nickname, first) => {
	//The contact id is the 99-char xkr address (tolerate a legacy 163 string).
	const chat = typeof hugin_address === 'string' ? hugin_address.substring(0, 99) : '';
	if (chat.length !== 99) {
		Hugin.send('error-notify-message', 'Invalid contact length');
		return;
	}
	save_contact(chat, nickname, first);
	const key = await key_derivation_hash(chat);
	new_swarm({ key }, true, chat);
});

// ipcMain.handle('get-friend-requests', async () => {
//     return await getFriendRequests()
// })

// ipcMain.on('accept-friend-request', async (e, address) => {
//     const p2p = require('./p2p.cjs').get()
//     const requests = await getFriendRequests()
//     const req = requests.find(r => r.address === address)
//     if (!req) return
//     const hugin = req.hugin
//     const name = req.name || 'Anon'
//     save_contact(hugin, name, true)
//     const chat = hugin.substring(0, 99)
//     const key = await key_derivation_hash(chat)
//     new_swarm({key}, true, hugin)

//     const sentViaRoom = p2p && req.room ? p2p.acceptFriendRequest(address, req.room) : false
//     if (!sentViaRoom) {
//         save_message({
//             message: 'Accepted friend request',
//             key: hugin.substring(99, 163),
//             conversation: chat,
//             sent: true,
//             timestamp: Date.now(),
//         })
//     }

//     await removeFriendRequest(address)
//     const remaining = await getFriendRequests()
//     Hugin.send('friend-requests-updated', remaining)
// })

// ipcMain.on('reject-friend-request', async (e, address) => {
//     await removeFriendRequest(address)
//     const remaining = await getFriendRequests()
//     Hugin.send('friend-requests-updated', remaining)
// })

// ipcMain.on('send-friend-request', (e, address, roomKey) => {
//     const p2p = require('./p2p.cjs').get()
//     if (p2p) p2p.sendFriendRequest(address, roomKey)
// })

ipcMain.on('remove-contact', async (e, contact) => {
	removeContact(contact);
	removeMessages(contact);
	end_swarm(contact, true);
	Hugin.send('sent');
});

ipcMain.on('get-sdp', (e, data) => {
	get_sdp(data);
});

ipcMain.on('expand-sdp', (e, data, address) => {
	let recovered_data = expand_sdp_offer(data, true);
	let expanded_data = [recovered_data, address];
	Hugin.send('got-expanded', expanded_data);
});

//BEAM

ipcMain.on('end-beam', async (e, chat) => {
	console.log('end beam');
	end_swarm(chat, true);
});

ipcMain.on('beam', async (e, chat) => {
	const key = await key_derivation_hash(chat.substring(0, 99));
	let beamMessage = new_swarm({ key }, true, chat);
	if (beamMessage === 'Error') return;
	if (!beamMessage) return;
});

//SWARM

ipcMain.on('new-swarm', async (e, data) => {
	new_swarm(data);
});
ipcMain.on('end-swarm', async (e, key) => {
	end_swarm(key);
});

const peer_dms = async () => {
	//Add a small delay before we start our dm p2p connections during startup.
	await sleep(5555)
	const contacts = await getConversations();
	for (const c of contacts) {
		if (c.conversation?.length !== 99) continue;
		const hashDerivation = await key_derivation_hash(c.conversation);
		if (!hashDerivation) continue;
		const beam = new_swarm({ key: hashDerivation }, true, c.conversation + c.key);
		if (beam === 'Error') continue;
		if (!beam) continue;
	}
};

async function key_derivation_hash(chat) {
	try {
		const [privateSpendKey, privateViewKey] = keychain.getPrivKeys();
		const recvAddr = await Address.fromAddress(chat);
		const recvPubKey = recvAddr.m_keys.m_viewKeys.m_publicKey;
		const derivation = await crypto.generateKeyDerivation(recvPubKey, privateViewKey);
		return await crypto.cn_fast_hash(derivation);
	} catch (e) {
		return false;
	}
}

const start_message_syncer = async () => {
	//Load knownTxsIds to backgroundSyncMessages on startup
	peer_dms();
	console.log('Hugin.huginNode', Hugin.huginNode);
	Nodes.on('connected', () => {
		console.log('Node connected, resetting message syncer');
		const lastChecked = store.get('pool.checked');
		if (lastChecked) {
			store.set({ pool: { checked: lastChecked - 30000 } });
		}
	});
	Nodes.connect(Hugin.huginNode.address, Hugin.huginNode.pub);
	await sleep(5000);
	block_list = Hugin.block_list;
	await background_sync_messages(await load_checked_txs());
	while (true) {
		try {
			//Start syncing
			await sleep(BACKGROUND_SYNC_INTERVAL);
			await background_sync_messages();

			const idle = powerMonitor.getSystemIdleTime();
			Hugin.send('idle', idle);

			const [walletBlockCount, localDaemonBlockCount, networkBlockCount] =
				await Hugin.wallet.getSyncStatus();

			Hugin.send('node-sync-data', {
				walletBlockCount,
				localDaemonBlockCount,
				networkBlockCount
			});

			if (localDaemonBlockCount - walletBlockCount < 2) {
				// Diff between wallet height and node height is 1 or 0, we are synced
				console.log('**********SYNCED**********');
				console.log('My Wallet ', walletBlockCount);
				console.log('The Network', networkBlockCount);
				Hugin.send('sync', 'Synced');
			} else {
				//If wallet is somehow stuck at block 0 for new users due to bad node connection, reset to the last 100 blocks.
				if (walletBlockCount === 0) {
					await Hugin.wallet.reset(networkBlockCount - 100);
				}
				console.log('*.[~~~].SYNCING BLOCKS.[~~~].*');
				console.log('My Wallet ', walletBlockCount);
				console.log('The Network', networkBlockCount);
				Hugin.send('sync', 'Syncing');
			}
		} catch (err) {
			console.log(err);
		}
	}
};

async function background_sync_messages(checkedTxs = false) {
	console.log('Background syncing...');
	const incoming = incoming_messages.length > 0 ? true : false;
	//First start, set known pool txs
	if (checkedTxs) {
		known_pool_txs = await set_known_pooltxs(checkedTxs);
	}
	const transactions = await fetch_hugin_messages();
	if (!transactions && !incoming) return;
	const large_batch = transactions.length > 299 ? true : false;

	if (large_batch || (large_batch && incoming)) {
		//Add to que
		console.log('Adding que:', transactions.length);
		incoming_messages = transactions;
		Hugin.send('incoming-que', true);
	}

	if (incoming_pm_que.length) {
		clear_pm_que();
	}

	if (incoming || large_batch) {
		console.log('Checking incoming messages:', incoming_messages.length);
		await decrypt_hugin_messages(update_que(), true);
		if (incoming_group_que.length) {
			await clear_group_que();
		}
		return;
	}

	if (transactions.length < 5) Hugin.send('incoming-que', false);
	console.log('Incoming transactions', transactions.length);
	decrypt_hugin_messages(transactions, false);
}

function update_que() {
	const decrypt = incoming_messages.slice(0, 299);
	const update = incoming_messages.slice(decrypt.length);
	incoming_messages = update;
	return decrypt;
}

async function decrypt_hugin_messages(list, que = false) {
	console.log('Checking nr of txs:', list.length);
	for (const message of list) {
		try {
			const thisHash = message.hash;
			const thisExtra = '99' + thisHash + message.cipher;

			if (!validate_extra(thisExtra, thisHash, que)) continue;
			if (thisExtra !== undefined && thisExtra.length > 200) {
				if (!saveHash(thisHash)) continue;
				//Check for private message (ephemeral friend-request box; the
				//view tag is matched against our view key inside the decrypt).
				if (await check_for_pm_message(thisExtra, que)) continue;
				//Check for group message
				if (await check_for_group_message(thisExtra, thisHash, que)) continue;
			}
		} catch (err) {
			console.log(err);
		}
	}
}

//Try decrypt extra data as an ephemeral, signed PM box (hugin-crypto)
async function check_for_pm_message(thisExtra, que = false) {
	const wire = hc.decodeExtra(thisExtra);
	if (!wire || !wire.vt || !wire.txKey) return false;
	const [, privateViewKey] = keychain.getPrivKeys();
	const decrypted = await hc.openFriendRequest(wire, { privateViewKey });
	if (!decrypted) return false;
	const message = {
		from: decrypted.from,
		msg: decrypted.msg,
		name: decrypted.name,
		t: decrypted.t,
		type: 'sealedbox',
		sent: false
	};
	if (que) {
		incoming_pm_que.push(message);
		return true;
	}
	await save_message(message);
	return true;
}

async function clear_pm_que() {
	const sorted = incoming_pm_que.sort((a, b) => a.t - b.t);
	for (const message of sorted) {
		await save_message(message);
	}
	incoming_pm_que = [];
}

async function clear_group_que() {
	const sorted = incoming_group_que.sort((a, b) => a.t - b.t);
	for (const message of sorted) {
		await decrypt_group_message(message, message.hash);
	}
	incoming_group_que = [];
}

//Checks if hugin message is from a group
async function check_for_group_message(thisExtra, thisHash, que = false) {
	try {
		let group = trimExtra(thisExtra);
		let message = JSON.parse(group);
		if (message.sb) {
			if (que) {
				message.hash = thisHash;
				incoming_group_que.push(message);
				return true;
			}
			await decrypt_group_message(message, thisHash);
			return true;
		}
	} catch {}
	return false;
}

//Validate extradata, here we can add more conditions
function validate_extra(thisExtra, thisHash, que) {
	if (typeof thisExtra !== 'string') return false;
	if (typeof thisHash !== 'string') return false;
	//Extra too long
	if (thisExtra.length > 7000) {
		known_pool_txs.push(thisHash);
		if (!saveHash(thisHash)) return false;
		return false;
	}
	//Check if known tx, if que is true we already know it but should check anyway
	if (que) return true;
	if (known_pool_txs.indexOf(thisHash) === -1) {
		known_pool_txs.push(thisHash);
		return true;
	} else {
		//Tx already known
		return false;
	}
}

async function load_checked_txs() {
	//Load known pool txs from db.
	let checkedTxs = await loadKnownTxs();
	let arrayLength = checkedTxs.length;

	if (arrayLength > 500) {
		checkedTxs = checkedTxs.slice(arrayLength - 500, arrayLength - 1).map(function (knownTX) {
			return knownTX.hash;
		});
	} else {
		checkedTxs = [];
	}

	return checkedTxs;
}

//Set known pool txs on start
function set_known_pooltxs(checkedTxs) {
	//Here we can adjust number of known we send to the node
	known_pool_txs = checkedTxs;
	//Can't send undefined to node, it wont respond
	let known = known_pool_txs.filter((a) => a !== undefined);
	return known;
}

async function sync_from_node(node) {
	if (Nodes.connection === null) return [];
	const lastChecked = store.get('pool.checked');

	try {
		const resp = await Promise.race([
			Nodes.sync({
				request: true,
				type: 'some',
				timestamp: lastChecked
			}),
			new Promise((_, reject) =>
				setTimeout(() => reject(new Error('Sync timed out')), 10000)
			)
		]);
		return resp;
	} catch (err) {
		console.log('sync_from_node error:', err.message);
		return [];
	}
}

async function fetch_hugin_messages() {
	const node = Hugin.node;
	const incoming = incoming_messages.length > 0 ? true : false;
	//If we already have pending incoming unchecked messages, return
	//So we do not update the latest checked timestmap and miss any messages.
	if (incoming) return false;
	//Latest version, fetch more messages with last checked timestamp
	const list = await sync_from_node(node);

	if (list.length === 0) {
		console.log('No incoming messages...');
		return false;
	}

	store.set({
		pool: {
			checked: Date.now() - 1000
		}
	});

	return list;
}

async function generate_push_view_tag(address, call) {
	const myAddr = await Address.fromAddress(address);
	const pubKey = myAddr.m_keys.m_viewKeys.m_publicKey;
	const weeklyTimestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24 * 7));
	const hashInput = toHex(String(pubKey) + String(weeklyTimestamp));
	const hash = await crypto.cn_fast_hash(hashInput);
	return call ? hash : hash.substring(0, 3);
}

// Routing for a private message:
//   p2p === false  → relay via the hugin push node (default).
//   p2p === true   → direct over the swarm/beam channel (no node).
async function send_message(
	message,
	receiver,
	p2p = false,
	group = false,
	beam_this = false,
	call = false,
	forced_timestamp = false
) {
	if (message.length === 0) {
		return;
	}

	//xkr address only — tolerate a legacy 163-char string by taking the address part.
	const address = typeof receiver === 'string' ? receiver.substring(0, 99) : '';
	if (address.length !== 99) {
		return;
	}

	let timestamp = Date.now();
	if (forced_timestamp !== false && forced_timestamp !== undefined && forced_timestamp !== null) {
		const parsed = parseInt(forced_timestamp, 10);
		if (!Number.isNaN(parsed)) {
			timestamp = parsed;
		}
	}
	const payload_hex = await encrypt_hugin_message(message, address);
	//Choose subwallet with message inputs
	const viewtag = await generate_push_view_tag(address, call);

	const saveThisMessage = {
		message,
		key: '',
		sent: true,
		timestamp: String(timestamp),
		conversation: address,
		reply: '',
		tip: ''
	};

	if (!p2p) {
		// Node-relayed: save immediately so the message isn't lost if the app
		// closes mid-send.
		await save_message(saveThisMessage, true);

		// Send to push node. If it fails, remove from DB
		const sent = await Promise.race([
			Nodes.message(payload_hex, viewtag, call ? 'call' : 'dm'),
			sleep(200000).then(() => ({ success: false, reason: 'Timeout' }))
		]);

		if (typeof sent?.success !== 'boolean' || !sent.success) {
			deletePrivateMessage(saveThisMessage.timestamp);
			Hugin.send('pm-send-error', {
				timestamp,
				message,
				conversation: address,
				reason: sent?.reason || 'Failed'
			});
			// Update conversation list after removal
			Hugin.send('sent');
			if (typeof sent?.reason === 'string' && sent.reason.length <= 40) {
				console.log('Reason:', sent.reason);
				Hugin.send('error-notify-message', sent.reason);
			}
			return;
		}
	} else if (p2p) {
		// P2P (swarm/beam): ship the cipher as-is. The deterministic
		// content-addressed id (hc.messageHash) lets both sides identify the
		// message without a randomKey prefix riding along on the wire.
		if (beam_this) {
			send_swarm_message(payload_hex, address, true);
		}
	}
	save_message(saveThisMessage, true);
}

async function encrypt_hugin_message(message, toAddr) {
	// Every PM is an ephemeral, signed friend-request-style box: a fresh one-time
	// key derives the secret from the recipient's view key, so each message has a
	// unique view tag (unlinkable on-chain) and is authenticated by our signature.
	const my_address = Hugin.wallet.getPrimaryAddress();
	const [privateSpendKey] = keychain.getPrivKeys();
	const wire = await hc.createFriendRequest({
		message,
		sender: { address: my_address, privateSpendKey },
		toAddress: toAddr,
		name: Hugin.nickname
	});
	return hc.encodeExtra(wire);
}

async function send_room_message(message) {
	console.log('Send this!', message);
	const normalized = sanitize_group_message(message);
	if (!normalized) return;
	normalized.sent = true;
	const swarmMessage = JSON.stringify(normalized);
	//Swarm message is already encrypted over the connection
	send_swarm_message(swarmMessage, normalized.room);
	save_group_message(normalized, normalized.hash, normalized.timestamp, false, true, false, true);
	await send_room_message_push(normalized);
}

async function generate_room_view_tag(room) {
	const hash = await crypto.cn_fast_hash(room);
	return hash.substring(0, 5);
}

async function send_room_message_push(message) {
	try {
		const roomKey = message.room.substring(0, 64);
		// secretbox key = the 32-byte room key itself.
		const key = Buffer.from(hexToUint(roomKey));

		const payload_message = {
			message: message.message,
			reply: message.reply,
			tip: message.tip || '',
			hash: message.hash,
			name: message.name,
			address: message.address
		};
		const payload_bytes = Buffer.from(JSON.stringify(payload_message));

		const timestamp = message.timestamp;
		const nonce = Buffer.from(nonceFromTimestamp(timestamp));

		// inner: libsodium secretbox keyed by the room key
		const inner = Buffer.alloc(payload_bytes.length + sodium.crypto_secretbox_MACBYTES);
		sodium.crypto_secretbox_easy(inner, payload_bytes, nonce, key);

		const payload_json = {
			box: inner.toString('hex'),
			viewTag: await generate_room_view_tag(message.room)
		};
		const payload_json_bytes = Buffer.from(JSON.stringify(payload_json));

		// outer: libsodium anonymous sealed box (never opened client-side; the
		// node routes the push by the plaintext viewTag arg below).
		const fixedPub = Buffer.from(
			'6e18d19b3c94f7c2c4da5dc6f17305f8ab6da33f8beb18e63a0f048d2a21c345',
			'hex'
		);
		const sealed = Buffer.alloc(payload_json_bytes.length + sodium.crypto_box_SEALBYTES);
		sodium.crypto_box_seal(sealed, payload_json_bytes, fixedPub);

		//Box object
		let payload_box = {
			box: sealed.toString('hex'),
			t: timestamp
		};
		// Convert json to hex
		let payload_hex = toHex(JSON.stringify(payload_box));

		const sent = await Nodes.message(
			payload_hex,
			await generate_room_view_tag(message.room),
			'room',
			message.hash
		);
		if (!sent || sent.success !== true) {
			const reason =
				sent && typeof sent.reason === 'string' ? sent.reason : 'push_registration_failed';
			console.log('❌ Push registration failed:', reason);
		}
	} catch (e) {
		console.log('❌ Error sending push:', e);
	}
}

const check_balance = async () => {
	try {
		let [munlockedBalance, mlockedBalance] = await Hugin.wallet.getBalance();

		if (munlockedBalance < 11) {
			Hugin.send('error-notify-message', 'Not enough unlocked funds.');
			return false;
		}
	} catch (err) {
		return false;
	}
	return true;
};

async function save_group_message(
	msg,
	hash,
	time,
	offchain,
	channel = false,
	add = false,
	room = false
) {
	const saved = await saveGroupMsg(msg, hash, time, offchain, channel);
	if (!saved) return false;
	if (room) {
		Hugin.send('added-room', msg.room);
		Hugin.send('roomMsg', saved);
		Hugin.send('sent_room');
		return;
	}
	if (!offchain) {
		//Send new board message to frontend.
		Hugin.send('groupMsg', saved);
		Hugin.send('group-notification', [saved, add]);
	} else if (offchain) {
		if (saved.message === 'ᛊNVITᛊ') return;
		Hugin.send('groupRtcMsg', saved);
	}
}

// Saves a private message.
//   p2p === true  → delivered via the swarm/beam channel.
//   p2p === false → delivered via the push node relay.
async function save_message(msg, p2p = false) {
	const result = sanitize_pm_message(msg);
	if (!result.message) return;

	let { message, conversation, key, timestamp, sent } = result;

	if (await messageExists(timestamp)) return;

	if (msg.conversation && sent) {
		conversation = msg.conversation;
	}

	// First message from an unknown sender: save them as a contact and open the
	// direct (beam) channel. The xkr address is the whole identity now.
	if (!sent) {
		const known = (await getContacts()).some((c) => c.address === conversation);
		if (!known) {
			await save_contact(conversation, msg.name);
			const hash = await key_derivation_hash(conversation);
			new_swarm({ key: hash }, true, conversation);
		}
	}

	let newMsg = await saveMsg(message, conversation, sent, timestamp, p2p);
	if (sent) {
		Hugin.send('sent', newMsg);
		return;
	}
	Hugin.send('newMsg', newMsg);
	Hugin.send('privateMsg', newMsg);
}

//Saves contact and nickname to db. Accepts a 99-char xkr address (tolerates a
//legacy 163-char string by taking the address part).
async function save_contact(address, nickname = false, first = false) {
	const name = nickname || 'Anon';
	const addr = address.substring(0, 99);

	await saveThisContact(addr, '', name);
	Hugin.send('saved-addr', addr);

	if (first) {
		await save_message({
			message: 'New friend added!',
			key: '',
			conversation: addr,
			sent: true,
			timestamp: Date.now()
		});
	}
}

function get_sdp(data) {
	if (data.type == 'offer') {
		let parsed_data = `${data.video ? 'Δ' : 'Λ'}` + parse_sdp(data.data, false);
		send_message(parsed_data, data.contact, true, data.group, true);
	} else if (data.type == 'answer') {
		let parsed_data = `${data.video ? 'δ' : 'λ'}` + parse_sdp(data.data, true);
		send_message(parsed_data, data.contact, true, data.group, true);
	}
}

ipcMain.on('fetch-group-history', async (e, settings) => {
	let timeframe = Date.now() / 1000 - settings.timeframe * 86400;
	//If key is not undefined we know which group to search messages from
	if (settings.key === undefined) settings.key = false;
	//Clear known pool txs to look through messages we already marked as known
	known_pool_txs = [];
	await sync_group_history(timeframe, settings.recommended_api, settings.key);
});

module.exports = {
	save_message,
	start_message_syncer,
	send_message,
	save_contact,
	new_swarm,
	key_derivation_hash
};
