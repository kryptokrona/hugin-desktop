'use strict';

// hugin-desktop's host for hugin-p2p 3.0 (hugin-p2p-design DESIGN.md §2.3-2.6).
//
// Rooms, DM swarms, the feed, room calls, file storage and the hugin-node connection all run in
// one `HuginP2P` from hugin-p2p. This file is everything desktop adds around it:
//
//   createHost(deps)    the host hooks (§2.5): the wallet's spend-key signatures, storage
//                       queries on database.cjs (bound parameters there), ban/block lists and
//                       file settings from the account state, paths, the PoW backend, a logger;
//   EVENT_MAP           every library event mapped to the IPC channels the renderer listens on
//                       and the database saves desktop has always done (§2.4, desktop column);
//                       IGNORED_EVENTS lists the events desktop does not act on, with the reason;
//   DesktopP2P          the instance the other backend modules call (join/leave, send, node,
//                       files) and the ipcMain handlers for the renderer's room, voice and file
//                       actions (same channel names and payloads as before);
//   instance()          the app's one DesktopP2P, wired to Electron, electron-store, the
//                       database and the wallet. Only this function touches Electron, so the rest
//                       loads under plain Node (tests/backend).
//
// Keys desktop uses towards the renderer: a room is its invite; a DM swarm is the key
// derivation hash the swarm was joined with (hugin-p2p keys DM rooms by the contact address;
// `roomKey` / `desktopKey` translate). Text in IPC payloads is plain text (`sanitizeText`,
// desktop's sanitize-html policy); the database keeps room and feed messages exactly as they
// were signed, so they can be served to peers again.

const { HuginP2P, events: E, sanitize: S, wire: W, keys, pow } = require('hugin-p2p');

/** NodeClient event the facade forwards under its own name (not in `events.ALL`). */
const NODE_POW_REQUIRED = 'node:pow-required';

const text = S.sanitizeText;
const ADDRESS_LENGTH = 99;
const DEFAULT_STORAGE_LIMIT = 100000000000;
const UNSIGNED = '0'.repeat(128);
const UNHASHED = '0'.repeat(64);

const MEDIA_TYPES = [
	{ file: '.png', type: 'image' },
	{ file: '.jpg', type: 'image' },
	{ file: '.gif', type: 'image' },
	{ file: '.jfif', type: 'image' },
	{ file: '.jpeg', type: 'image' },
	{ file: '.webp', type: 'image' },
	{ file: '.mp4', type: 'video' },
	{ file: '.webm', type: 'video' },
	{ file: '.avi', type: 'video' },
	{ file: '.mov', type: 'video' },
	{ file: '.wmv', type: 'video' },
	{ file: '.mkv', type: 'video' },
	{ file: '.mpeg', type: 'video' },
	{ file: '.m4a', type: 'audio' },
	{ file: '.mp3', type: 'audio' },
	{ file: '.wav', type: 'audio' }
];

function fileType(fileName) {
	const name = typeof fileName === 'string' ? fileName.toLowerCase() : '';
	const entry = MEDIA_TYPES.find((t) => name.endsWith(t.file));
	return entry ? entry.type : 'file';
}

// ---------------------------------------------------------------------------------------------
// shapes the renderer and the database have always received

/** Base64 avatar -> decoded bytes, as desktop has always passed avatars on ('' when there is none). */
function avatarBytes(avatar) {
	if (typeof avatar !== 'string' || avatar.length === 0) return '';
	return Buffer.from(avatar, 'base64');
}

function tipOut(tip, sanitize = true) {
	if (!tip || typeof tip !== 'object') return false;
	return { amount: tip.amount, receiver: sanitize ? text(tip.receiver) : tip.receiver };
}

/**
 * A room message in the renderer's shape (`roomMsg`, `room-notification`, `history-update`):
 * `{ message, address, signature, room, timestamp (string), name, reply, hash, sent,
 *    channel: 'channel', tip }`. Received messages (`sanitize`) are shown as plain text with an
 * empty name shown as 'Anonymous'; they are stored separately (`roomMessageRow`). Our own
 * messages are already plain text and keep every field exactly as signed, because this object is
 * also what messages.cjs stores (database.cjs shows an empty name as 'Anonymous').
 */
function roomMessageForUi(m, { sent = false, sanitize = true } = {}) {
	const t = sanitize ? text : (v) => v;
	const name = typeof m.name === 'string' ? m.name : '';
	return {
		message: t(m.message),
		address: t(m.address),
		signature: m.signature,
		room: m.room,
		timestamp: String(m.timestamp),
		name: sanitize && name === '' ? 'Anonymous' : t(name),
		reply: t(typeof m.reply === 'string' ? m.reply : ''),
		hash: m.hash,
		sent,
		channel: 'channel',
		tip: tipOut(m.tip, sanitize)
	};
}

/** A room message as database.cjs stores it: every signed field as received, integer timestamp. */
function roomMessageRow(m, { sent = false } = {}) {
	return {
		message: m.message,
		address: m.address,
		signature: m.signature,
		room: m.room,
		timestamp: m.timestamp,
		name: typeof m.name === 'string' ? m.name : '',
		reply: typeof m.reply === 'string' ? m.reply : '',
		hash: m.hash,
		sent,
		tip: m.tip || false
	};
}

/** A feed message as stored (as signed). */
function feedRow(m) {
	return {
		message: m.message,
		address: m.address,
		nickname: m.nickname,
		signature: m.signature,
		reply: typeof m.reply === 'string' ? m.reply : '',
		hash: m.hash,
		timestamp: m.timestamp,
		tip: m.tip || false
	};
}

