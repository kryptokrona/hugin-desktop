const {
	saveHash,
	knownTxExists,
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
const { trimExtra, sanitize_pm_message, sleep, randomKey } = require('./utils.cjs');
// Rooms, DM swarms, the feed and the hugin-node connection (hugin-network's HuginP2P, p2p-host.cjs).
const P2P = require('./p2p-host.cjs').instance();

//A room message this app creates and only saves: hash derived from the fields, signed with the
//wallet's spend key; null when it cannot be built.
const own_room_message = (fields) => P2P.ownRoomMessage(fields);
// Push payloads and view tags.
const push = require('hugin-network/push');

const new_swarm = (data, beam = false, chat = false) => P2P.newSwarm(data, beam, chat);
const end_swarm = (key, beam = false) => P2P.endSwarm(key, beam);

// Direct messages: the wallet's DmCrypto (hugin-network/dm) builds and opens the DM payloads.
const identity = require('./identity.cjs');
const { default: fetch } = require('electron-fetch');
const { ipcMain, powerMonitor } = require('electron');
const Store = require('electron-store');
const { Hugin } = require('./account.cjs');
const { expand_sdp_offer, parse_sdp } = require('./sdp.cjs');
const store = new Store();
const { Notification } = require('electron');
const { isHex64, notificationTitle, notificationBody } = require('./validate.cjs');

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

// Notification text is plain text: markup is removed, and the body is escaped where the
// notification server interprets markup (see validate.cjs).
const show_notification = (title, body) => {
	try {
		const notification = new Notification({
			title: notificationTitle(title),
			body: notificationBody(body),
			icon: 'src/static/icon.png'
		});
		notification.show();
	} catch (err) {
		console.log('Notification failed:', err);
	}
};

ipcMain.on('notify-room', (e, data) => {
	if (!data || typeof data !== 'object') return;
	show_notification(notificationTitle(data.name) + ' in ' + notificationTitle(data.roomName), data.message);
});

ipcMain.on('notify-dm', (e, data) => {
	if (!data || typeof data !== 'object') return;
	show_notification(data.name, data.message);
});

ipcMain.on('send-room-message', (e, m) => {
	send_room_message(m);
});

ipcMain.handle('send-feed-message', async (e, m) => {
	const sent = await P2P.sendFeedMessage(m.message, m.reply, false);
	if (sent) await saveFeedMessage(sent);
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
	const message = await own_room_message({ timestamp: Date.now(), room: grp.key, message: 'Joined group', reply: '', tip: false });
	if (!message) return;
	save_group_message(message, message.hash, parseInt(message.timestamp), false, false, true);
});

ipcMain.on('add-room', async (e, room, admin) => {
	if (!room?.key || !room?.name) return;
	addRoom(room);
	if (!Hugin.syncImages.includes(room.key)) {
		Hugin.syncImages.push(room.key);
		store.set({ syncImages: Hugin.syncImages });
	}
	const message = await own_room_message({ timestamp: Date.now(), room: room.key, message: 'Joined room', reply: '', tip: false });
	if (!message) return;
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
	P2P.changeNode(address, pub);
	store.set({
		huginNode: {
			address,
			pub
		}
	});
	Hugin.huginNode = { address, pub };
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

// The DM swarm key of a contact: cn_fast_hash(generate_key_derivation(contact's view public key,
// our private view key)), the same on both sides; false when it cannot be made.
async function key_derivation_hash(chat) {
	try {
		return await (await identity.dm()).derivationHash(chat);
	} catch (e) {
		return false;
	}
}

const start_message_syncer = async () => {
	//Load knownTxsIds to backgroundSyncMessages on startup
	peer_dms();
	console.log('Hugin.huginNode', Hugin.huginNode);
	P2P.p2p.on('node:connected', () => {
		console.log('Node connected, resetting message syncer');
		const lastChecked = store.get('pool.checked');
		if (lastChecked) {
			store.set({ pool: { checked: lastChecked - 30000 } });
		}
	});
	P2P.connectNode(Hugin.huginNode.address, Hugin.huginNode.pub);
	await sleep(5000);
	block_list = Hugin.block_list;
	try {
		await background_sync_messages();
	} catch (err) {
		console.log(err);
	}
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

async function background_sync_messages() {
	console.log('Background syncing...');
	const incoming = incoming_messages.length > 0 ? true : false;
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
		clear_pm_que().catch((err) => console.log('clear_pm_que:', err));
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
	decrypt_hugin_messages(transactions, false).catch((err) =>
		console.log('decrypt_hugin_messages:', err)
	);
}

function update_que() {
	const decrypt = incoming_messages.slice(0, 299);
	const update = incoming_messages.slice(decrypt.length);
	incoming_messages = update;
	return decrypt;
}

// Node pool entries ({ hash, cipher, timestamp }) from a sync or a push. The wallet's DmCrypto
// opens each hash once in this session (seeded with the knownTxs table); entries stored in
// knownTxs earlier are skipped before that. Every entry it is done with is stored in knownTxs (one
// whose opening failed in a hook is left out, so it is tried again). Opened DMs are saved (or
// queued with `que`) in timestamp order; entries that are not DM payloads go to the group check.
async function decrypt_hugin_messages(list, que = false) {
	if (!Array.isArray(list)) return;
	console.log('Checking nr of txs:', list.length);
	let dm;
	try {
		dm = await identity.dm();
	} catch (err) {
		console.log('decrypt_hugin_messages:', err && err.message);
		return;
	}
	const entries = [];
	for (const entry of list) {
		if (!entry || typeof entry !== 'object' || !isHex64(entry.hash)) continue;
		if (await knownTxExists(entry.hash)) continue;
		entries.push(entry);
	}
	const { messages, others } = await dm.openPool(entries);
	for (const entry of entries) {
		if (dm.knowsPoolHash(entry.hash)) await saveHash(entry.hash);
	}
	for (const m of messages) {
		try {
			await take_pm_message(m, que);
		} catch (err) {
			console.log(err);
		}
	}
	for (const entry of others) {
		try {
			await check_for_group_message(entry.cipher, entry.hash, que);
		} catch (err) {
			console.log(err);
		}
	}
}

// One DM payload outside a pool batch; `txHash`, when given, is its message id. True when it
// was a DM for us and was taken.
async function check_for_pm_message(thisExtra, txHash, que = false) {
	const r = await (await identity.dm()).open(thisExtra, { hash: txHash });
	if (r.status !== 'ok') return false;
	await take_pm_message(r.message, que);
	return true;
}

// An opened DM (hugin-network/dm `message`): saved, or queued with `que`. A first message from an
// address that is not a contact adds the contact (save_message).
async function take_pm_message(m, que = false) {
	console.log(m.type === 'message' ? '[dm] message under the ML-KEM key' : '[dm] message with an ML-KEM handshake');
	const message = {
		from: m.from,
		msg: m.message,
		name: m.name,
		t: m.timestamp,
		hash: m.hash,
		type: 'sealedbox',
		sent: false
	};
	if (que) {
		incoming_pm_que.push(message);
		return;
	}
	await save_message(message);
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

async function sync_from_node(node) {
	if (!P2P.nodeConnected) return [];
	const lastChecked = store.get('pool.checked');

	try {
		// Always a numeric timestamp (0 before the first sync): hugin-node refuses a sync without one.
		const resp = await Promise.race([
			P2P.syncNode(lastChecked),
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

	if (!Array.isArray(list) || list.length === 0) {
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

// Routing for a private message:
//   p2p === false  → relay via the hugin push node (default); a payload too long for a node post
//                    goes over the DM swarm only and fails when the contact is not connected.
//   p2p === true   → direct over the swarm/beam channel (no node).
// The payload is the wallet's DmCrypto's (hugin-network/dm): until we hold a message key for the
// contact it carries our ML-KEM public key, then the capsule of the key we made for the contact
// until the contact uses that key.
async function send_message(
	message,
	receiver,
	p2p = false,
	group = false,
	beam_this = false,
	call = false,
	forced_timestamp = false
) {
	if (typeof message !== 'string' || message.length === 0) {
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
		if (!Number.isNaN(parsed) && parsed >= 0) {
			timestamp = parsed;
		}
	}

	const failed = (reason) => {
		Hugin.send('pm-send-error', { timestamp, message, conversation: address, reason });
		Hugin.send('sent');
		if (typeof reason === 'string' && reason.length <= 40) {
			console.log('Reason:', reason);
			Hugin.send('error-notify-message', reason);
		}
	};

	let out;
	try {
		out = await (await identity.dm()).encrypt(address, message, { name: Hugin.nickname, timestamp, call: !!call });
	} catch (err) {
		console.log('DM not encrypted:', err && err.message);
		failed('Message could not be encrypted');
		return;
	}
	// Content-addressed message id (SHA-256 of the payload): sender and receiver derive the same
	// id, and dedup is hash-keyed everywhere.
	const hash = out.hash;

	const saveThisMessage = {
		message,
		key: '',
		sent: true,
		timestamp: String(timestamp),
		conversation: address,
		hash,
		reply: '',
		tip: ''
	};

	if (!p2p && !out.fitsNode) {
		// Too long for a node post: only the DM swarm can carry it.
		if (P2P.sendDm(address, out.payload) === 0) {
			failed('Contact offline, message too long');
			return;
		}
	} else if (!p2p) {
		// Node-relayed: save immediately so the message isn't lost if the app
		// closes mid-send.
		await save_message(saveThisMessage, true);

		// Send to push node. If it fails, remove from DB
		const sent = await Promise.race([
			P2P.postToNode(out.payload, out.viewTag, out.kind, out.hash),
			sleep(200000).then(() => ({ success: false, reason: 'Timeout' }))
		]);

		if (typeof sent?.success !== 'boolean' || !sent.success) {
			deletePrivateMessage(saveThisMessage.timestamp);
			failed(sent?.reason || 'Failed');
			return;
		}
	} else if (beam_this) {
		// P2P (swarm/beam): the payload as it is.
		P2P.sendDm(address, out.payload);
	}
	save_message(saveThisMessage, true);
}

async function send_room_message(message) {
	//The hash the renderer passes is replaced by the derived one; the message is signed and sent
	//to the room's peers (hugin-network), then saved as signed.
	const normalized = await P2P.sendRoomMessage({
		timestamp: message?.timestamp || Date.now(),
		room: message?.room,
		message: message?.message,
		reply: message?.reply,
		tip: message?.tip
	});
	if (!normalized) return;
	// a copy: saving marks `sent` and the name for the renderer, the push carries the signed fields
	save_group_message({ ...normalized }, normalized.hash, normalized.timestamp, false, true, false, true);
	await send_room_message_push(normalized);
}

// Room push through hugin-node (`kind: 'room'`): the room message as sent on the swarm, in a
// secretbox keyed by the room key (hugin-network/push sealRoomPush: a random nonce in front of the
// box), sealed to the push server's key, routed by the room view tag (cn_fast_hash(invite), 5
// hex characters).
async function send_room_message_push(message) {
	try {
		const timestamp = Number(message.timestamp);
		const payload_hex = push.sealRoomPush({
			invite: message.room,
			payload: push.roomPushPayload({ ...message, timestamp }),
			timestamp
		});

		const sent = await P2P.postToNode(payload_hex, push.roomViewTag(message.room), 'room', message.hash);
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

	let { message, conversation, key, timestamp, sent, hash } = result;

	// Dedup on the content-addressed message hash (sender + receiver agree
	// on it via hugin-crypto). Falls back to timestamp lookup inside
	// messageExists when hash is missing (synthetic messages / older rows).
	if (await messageExists(hash || timestamp)) return;

	if (msg.conversation && sent) {
		conversation = msg.conversation;
	}

	// First message from an unknown sender: save them as a contact and open the
	// direct (beam) channel. The xkr address is the whole identity now.
	if (!sent) {
		const known = (await getContacts()).some((c) => c.address === conversation);
		if (!known) {
			await save_contact(conversation, msg.name);
			// `swarmTopicKey` — not to be confused with the message-id `hash`;
			// this is the per-conversation derivation that seeds the beam topic.
			const swarmTopicKey = await key_derivation_hash(conversation);
			new_swarm({ key: swarmTopicKey }, true, conversation);
		}
	}

	let newMsg = await saveMsg(message, conversation, sent, timestamp, p2p, hash);
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
	try {
		await sync_group_history(timeframe, settings.recommended_api, settings.key);
	} catch (err) {
		console.log('fetch-group-history:', err);
	}
});

module.exports = {
	decrypt_hugin_messages,
	check_for_pm_message,
	save_message,
	start_message_syncer,
	send_message,
	save_contact,
	new_swarm,
	key_derivation_hash
};