/** A feed message in the renderer's shape (`feed-message`). */
function feedForUi(m) {
	return {
		message: text(m.message),
		address: text(m.address),
		nickname: text(m.nickname),
		signature: m.signature,
		reply: text(typeof m.reply === 'string' ? m.reply : ''),
		hash: m.hash,
		timestamp: m.timestamp,
		tip: tipOut(m.tip),
		type: 'feed'
	};
}

/** `peer-connected` payload (flat, avatar as bytes). */
function peerForUi(e) {
	const p = e.peer || {};
	return {
		topic: e.topic,
		admin: p.admin === true,
		joined: true,
		time: typeof p.time === 'number' ? String(p.time) : '',
		address: p.address,
		name: text(p.name || ''),
		voice: p.voice === true,
		video: p.video === true,
		avatar: avatarBytes(p.avatar),
		audioMute: p.audioMute === true,
		videoMute: p.videoMute === true,
		screenshare: p.screenshare === true
	};
}

/** `voice-channel-status` / `user-joined-voice-channel` payload. */
function voiceStatusForUi(e) {
	return {
		address: e.address,
		avatar: avatarBytes(e.avatar),
		message: text(typeof e.message === 'string' ? e.message : ''),
		signature: '',
		topic: e.topic,
		name: text(e.name || ''),
		voice: e.voice === true,
		video: e.video === true,
		videoMute: e.videoMute === true,
		audioMute: e.audioMute === true,
		screenshare: e.screenshare === true
	};
}

/**
 * A peer's file as the renderer lists it (`group-remote-file-added`, `remote-file-added`) and
 * hands it back to `group-download`. File name, signature and drive key stay as announced (a
 * download needs them unchanged); `key` is the topic for rooms and the sender for DMs.
 */
function remoteFileForUi(f, { topic, dm }) {
	return {
		fileName: f.fileName,
		address: f.address,
		size: f.size,
		topic,
		key: dm ? f.address : topic,
		chat: f.address,
		hash: f.hash,
		name: text(f.name || ''),
		time: f.time,
		signature: f.signature,
		driveKey: f.driveKey
	};
}

// ---------------------------------------------------------------------------------------------
// host hooks (DESIGN.md §2.5)

/**
 * The host object hugin-p2p calls. `deps`:
 *   db       database.cjs (or a stub with the same functions)
 *   hugin    the account state (account.cjs `Hugin`): address, nickname, avatar, syncImages,
 *            banned(), blocked(), get_files(), is_deleted()
 *   store    electron-store (`get`)
 *   sign(message) / verify(message, address, signature)   spend-key signatures (crypto.cjs)
 *   findShare  PoW backend (optional)
 *   paths    `{ storage, downloads }` or a function returning it (optional: no file storage)
 *   log(level, msg, data)
 */
function createHost(deps) {
	const { db, hugin } = deps;
	const log = typeof deps.log === 'function' ? deps.log : () => {};
	const host = {
		identity: () => ({
			address: typeof hugin.address === 'string' ? hugin.address : '',
			name: text(typeof hugin.nickname === 'string' ? hugin.nickname : ''),
			avatar: typeof hugin.avatar === 'string' ? hugin.avatar : ''
		}),
		sign: (message) => deps.sign(message),
		verify: async (message, address, signature) => {
			try {
				return (await deps.verify(message, address, signature)) === true;
			} catch (err) {
				return false;
			}
		},
		roomMessageExists: (hash) => db.roomMessageExists(hash),
		getRoomHistory: (key) => db.getRoomHistoryRows(key),
		getRoomMessage: (hash) => db.getRoomMessageRow(hash),
		getLatestRoomHashes: (key) => db.getLatestRoomHashes(key),
		feedMessageExists: (hash) => db.feedMessageExists(hash),
		getFeedHistory: () => db.printFeed(0, true),
		isBanned: (address, topic) => hugin.banned(address, topic),
		isBlocked: (address) => hugin.blocked(address),
		// per-topic setting (Settings -> Files, the room top bar); DM topics are added when the
		// DM swarm is joined
		autoSyncFiles: (topic) => Array.isArray(hugin.syncImages) && hugin.syncImages.includes(topic),
		knownFile: (hash) => hugin.get_files().some((f) => f && f.hash === hash) || hugin.is_deleted(hash),
		storageLimit: () => {
			const v = deps.store && typeof deps.store.get === 'function' ? deps.store.get('storageLimit') : null;
			return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : DEFAULT_STORAGE_LIMIT;
		},
		log
	};
	if (typeof deps.findShare === 'function') host.findShare = (args) => deps.findShare(args);
	if (deps.paths) host.paths = deps.paths;
	return host;
}

/**
 * PoW backend for `host.findShare`: hugin-utils' worker processes search the nonce (off the
 * Electron main thread, several cores) and the share is checked with hugin-p2p/pow
 * `verifyShare` (CN-Turtle-Lite v2) before it is used.
 */
function createPowBackend({ createChallenge, hash }) {
	let challenge = null;
	return async ({ job, timeBudgetMs }) => {
		if (!challenge) challenge = createChallenge();
		challenge.setJob(job);
		const share = pow.normalizeShare(await challenge.findShare(timeBudgetMs));
		if (!share) return null;
		const found = { job_id: job.job_id, nonce: share.nonce, result: share.result };
		try {
			return (await pow.verifyShare(job, found.nonce, found.result, hash)) ? found : null;
		} catch (err) {
			// the hash failed in this process: keep the share as the workers found it (the node
			// checks it anyway)
			return found;
		}
	};
}

// ---------------------------------------------------------------------------------------------
// events (DESIGN.md §2.4): library event -> what desktop does with it

/**
 * `ipc`: the renderer channels the handler may send on; `db`: the database functions it calls;
 * `serial: false`: runs at once instead of after the previous events (long-running work).
 */
const EVENT_MAP = Object.freeze({
	[E.ROOM_JOINED]: {
		ipc: ['swarm-connected', 'set-channels'],
		handle(ctx, e) {
			const info = ctx.swarmInfo(e.topic, e.key, e.dm);
			ctx.send(
				'swarm-connected',
				JSON.stringify({
					topic: e.topic,
					key: info.key,
					channels: [],
					voice_channel: new Map(),
					connections: [],
					time: info.time,
					admin: e.admin === true,
					beam: e.dm === true,
					chat: e.dm ? e.address : ''
				})
			);
			ctx.send('set-channels');
		}
	},
	[E.ROOM_LEFT]: {
		ipc: ['swarm-disconnected'],
		handle(ctx, e) {
			ctx.send('swarm-disconnected', e.topic);
		}
	},
	[E.PEER_JOINED]: {
		ipc: ['peer-connected'],
		db: ['saveRoomUser'],
		handle(ctx, e) {
			const peer = peerForUi(e);
			ctx.db.saveRoomUser({ name: peer.name, address: peer.address, room: e.topic, avatar: peer.avatar });
			ctx.send('peer-connected', peer);
		}
	},
	[E.PEER_LEFT]: {
		ipc: ['close-voice-channel-with-peer', 'peer-disconnected'],
		handle(ctx, e) {
			ctx.send('close-voice-channel-with-peer', e.address);
			ctx.send('peer-disconnected', { address: e.address, topic: e.topic });
		}
	},
	[E.ROOM_MESSAGE]: {
		ipc: ['roomMsg', 'room-notification'],
		db: ['saveGroupMsg'],
		async handle(ctx, e) {
			const saved = await ctx.db.saveGroupMsg(roomMessageRow(e.message), false, true);
			if (!saved) return;
			const message = roomMessageForUi(e.message);
			// history entries only notify; `history-update` follows the batch
			if (!e.history) ctx.send('roomMsg', message);
			ctx.send('room-notification', [message, false]);
		}
	},
	[E.ROOM_HISTORY]: {
		ipc: ['history-update'],
		handle(ctx, e) {
			if (!(e.count > 0)) return;
			const missing = Array.isArray(e.missing) ? e.missing.map((m) => roomMessageForUi(m)) : [];
			ctx.send('history-update', { key: ctx.desktopKey(e.topic, e.key), missing });
		}
	},
	[E.DM_WIRE]: {
		ipc: ['newMsg', 'privateMsg'],
		db: ['saveMsg'],
		// crypto.cjs decrpyt_beam_message decrypts, saves and notifies
		handle(ctx, e) {
			return ctx.deps.decryptDm(e.wire);
		}
	},
	[E.TYPING]: {
		ipc: ['typing'],
		handle(ctx, e) {
			ctx.send('typing', { typing: e.typing, key: ctx.desktopKey(e.topic, e.key), address: e.address });
		}
	},
	[E.BAN_SELF]: {
		ipc: ['banned'],
		db: ['removeRoom'],
		// hugin-p2p leaves the room itself (room:left follows)
		handle(ctx, e) {
			ctx.send('banned', e.key);
			ctx.db.removeRoom(e.key);
		}
	},
	[E.BAN_PEER]: {
		ipc: [],
		store: ['bannedUsers'],
		handle(ctx, e) {
			ctx.hugin.ban(e.address, e.topic);
		}
	},
	[E.FEED_MESSAGE]: {
		ipc: ['feed-message'],
		db: ['saveFeedMessage'],
		async handle(ctx, e) {
			const m = e.message;
			if (await ctx.db.feedMessageExists(m.hash)) return;
			await ctx.db.saveFeedMessage(feedRow(m));
			ctx.send('feed-message', feedForUi(m));
		}
	},
	[E.VOICE_STATUS]: {
		ipc: ['voice-channel-status', 'user-joined-voice-channel'],
		handle(ctx, e) {
			const status = voiceStatusForUi(e);
			ctx.send('voice-channel-status', status);
			if (status.voice) ctx.send('user-joined-voice-channel', status);
		}
	},
	[E.VOICE_CALL]: {
		ipc: ['join-voice-channel'],
		handle(ctx, e) {
			ctx.send('join-voice-channel', {
				key: ctx.desktopKey(e.topic, e.key),
				topic: e.topic,
				address: e.address,
				name: text(e.name || ''),
				audioMute: e.audioMute === true,
				videoMute: e.videoMute === true,
				screenshare: e.screenshare === true,
				video: e.video === true
			});
		}
	},
	[E.VOICE_OFFER]: {
		ipc: ['answer-voice-channel'],
		handle(ctx, e) {
			ctx.send('answer-voice-channel', e.data);
		}
	},
	[E.VOICE_ANSWER]: {
		ipc: ['got-answer-voice-channel'],
		handle(ctx, e) {
			ctx.send('got-answer-voice-channel', e.data);
		}
	},
	[E.VOICE_RETRY]: {
		ipc: ['got-expanded-voice-channel'],
		handle(ctx, e) {
			ctx.send('got-expanded-voice-channel', [e.data.data, e.data.address]);
		}
	},
	[E.FILE_REMOTE]: {
		ipc: ['remote-file-added', 'group-remote-file-added', 'roomMsg'],
		db: ['roomMessageExists', 'saveGroupMsg'],
		async handle(ctx, e) {
			const file = remoteFileForUi(e.file, e);
			if (e.dm) {
				ctx.send('remote-file-added', { chat: file.address, remoteFiles: [file] });
				return;
			}
			// the remote file first, so the room message below finds it and shows a download button
			ctx.send('group-remote-file-added', { chat: e.key, remoteFiles: [file] });
			if (!(await ctx.db.roomMessageExists(file.hash))) {
				await ctx.saveFileInfo(file, { room: e.key, address: file.address, time: file.time, sent: false, name: file.name });
			}
		}
	},
	[E.FILE_DOWNLOADING]: {
		ipc: ['downloading'],
		handle(ctx, e) {
			if (e.auto) return;
			ctx.send('downloading', { fileName: e.fileName, chat: e.address, time: e.time, size: e.size, hash: e.hash });
		}
	},
	[E.FILE_PROGRESS]: {
		ipc: ['download-file-progress'],
		handle(ctx, e) {
			if (e.auto) return;
			ctx.send('download-file-progress', { fileName: e.fileName, chat: e.address, time: e.time, progress: e.progress });
		}
	},
	[E.FILE_DOWNLOADED]: {
		ipc: ['files', 'file-downloaded', 'newMsg', 'privateMsg', 'remote-file-added', 'roomMsg'],
		db: ['saveMsg', 'saveGroupMsg'],
		store: ['files'],
		async handle(ctx, e) {
			ctx.hugin.file_info({ fileName: e.fileName, time: e.time, size: e.size, path: 'storage', hash: e.hash, topic: e.topic });
			const file = {
				fileName: e.fileName,
				address: e.address,
				size: e.size,
				topic: e.topic,
				key: e.dm ? e.address : e.topic,
				chat: e.address,
				hash: e.hash,
				name: text(e.name || ''),
				time: e.time,
				driveKey: e.driveKey
			};
			ctx.send('file-downloaded', JSON.stringify(file));
			if (e.dm) {
				file.path = 'storage';
				file.saved = true;
				const newMsg = await ctx.db.saveMsg(`Downloaded ${e.fileName}`, e.address, false, e.time);
				ctx.send('newMsg', newMsg);
				ctx.send('privateMsg', newMsg);
				ctx.send('remote-file-added', { chat: e.address, remoteFiles: [file] });
				return;
			}
			const message = {
				message: e.fileName,
				address: e.address,
				room: e.key,
				topic: e.topic,
				timestamp: e.time,
				time: e.time,
				name: file.name,
				reply: '',
				hash: e.hash,
				sent: false,
				channel: 'channel',
				file: {
					fileName: e.fileName,
					path: 'storage',
					hash: e.hash,
					time: e.time,
					saved: true,
					topic: e.topic,
					type: fileType(e.fileName)
				},
				tip: false,
				signature: ''
			};
			await ctx.db.saveGroupMsg(message, false, false);
			ctx.send('roomMsg', message);
		}
	},
	[E.FILE_UPLOADED]: {
		ipc: ['files', 'upload-file-progress'],
		store: ['files'],
		handle(ctx, e) {
			ctx.hugin.file_info({ fileName: e.fileName, time: e.time, size: e.size, path: e.path, hash: e.hash, topic: e.topic });
			ctx.send('upload-file-progress', { fileName: e.fileName, chat: e.address, time: e.time, progress: 100 });
		}
	},
	[E.FILE_REMOVED]: {
		ipc: [],
		store: ['deletedFileHashes'],
		// deleted or purged by the user: not fetched again (pruned files may come back)
		handle(ctx, e) {
			if (e.reason === 'prune') return;
			ctx.hugin.add_deleted_hashes(e.hashes);
		}
	},
	[E.NODE_CONNECTED]: {
		ipc: ['hugin-node-connection'],
		handle(ctx) {
			ctx.send('hugin-node-connection', true);
		}
	},
	[E.NODE_DISCONNECTED]: {
		ipc: ['hugin-node-connection'],
		handle(ctx, e) {
			if (e && e.reason === 'destroy') return;
			ctx.send('hugin-node-connection', false);
		}
	},
	[E.NODE_ADDRESS]: {
		ipc: ['hugin-node-address'],
		handle(ctx, e) {
			ctx.send('hugin-node-address', e.address);
		}
	},
	[E.NODE_MESSAGES]: {
		ipc: ['newMsg', 'privateMsg'],
		serial: false,
		// pushed by the node; the background syncer in messages.cjs polls the node itself
		// (`syncNode`) and decrypts what it gets
		handle(ctx, e) {
			if (e.source !== 'push') return;
			return ctx.deps.decryptNodeMessages(e.messages);
		}
	},
	[E.ERROR]: {
		ipc: ['error-notify-message'],
		// a download the user asked for; node connection errors are only logged, as before
		handle(ctx, e) {
			if (e && e.source === 'files') ctx.send('error-notify-message', e.message);
			else ctx.log('info', 'p2p error', { source: e && e.source, message: e && e.message });
		}
	}
});

/** Library events desktop does not act on (only logged). */
const IGNORED_EVENTS = Object.freeze({
	[E.NODE_JOB]: 'PoW jobs are used inside NodeClient; nothing for the renderer',
	[E.NODE_RESET]: 'only emitted with fallbackToPublic, which the desktop preset leaves off',
	[E.NODE_ERROR]: 'logged; it also arrives as `error` (source node), which is only logged',
	[E.FILE_ERROR]: 'logged; a failed download the user asked for arrives as `error` (source files)',
	[NODE_POW_REQUIRED]: 'an attempt found no PoW share; the post retries and resolves with the reason'
});

/** Fields of an ignored event's payload that are logged (no message contents). */
function logFields(payload) {
	if (!payload || typeof payload !== 'object') return undefined;
	const out = {};
	for (const k of ['reason', 'code', 'error', 'message', 'kind', 'attempt', 'auto']) {
		if (payload[k] !== undefined && typeof payload[k] !== 'object') out[k] = payload[k];
	}
	return out;
}

// ---------------------------------------------------------------------------------------------
// DesktopP2P

class DesktopP2P {
	/**
	 * @param {object} deps  see createHost, plus:
	 *   send(channel, data)          to the renderer (Hugin.send)
	 *   decryptDm(wire)              crypto.cjs decrpyt_beam_message
	 *   decryptNodeMessages(list)    messages.cjs decrypt_hugin_messages
	 *   registerUserFile(path)       utils.cjs register_user_file (optional)
	 * @param {object} [opts]  `bootstrap` (DHT testnet in tests) and HuginP2P options (`rooms`,
	 *   `feed`, `voice`, `files`, `node`)
	 */
	constructor(deps, opts = {}) {
		this.deps = deps;
		this.db = deps.db;
		this.hugin = deps.hugin;
		this.host = createHost(deps);
		const { bootstrap, ...p2pOpts } = opts;
		this.p2p = new HuginP2P({
			host: this.host,
			bootstrap,
			...p2pOpts,
			node: { preset: 'desktop', ...(p2pOpts.node || {}) }
		});
		// Both maps only grow with the rooms and contacts joined (their values never change for a
		// key), so entries stay after a leave and a quick rejoin finds them in place.
		/** derivation hash -> contact address (DM swarms) */
		this.dms = new Map();
		/** topic -> { key: the key the renderer uses, dm, chat, time } */
		this.swarms = new Map();
		this._chain = Promise.resolve();
		this._attach();
	}

	log(level, msg, data) {
		try {
			if (typeof this.deps.log === 'function') this.deps.log(level, msg, data);
		} catch (err) {}
	}

	send(channel, data) {
		try {
			this.deps.send(channel, data);
		} catch (err) {
			this.log('warn', 'renderer send failed', { channel, message: err && err.message });
		}
	}

	_attach() {
		for (const [name, entry] of Object.entries(EVENT_MAP)) {
			this.p2p.on(name, (payload) => this._dispatch(name, entry, payload));
		}
		for (const name of Object.keys(IGNORED_EVENTS)) {
			// file errors are printed (auto-sync failures do not reach `error`); node errors are
			// printed by the `error` mapping
			const level = name === E.FILE_ERROR ? 'info' : 'debug';
			this.p2p.on(name, (payload) => this.log(level, name, logFields(payload)));
		}
	}

	_dispatch(name, entry, payload) {
		const run = () =>
			Promise.resolve()
				.then(() => entry.handle(this, payload))
				.catch((err) => this.log('warn', 'event not handled', { event: name, message: err && err.message }));
		if (entry.serial === false) {
			run();
			return;
		}
		// in order: a history batch is saved before its `history-update`
		this._chain = this._chain.then(run);
	}

	/** Resolves once every event received so far has been handled (tests). */
	settled() {
		return this._chain;
	}

	// -------------------------------------------------------------------------------------------
	// keys

	/** The key hugin-p2p uses for a key the renderer uses (DM: derivation hash -> contact address). */
	roomKey(key) {
		if (typeof key !== 'string') return key;
		if (this.dms.has(key)) return this.dms.get(key);
		return key;
	}

	/** The key the renderer uses for a swarm. */
	desktopKey(topic, key) {
		const info = this.swarms.get(topic);
		return info ? info.key : key;
	}

	swarmInfo(topic, key, dm) {
		return this.swarms.get(topic) || { key, dm: !!dm, chat: '', time: Date.now().toString() };
	}

	/** Called before a join: the renderer key and the start time `swarm-connected` carries. */
	_remember(topic, info) {
		this.swarms.set(topic, { ...info, time: Date.now().toString() });
	}

	/** `{ [topic]: { key, beam, chat } }` of the open swarms (storage stats in electron.cjs). */
	topicKeyMap() {
		const map = {};
		for (const r of this.p2p.rooms.list()) {
			const info = this.swarms.get(r.topic);
			map[r.topic] = { key: info ? info.key : r.key, beam: !!r.dm, chat: r.dm ? (info && info.chat) || r.key : null };
		}
		return map;
	}

	// -------------------------------------------------------------------------------------------
	// swarms

	/** The old `new_swarm(data, beam, chat)`: a room by invite, or a DM swarm by derivation hash. */
	newSwarm(data, beam = false, chat = false) {
		if (!data || typeof data.key !== 'string') return Promise.resolve(false);
		return beam ? this.joinDm(data.key, chat) : this.joinRoom(data.key);
	}

	/** Joins a room; admin when database.cjs holds the room's admin seed. */
	async joinRoom(invite) {
		if (!keys.isRoomInvite(invite)) return false;
		const topic = keys.roomTopic(invite).topic;
		this._remember(topic, { key: invite, dm: false, chat: '' });
		let adminSeed;
		try {
			const row = (this.db.loadRoomKeys() || []).find((a) => a.invite === invite);
			if (row && typeof row.priv === 'string') adminSeed = row.priv;
		} catch (err) {}
		try {
			await this.p2p.rooms.join({ invite, adminSeed });
			return true;
		} catch (err) {
			this.log('warn', 'room not joined', { message: err && err.message });
			return false;
		}
	}

	/** Joins the DM swarm with `chat` (its first 99 characters are the contact address). */
	async joinDm(derivationHash, chat) {
		const address = typeof chat === 'string' ? chat.substring(0, ADDRESS_LENGTH) : '';
		if (address.length !== ADDRESS_LENGTH || typeof derivationHash !== 'string' || derivationHash.length === 0) return false;
		let topic;
		try {
			topic = keys.dmTopic(derivationHash).topic;
		} catch (err) {
			return false;
		}
		this.dms.set(derivationHash, address);
		this._remember(topic, { key: derivationHash, dm: true, chat: address });
		// files in a DM are synced unless the user turns it off for this topic
		const hugin = this.hugin;
		if (Array.isArray(hugin.syncImages) && !hugin.syncImages.includes(topic)) {
			hugin.syncImages = [...hugin.syncImages, topic];
			try {
				this.deps.store.set({ syncImages: hugin.syncImages });
			} catch (err) {}
		}
		try {
			await this.p2p.rooms.joinDm({ address, derivationHash });
			return true;
		} catch (err) {
			this.log('warn', 'DM swarm not joined', { message: err && err.message });
			return false;
		}
	}

	/** The old `end_swarm(key, beam)`: leaves a room (invite) or a DM swarm (contact address). */
	async endSwarm(key, beam = false) {
		if (typeof key !== 'string') return false;
		const target = beam ? key.substring(0, ADDRESS_LENGTH) : this.roomKey(key);
		try {
			return await this.p2p.rooms.leave(target);
		} catch (err) {
			this.log('warn', 'swarm not left', { message: err && err.message });
			return false;
		}
	}

	// -------------------------------------------------------------------------------------------
	// sending

	/**
	 * Signs a room message of our own without sending it (hugin-p2p's room message format: hash
	 * derived from the fields, spend-key signature over `wire.roomMessageSigningPayload`).
	 */
	async signRoomMessage({ room, message, reply = '', tip = false, timestamp }) {
		const id = this.p2p.identity();
		const checked = W.roomMessage({
			hash: UNHASHED,
			room,
			address: id.address,
			message,
			name: id.name,
			reply,
			signature: UNSIGNED,
			timestamp,
			tip
		});
		const draft = { ...checked, hash: W.roomMessageHash(checked) };
		const signature = await this.host.sign(W.roomMessageSigningPayload(draft));
		return W.roomMessage({ ...draft, signature });
	}

	/**
	 * A room message from the renderer (`send-room-message`): plain text (sanitizeText), signed
	 * and sent to the room's peers. When the room is not joined right now it is signed only (it
	 * is still saved and pushed through hugin-node). Resolves the message in the renderer's
	 * shape with `sent: true` (the text exactly as signed), or null.
	 */
	async sendRoomMessage(m) {
		if (!m || typeof m !== 'object' || typeof m.room !== 'string') return null;
		const ts = Number(m.timestamp);
		const fields = {
			room: m.room,
			message: text(String(m.message === undefined || m.message === null ? '' : m.message)),
			reply: text(String(m.reply === undefined || m.reply === null ? '' : m.reply)),
			tip: m.tip || false,
			timestamp: Number.isSafeInteger(ts) && ts > 0 ? ts : Date.now()
		};
		let sent;
		try {
			if (this.p2p.rooms.get(fields.room)) sent = await this.p2p.rooms.send(fields.room, fields);
			else sent = await this.signRoomMessage(fields);
		} catch (err) {
			this.log('warn', 'room message not sent', { message: err && err.message });
			return null;
		}
		return roomMessageForUi(sent, { sent: true, sanitize: false });
	}

	/** A room message of our own that is only saved ("Joined room"), in the renderer's shape. */
	async ownRoomMessage(fields) {
		try {
			const ts = Number(fields.timestamp);
			const signed = await this.signRoomMessage({
				room: fields.room,
				message: text(String(fields.message || '')),
				reply: text(String(fields.reply || '')),
				tip: fields.tip || false,
				timestamp: Number.isSafeInteger(ts) && ts > 0 ? ts : Date.now()
			});
			return roomMessageForUi(signed, { sent: true, sanitize: false });
		} catch (err) {
			this.log('warn', 'room message not built', { message: err && err.message });
			return null;
		}
	}

	/** A DM payload (hugin-crypto `encodeExtra` hex) over the DM swarm; returns the peers written to. */
	sendDm(address, payload) {
		if (typeof address !== 'string') return 0;
		return this.p2p.rooms.sendDm(address.substring(0, ADDRESS_LENGTH), payload);
	}

	/** A feed post (signed, sent to every room peer); resolves the wire object, or false. */
	async sendFeedMessage(message, reply = '', tip = false) {
		try {
			return await this.p2p.feed.send({ message, reply, tip });
		} catch (err) {
			this.log('warn', 'feed message not sent', { message: err && err.message });
			return false;
		}
	}

	// -------------------------------------------------------------------------------------------
	// hugin-node

	get nodeAddress() {
		return this.p2p.node.address;
	}

	get nodeConnected() {
		return this.p2p.node.connected;
	}

	connectNode(address, pub) {
		return this.p2p.node.connect({ address, pub }).catch((err) => this.log('warn', 'node not connected', { message: err && err.message }));
	}

	changeNode(address, pub) {
		return this.p2p.node.change({ address, pub }).catch((err) => this.log('warn', 'node not changed', { message: err && err.message }));
	}

	/** Messages pooled on the node since `since` (ms); [] offline or on timeout. */
	syncNode(since) {
		const n = Number(since);
		return this.p2p.node.sync({ since: Number.isFinite(n) && n > 0 ? n : 0 });
	}

	/** A DM, call or room push through the node, paid with PoW: `{ success, reason? }`. */
	async postToNode(cipher, viewtag, kind = 'dm', hash) {
		try {
			return await this.p2p.node.post({ cipher, viewtag, kind, hash });
		} catch (err) {
			this.log('warn', 'node post refused', { message: err && err.message });
			return { success: false, reason: 'invalid_message' };
		}
	}

	// -------------------------------------------------------------------------------------------
	// files

	get files() {
		return this.p2p.files;
	}

	/** The room or DM a renderer key names (invite, topic, derivation hash or contact address). */
	_room(key) {
		if (typeof key !== 'string') return null;
		const k = this.roomKey(key);
		return this.p2p.rooms.get(k) || this.p2p.rooms.get(k.substring(0, ADDRESS_LENGTH)) || null;
	}

	/** A file row in a room (`save_file_info`): shown as a message with the file. */
	async saveFileInfo(file, { room, address, time, sent, name }) {
		const message = {
			message: text(file.fileName),
			address,
			name,
			timestamp: time,
			time,
			room,
			hash: file.hash,
			reply: '',
			sent,
			tip: false,
			signature: ''
		};
		if (Array.isArray(this.hugin.roomFiles)) this.hugin.roomFiles.push(message.hash);
		await this.db.saveGroupMsg(message);
		this.send('roomMsg', message);
	}

	async download(download) {
		if (!this.files || !download || !download.driveKey) return null;
		const room = this._room(download.topic) || this._room(download.key);
		if (!room) return null;
		return this.files.download(room.topic, download);
	}

	async saveToDownloads({ hash, fileName, topic } = {}) {
		const result = this.files ? await this.files.saveToDownloads(hash, fileName, topic) : { success: false, error: 'Room not found' };
		if (!result.success) {
			this.send('error-notify-message', result.error || 'Failed to save file');
			return result;
		}
		this._markSavedToDisk(hash);
		return result;
	}

	_markSavedToDisk(hash) {
		const files = this.hugin.get_files();
		const file = files.find((f) => f && f.hash === hash);
		if (!file || file.savedToDisk) return;
		file.savedToDisk = true;
		try {
			this.deps.store.set({ files });
		} catch (err) {}
		this.send('files', files);
	}

	/** `group-upload`: stores a file in the room's (or DM's) drive and announces it. */
	async upload(fileName, path, key, size, time, hash, room = true) {
		if (typeof this.deps.registerUserFile === 'function') this.deps.registerUserFile(path);
		const isRoom = room !== false;
		const target = this._room(key);
		if (!target || target.dm === isRoom) {
			this.log('info', 'upload failed, room or DM swarm is not active');
			return false;
		}
		const hugin = this.hugin;
		if (!isRoom) await this.db.saveMsg(fileName, target.key, true, time);
		this.send('uploading', { fileName, chat: hugin.address, size, time, group: isRoom });
		try {
			await this.p2p.rooms.shareFile(target.key, path, { fileName, time, hash });
		} catch (err) {
			this.log('warn', 'file not shared', { message: err && err.message });
			return false;
		}
		if (isRoom) {
			hugin.file_info({ fileName, time, size, path: 'storage', hash, topic: target.topic });
			await this.saveFileInfo({ fileName, hash }, { room: target.key, address: hugin.address, time, sent: true, name: this.p2p.identity().name });
		}
		return true;
	}

	async loadStoredFile(hash, topic) {
		return this.files ? this.files.read(hash, topic) : null;
	}

	async storageStats() {
		if (!this.files) return { totalSize: 0, totalFiles: 0, limit: this.host.storageLimit(), rooms: [] };
		return this.files.stats();
	}

	storageLimit() {
		return this.files ? this.files.limit : this.host.storageLimit();
	}

	async purgeRoom(topic) {
		return this.files ? this.files.purgeRoom(topic) : 0;
	}

	async purgeAll() {
		if (!this.files) return 0;
		let n = 0;
		for (const r of this.files.rooms()) n += await this.files.purgeRoom(r.topic);
		return n;
	}

	async deleteFile(hash, topic) {
		return this.files ? this.files.deleteFile(hash, topic) : false;
	}

	setStorageLimit(bytes) {
		if (this.files) this.files.setLimit(bytes);
		try {
			this.deps.store.set('storageLimit', bytes);
		} catch (err) {}
	}

	// -------------------------------------------------------------------------------------------
	// voice

	async setVoiceStatus(status, update) {
		if (!status || typeof status !== 'object') return false;
		const room = this._room(status.key);
		if (!room) return false;
		return this.p2p.voice.setStatus(
			room.key,
			{
				voice: true,
				video: status.video === true,
				audioMute: status.audioMute === true,
				videoMute: status.videoMute === true,
				screenshare: status.screenshare === true
			},
			{ update: !!update }
		);
	}

	/** `exit-voice-channel`: leaves the voice channel of `key` (or the one we are in). */
	async exitVoice(key) {
		const active = this.p2p.voice.active;
		if (!active) return false;
		const room = key ? this._room(key) : null;
		if (room && room.topic !== active.topic) return false;
		// we are only in one voice channel; the renderer closes its calls
		this.send('leave-active-voice-channel');
		this.send('leave-voice-channel');
		return this.p2p.voice.leave();
	}

	/** `get-sdp-voice-channel`: an SDP from the renderer to the peer at `data.address`. */
	sendSdp(data) {
		if (!data || typeof data !== 'object') return false;
		return this.p2p.voice.sendSdp({
			topic: data.topic,
			key: data.key,
			address: data.address,
			data: data.data,
			type: data.type,
			retry: data.retry
		});
	}

	// -------------------------------------------------------------------------------------------
	// renderer IPC (the channels swarm.cjs registered)

	registerIpc(ipcMain) {
		const on = (channel, fn) =>
			ipcMain.on(channel, (e, ...args) => {
				Promise.resolve()
					.then(() => fn(...args))
					.catch((err) => this.log('warn', 'ipc handler failed', { channel, message: err && err.message }));
			});
		on('ban-user', (data) => {
			if (!data || typeof data !== 'object') return;
			const room = this._room(data.key);
			if (room) return this.p2p.rooms.ban(room.key, data.address);
		});
		on('update-voice-channel-status', (status) => this.setVoiceStatus(status, true));
		on('group-download', (download) => this.download(download));
		ipcMain.handle('save-to-downloads', async (e, args) => this.saveToDownloads(args || {}));
		on('group-upload', (fileName, path, key, size, time, hash, room = true) => this.upload(fileName, path, key, size, time, hash, room));
		on('typing', (data) => {
			if (!data || typeof data !== 'object') return;
			const room = this._room(data.key);
			if (room) this.p2p.rooms.typing(room.key, data.typing === true);
		});
		on('join-voice', (data) => this.setVoiceStatus(data, false));
		on('exit-voice-channel', (key) => this.exitVoice(key));
		on('get-sdp-voice-channel', (data) => this.sendSdp(data));
		on('new-channel', (data) => this.send('channel-created', data));
		// the round trip stays for the renderer; SDPs are not expanded any more
		on('expand-voice-channel-sdp', (expand) => {
			const [data, address] = Array.isArray(expand) ? expand : [];
			this.send('got-expanded-voice-channel', [data, address]);
		});
	}

	destroy() {
		return this.p2p.destroy();
	}
}

function createDesktopP2P(deps, opts) {
	return new DesktopP2P(deps, opts);
}

// ---------------------------------------------------------------------------------------------
// the app's instance

let appInstance = null;

function consoleLog(level, msg, data) {
	if (level === 'debug') return;
	if (data === undefined) console.log('[p2p]', level, msg);
	else console.log('[p2p]', level, msg, data);
}

/**
 * The app's DesktopP2P (created on the first call, with the ipcMain handlers registered).
 * Requires Electron, electron-store, the database, the account state and the wallet.
 */
function instance() {
	if (appInstance) return appInstance;
	const { app, ipcMain } = require('electron');
	const Store = require('electron-store');
	const store = new Store();
	const db = require('./database.cjs');
	const { Hugin } = require('./account.cjs');
	const { keychain, signMessage, verifySignature, decrpyt_beam_message } = require('./crypto.cjs');
	const { createChallenge } = require('hugin-utils/challenge');
	const { Crypto } = require('kryptokrona-utils');
	const xkrCrypto = new Crypto();
	const userDataDir = app.getPath('userData');

	appInstance = createDesktopP2P({
		db,
		hugin: Hugin,
		store,
		send: (channel, data) => {
			if (typeof Hugin.sender === 'function') Hugin.send(channel, data);
		},
		sign: (message) => signMessage(message, keychain.getXKRKeypair().privateSpendKey),
		verify: verifySignature,
		findShare: createPowBackend({
			createChallenge,
			hash: async (blobHex) => String(await xkrCrypto.cn_turtle_lite_slow_hash_v2(blobHex)).toLowerCase()
		}),
		// corestore 7 needs its own directory (the corestore 6 one stays unused)
		paths: () => ({ storage: userDataDir + '/corestorage-v7', downloads: Hugin.downloadDir || app.getPath('downloads') }),
		decryptDm: (wireHex) => decrpyt_beam_message(wireHex),
		decryptNodeMessages: (messages) => require('./messages.cjs').decrypt_hugin_messages(messages),
		registerUserFile: (p) => require('./utils.cjs').register_user_file(p),
		log: consoleLog
	});
	appInstance.registerIpc(ipcMain);

	process.on('uncaughtException', (err) => {
		console.log('Caught an unhandled exception:', err);
	});
	process.on('unhandledRejection', (reason, promise) => {
		console.log('Unhandled Rejection at:', promise, 'reason:', reason);
	});
	return appInstance;
}

module.exports = {
	instance,
	createDesktopP2P,
	DesktopP2P,
	createHost,
	createPowBackend,
	EVENT_MAP,
	IGNORED_EVENTS,
	avatarBytes,
	roomMessageForUi,
	roomMessageRow,
	feedRow,
	feedForUi,
	peerForUi,
	voiceStatusForUi,
	remoteFileForUi
};
