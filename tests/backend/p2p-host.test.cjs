'use strict';

// src/backend/p2p-host.cjs under plain Node: `node --test tests/backend/*.test.cjs`
// (pnpm run test:backend). No network: rooms run on fake swarms (Rooms' `createSwarm` option),
// the database is in memory (helpers/desktop-stubs.cjs), and library events are emitted on the
// HuginP2P instance directly to check what desktop does with each of them.
//
// - the event table: every name in hugin-p2p's `events.ALL` is mapped or listed as ignored, and
//   every renderer channel it sends on is one the preload lets the renderer receive;
// - each mapping: the IPC payload shapes the renderer has always received and the database saves
//   (room and feed messages stored as signed, shown as plain text);
// - the host hooks over the database, account state and settings;
// - the ipcMain handlers (same channels as before) and sending room messages.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { events: E, wire: W, keys, sanitize: S } = require('hugin-p2p');
const H = require('../../src/backend/p2p-host.cjs');
const {
	ADDRESS,
	ADDRESS_2,
	fakeSign,
	fakeVerify,
	memoryDb,
	memoryStore,
	fakeHugin,
	recorder,
	fakeSwarms,
	fakeIpcMain
} = require('./helpers/desktop-stubs.cjs');

const PAST = 1700000000000;
const DERIVATION = 'cd'.repeat(32);
const HASH = 'ab'.repeat(32);
const DRIVE_KEY = '34'.repeat(32);
const AVATAR = Buffer.from('avatar bytes').toString('base64');
const MARKUP = 'Hej <b>bold</b> <script>alert(1)</script>&amp; done';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A room message as a peer signs it (hash derived from the fields). */
function signedRoomMessage({ room, address = ADDRESS_2, name = 'bob', message = 'hi', reply = '', timestamp = PAST, tip = false }) {
	const checked = W.roomMessage({ hash: '0'.repeat(64), room, address, name, message, reply, signature: '0'.repeat(128), timestamp, tip });
	const draft = { ...checked, hash: W.roomMessageHash(checked) };
	return W.roomMessage({ ...draft, signature: fakeSign(address, W.roomMessageSigningPayload(draft)) });
}

/** A feed message as a peer signs it. */
function signedFeed({ address = ADDRESS_2, nickname = 'bob', message = 'post', reply = '', timestamp = PAST, tip = false } = {}) {
	const checked = W.feed({ message, nickname, address, reply, tip, timestamp, hash: '0'.repeat(64), signature: 'x' });
	const draft = { ...checked, hash: W.feedMessageHash(checked) };
	return W.feed({ ...draft, signature: fakeSign(address, W.feedSigningPayload(draft)) });
}

/** A DesktopP2P on fake swarms with an in-memory database, account state and settings. */
function make(t, { address = ADDRESS, nickname = 'nils', deps = {}, rooms = {} } = {}) {
	const db = memoryDb();
	const store = memoryStore();
	const hugin = fakeHugin({ address, nickname, store });
	const send = recorder();
	const swarms = fakeSwarms();
	const decrypted = { dm: [], node: [] };
	const ctx = H.createDesktopP2P(
		{
			db,
			hugin,
			store,
			send,
			sign: async (m) => fakeSign(hugin.address, m),
			verify: fakeVerify,
			decryptDm: async (w) => decrypted.dm.push(w),
			decryptNodeMessages: async (list) => decrypted.node.push(list),
			log: () => {},
			...deps
		},
		{
			files: false,
			rooms: { createSwarm: swarms.createSwarm, pingIntervalMs: 0, leaveFlushMs: 0, banLeaveDelayMs: 0, ...rooms }
		}
	);
	t.after(() => ctx.destroy());
	return { ctx, db, store, hugin, send, swarms, decrypted };
}

/** Emits a library event on the instance and waits until desktop has handled it. */
async function emit(ctx, name, payload) {
	ctx.p2p.emit(name, payload);
	await ctx.settled();
}

function preloadChannels(name) {
	const src = fs.readFileSync(path.join(__dirname, '../../src/backend/preload.cjs'), 'utf8');
	const m = src.match(new RegExp('const ' + name + ' = new Set\\(\\[([\\s\\S]*?)\\]\\)'));
	assert.ok(m, name + ' not found in preload.cjs');
	return new Set([...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]));
}

// =============================================================================================
// the event table

test('every hugin-p2p event is mapped or listed as ignored, never both', () => {
	const mapped = Object.keys(H.EVENT_MAP);
	const ignored = Object.keys(H.IGNORED_EVENTS);
	for (const name of E.ALL) {
		const inMap = mapped.includes(name);
		const inIgnored = ignored.includes(name);
		assert.ok(inMap || inIgnored, `${name} is neither mapped nor ignored`);
		assert.ok(!(inMap && inIgnored), `${name} is both mapped and ignored`);
	}
	// nothing in the table that the library does not emit (node:pow-required is forwarded by the
	// facade under its own name)
	const known = new Set([...E.ALL, 'node:pow-required']);
	for (const name of [...mapped, ...ignored]) assert.ok(known.has(name), `${name} is not a hugin-p2p event`);
	for (const [name, reason] of Object.entries(H.IGNORED_EVENTS)) {
		assert.equal(typeof reason, 'string', name);
		assert.ok(reason.length > 10, `${name} needs a reason`);
	}
	for (const [name, entry] of Object.entries(H.EVENT_MAP)) {
		assert.equal(typeof entry.handle, 'function', name);
		assert.ok(Array.isArray(entry.ipc), name);
	}
});

test('every renderer channel desktop sends p2p events on is one the preload lets the renderer receive', () => {
	const receive = preloadChannels('RECEIVE_CHANNELS');
	const fromTable = Object.values(H.EVENT_MAP).flatMap((e) => e.ipc);
	// sent by DesktopP2P outside the table (uploads, voice, file actions)
	const direct = ['uploading', 'leave-active-voice-channel', 'leave-voice-channel', 'channel-created', 'got-expanded-voice-channel', 'error-notify-message', 'files', 'roomMsg'];
	for (const channel of [...fromTable, ...direct]) assert.ok(receive.has(channel), `${channel} is not a renderer receive channel`);
});

test('a DesktopP2P listens for every event in the table', (t) => {
	const { ctx } = make(t);
	for (const name of E.ALL) assert.ok(ctx.p2p.listenerCount(name) >= 1, `no listener for ${name}`);
	assert.ok(ctx.p2p.listenerCount('node:pow-required') >= 1);
});

// =============================================================================================
// the mappings

test('room:joined / room:left: swarm-connected (the renderer key: invite, or the DM derivation hash), set-channels, swarm-disconnected', async (t) => {
	const { ctx, send, hugin, store } = make(t);
	const { invite, adminSeed } = keys.createRoomInvite();
	ctx.db.roomKeys.push({ invite, priv: adminSeed });
	assert.equal(await ctx.joinRoom(invite), true);
	await ctx.settled();
	const [json] = send.of('swarm-connected');
	const joined = JSON.parse(json);
	assert.equal(joined.key, invite);
	assert.equal(joined.topic, keys.roomTopic(invite).topic);
	assert.equal(joined.admin, true, 'the stored admin seed makes us admin');
	assert.equal(joined.beam, false);
	assert.equal(joined.chat, '');
	assert.deepEqual(joined.connections, []);
	assert.ok(/^\d+$/.test(joined.time));
	assert.equal(send.of('set-channels').length, 1);

	send.clear();
	assert.equal(await ctx.joinDm(DERIVATION, ADDRESS_2 + 'f'.repeat(64)), true);
	await ctx.settled();
	const dm = JSON.parse(send.of('swarm-connected')[0]);
	const dmTopic = keys.dmTopic(DERIVATION).topic;
	assert.equal(dm.key, DERIVATION, 'DM swarms keep the derivation hash as their renderer key');
	assert.equal(dm.topic, dmTopic);
	assert.equal(dm.beam, true);
	assert.equal(dm.chat, ADDRESS_2);
	assert.ok(hugin.syncImages.includes(dmTopic), 'files in a DM are synced');
	assert.deepEqual(store.get('syncImages'), hugin.syncImages);

	send.clear();
	assert.equal(await ctx.endSwarm(invite), true);
	await ctx.settled();
	assert.deepEqual(send.of('swarm-disconnected'), [keys.roomTopic(invite).topic]);
	assert.equal(await ctx.endSwarm(ADDRESS_2 + 'f'.repeat(64), true), true);
	await ctx.settled();
	assert.deepEqual(send.of('swarm-disconnected').slice(-1), [dmTopic]);
});

test('peer:joined / peer:left: flat peer-connected with avatar bytes, the room user saved, peer-disconnected', async (t) => {
	const { ctx, send, db } = make(t);
	const topic = 'ef'.repeat(32);
	await emit(ctx, E.PEER_JOINED, {
		key: 'k',
		topic,
		dm: false,
		peer: { address: ADDRESS_2, name: '<i>bob</i>', avatar: AVATAR, voice: true, video: false, audioMute: true, videoMute: false, screenshare: false, admin: true, time: PAST }
	});
	const [peer] = send.of('peer-connected');
	assert.equal(peer.topic, topic);
	assert.equal(peer.address, ADDRESS_2);
	assert.equal(peer.name, 'bob');
	assert.equal(peer.admin, true);
	assert.equal(peer.joined, true);
	assert.equal(peer.time, String(PAST));
	assert.equal(peer.voice, true);
	assert.equal(peer.audioMute, true);
	assert.ok(Buffer.isBuffer(peer.avatar));
	assert.equal(peer.avatar.toString(), 'avatar bytes');
	const [[user]] = db.calledWith('saveRoomUser');
	assert.deepEqual({ ...user, avatar: user.avatar.toString() }, { name: 'bob', address: ADDRESS_2, room: topic, avatar: 'avatar bytes' });

	await emit(ctx, E.PEER_LEFT, { key: 'k', topic, dm: false, address: ADDRESS_2 });
	assert.deepEqual(send.of('close-voice-channel-with-peer'), [ADDRESS_2]);
	assert.deepEqual(send.of('peer-disconnected'), [{ address: ADDRESS_2, topic }]);
});

test('room:message: stored exactly as signed (signature, integer timestamp, text, empty name), shown as plain text', async (t) => {
	const { ctx, send, db } = make(t);
	const { invite } = keys.createRoomInvite();
	const topic = keys.roomTopic(invite).topic;
	const m = signedRoomMessage({ room: invite, message: MARKUP, name: '', reply: '' });
	await emit(ctx, E.ROOM_MESSAGE, { key: invite, topic, message: m, history: false, live: true });

	const row = db.rooms.get(m.hash);
	assert.equal(row.message, MARKUP, 'the text as signed');
	assert.equal(row.signature, m.signature);
	assert.equal(row.timestamp, PAST, 'the integer timestamp as received');
	assert.equal(row.name, '');
	assert.equal(row.sent, false);
	// what the database hands back verifies again at a peer
	const back = await ctx.host.getRoomMessage(m.hash);
	const r = S.roomMessage(back, { hexHash: true });
	assert.ok(r.ok);
	assert.ok(W.isRoomMessageHash(r.value));
	assert.equal(await fakeVerify(W.roomMessageSigningPayload(r.value), r.value.address, r.value.signature), true);

	const [ui] = send.of('roomMsg');
	assert.equal(ui.message, S.sanitizeText(MARKUP));
	assert.equal(ui.name, 'Anonymous');
	assert.equal(ui.timestamp, String(PAST));
	assert.equal(ui.channel, 'channel');
	assert.equal(ui.sent, false);
	assert.equal(ui.signature, m.signature);
	assert.deepEqual(send.of('room-notification'), [[ui, false]]);

	// a message the database already has is not shown again
	send.clear();
	await emit(ctx, E.ROOM_MESSAGE, { key: invite, topic, message: m, history: false, live: true });
	assert.deepEqual(send.channels(), []);
});

test('room:message from history only notifies; room:history sends history-update with the missing messages', async (t) => {
	const { ctx, send, db } = make(t);
	const { invite } = keys.createRoomInvite();
	const topic = keys.roomTopic(invite).topic;
	const a = signedRoomMessage({ room: invite, message: 'one', timestamp: PAST });
	const b = signedRoomMessage({ room: invite, message: 'two <b>x</b>', timestamp: PAST + 1, tip: { amount: 5, receiver: ADDRESS } });
	ctx.p2p.emit(E.ROOM_MESSAGE, { key: invite, topic, message: a, history: true, live: true });
	ctx.p2p.emit(E.ROOM_MESSAGE, { key: invite, topic, message: b, history: true, live: true });
	ctx.p2p.emit(E.ROOM_HISTORY, { key: invite, topic, count: 2, missing: [a, b] });
	await ctx.settled();
	assert.equal(send.of('roomMsg').length, 0);
	assert.equal(send.of('room-notification').length, 2);
	assert.deepEqual(db.rooms.get(b.hash).tip, { amount: 5, receiver: ADDRESS });
	// the update comes after both messages were saved
	assert.deepEqual(send.channels(), ['room-notification', 'room-notification', 'history-update']);
	const [update] = send.of('history-update');
	assert.equal(update.key, invite);
	assert.deepEqual(update.missing.map((x) => x.message), ['one', 'two x']);

	send.clear();
	await emit(ctx, E.ROOM_HISTORY, { key: invite, topic, count: 0, missing: [] });
	assert.deepEqual(send.channels(), []);
});

test('dm:wire goes to the DM decrypter; node:messages pushed by the node to the message decrypter (not a sync result)', async (t) => {
	const { ctx, decrypted } = make(t);
	await emit(ctx, E.DM_WIRE, { address: ADDRESS_2, topic: 'ab'.repeat(32), wire: 'beef' });
	assert.deepEqual(decrypted.dm, ['beef']);
	const messages = [{ hash: HASH, cipher: 'aa', timestamp: PAST }];
	ctx.p2p.emit(E.NODE_MESSAGES, { messages, source: 'push' });
	ctx.p2p.emit(E.NODE_MESSAGES, { messages, source: 'sync', since: PAST });
	await sleep(20);
	assert.deepEqual(decrypted.node, [messages]);
});

test('typing: the renderer key of the swarm (DM: the derivation hash)', async (t) => {
	const { ctx, send } = make(t);
	await ctx.joinDm(DERIVATION, ADDRESS_2);
	const topic = keys.dmTopic(DERIVATION).topic;
	await emit(ctx, E.TYPING, { key: ADDRESS_2, topic, address: ADDRESS_2, typing: true, dm: true });
	assert.deepEqual(send.of('typing'), [{ typing: true, key: DERIVATION, address: ADDRESS_2 }]);
});

test('ban:self: banned and the room removed; ban:peer: the ban is persisted for the topic', async (t) => {
	const { ctx, send, db, hugin } = make(t);
	await emit(ctx, E.BAN_SELF, { key: 'invite-key', topic: 'ab'.repeat(32) });
	assert.deepEqual(send.of('banned'), ['invite-key']);
	assert.deepEqual(db.calledWith('removeRoom'), [['invite-key']]);
	await emit(ctx, E.BAN_PEER, { key: 'invite-key', topic: 'ab'.repeat(32), address: ADDRESS_2, admin: true });
	assert.equal(hugin.banned(ADDRESS_2, 'ab'.repeat(32)), true);
	assert.equal(hugin.banned(ADDRESS_2, 'cd'.repeat(32)), false);
});

test('feed:message: stored as signed (tip included), shown as plain text with type feed, once', async (t) => {
	const { ctx, send, db } = make(t);
	const f = signedFeed({ message: MARKUP, tip: { amount: 3, receiver: ADDRESS } });
	await emit(ctx, E.FEED_MESSAGE, { message: f });
	const row = db.feed.get(f.hash);
	assert.equal(row.message, MARKUP);
	assert.equal(row.signature, f.signature);
	assert.deepEqual(row.tip, { amount: 3, receiver: ADDRESS });
	const [ui] = send.of('feed-message');
	assert.equal(ui.message, S.sanitizeText(MARKUP));
	assert.equal(ui.type, 'feed');
	assert.equal(ui.hash, f.hash);
	// served back to peers as signed
	const [served] = await ctx.host.getFeedHistory();
	assert.equal(await fakeVerify(W.feedSigningPayload(S.feedMessage(served).value), f.address, f.signature), true);

	send.clear();
	await emit(ctx, E.FEED_MESSAGE, { message: f });
	assert.deepEqual(send.channels(), []);
});

test('voice events: status with avatar bytes, call, offer, answer and retry payloads', async (t) => {
	const { ctx, send } = make(t);
	const topic = 'ab'.repeat(32);
	const status = { key: 'k', topic, address: ADDRESS_2, name: 'bob', avatar: AVATAR, message: '', voice: true, video: false, audioMute: false, videoMute: false, screenshare: true };
	await emit(ctx, E.VOICE_STATUS, status);
	const [vs] = send.of('voice-channel-status');
	assert.equal(vs.address, ADDRESS_2);
	assert.equal(vs.topic, topic);
	assert.equal(vs.signature, '');
	assert.equal(vs.screenshare, true);
	assert.equal(vs.avatar.toString(), 'avatar bytes');
	assert.deepEqual(send.of('user-joined-voice-channel'), [vs]);
	await emit(ctx, E.VOICE_STATUS, { ...status, voice: false });
	assert.equal(send.of('user-joined-voice-channel').length, 1, 'only joining is announced');

	await emit(ctx, E.VOICE_CALL, { key: 'k', topic, address: ADDRESS_2, name: 'bob', video: true, audioMute: false, videoMute: false, screenshare: false });
	assert.deepEqual(send.of('join-voice-channel'), [{ key: 'k', topic, address: ADDRESS_2, name: 'bob', audioMute: false, videoMute: false, screenshare: false, video: true }]);
	const sdp = { data: 'sdp', offer: true, address: ADDRESS_2, topic, retry: false };
	await emit(ctx, E.VOICE_OFFER, { key: 'k', topic, address: ADDRESS_2, data: sdp });
	await emit(ctx, E.VOICE_ANSWER, { key: 'k', topic, address: ADDRESS_2, data: { ...sdp, offer: false } });
	await emit(ctx, E.VOICE_RETRY, { key: 'k', topic, address: ADDRESS_2, data: { ...sdp, retry: true } });
	assert.deepEqual(send.of('answer-voice-channel'), [sdp]);
	assert.deepEqual(send.of('got-answer-voice-channel'), [{ ...sdp, offer: false }]);
	assert.deepEqual(send.of('got-expanded-voice-channel'), [['sdp', ADDRESS_2]]);
});

test('file:remote: a room file is listed (key = topic) and shown as a message once; a DM file is listed for the sender', async (t) => {
	const { ctx, send, db } = make(t);
	const { invite } = keys.createRoomInvite();
	const topic = keys.roomTopic(invite).topic;
	const file = { fileName: 'a.png', address: ADDRESS_2, size: 10, topic, key: invite, chat: ADDRESS_2, hash: HASH, name: 'bob', time: PAST, signature: 'f'.repeat(128), driveKey: DRIVE_KEY };
	await emit(ctx, E.FILE_REMOTE, { key: invite, topic, dm: false, file });
	const [listed] = send.of('group-remote-file-added');
	assert.equal(listed.chat, invite);
	assert.deepEqual(listed.remoteFiles, [{ ...file, key: topic }]);
	assert.deepEqual(send.channels(), ['group-remote-file-added', 'roomMsg'], 'the remote file comes before its message');
	const row = db.rooms.get(HASH);
	assert.equal(row.room, invite);
	assert.equal(row.message, 'a.png');
	assert.equal(row.signature, '');

	send.clear();
	await emit(ctx, E.FILE_REMOTE, { key: invite, topic, dm: false, file });
	assert.deepEqual(send.channels(), ['group-remote-file-added'], 'the file message exists already');

	send.clear();
	const dmTopic = 'cd'.repeat(32);
	await emit(ctx, E.FILE_REMOTE, { key: ADDRESS_2, topic: dmTopic, dm: true, file: { ...file, topic: dmTopic, key: ADDRESS_2 } });
	const [dm] = send.of('remote-file-added');
	assert.equal(dm.chat, ADDRESS_2);
	assert.equal(dm.remoteFiles[0].key, ADDRESS_2);
	assert.equal(dm.remoteFiles[0].driveKey, DRIVE_KEY);
});

test('file progress: auto-sync is silent, a download the user asked for reports downloading and progress', async (t) => {
	const { ctx, send } = make(t);
	const base = { hash: HASH, fileName: 'a.png', chat: ADDRESS_2, address: ADDRESS_2, name: 'bob', time: PAST, size: 10, topic: 'ab'.repeat(32), key: 'k', dm: false, driveKey: DRIVE_KEY };
	await emit(ctx, E.FILE_DOWNLOADING, { ...base, auto: true });
	await emit(ctx, E.FILE_PROGRESS, { ...base, auto: true, progress: 50 });
	assert.deepEqual(send.channels(), []);
	await emit(ctx, E.FILE_DOWNLOADING, { ...base, auto: false });
	await emit(ctx, E.FILE_PROGRESS, { ...base, auto: false, progress: 100 });
	assert.deepEqual(send.of('downloading'), [{ fileName: 'a.png', chat: ADDRESS_2, time: PAST, size: 10, hash: HASH }]);
	assert.deepEqual(send.of('download-file-progress'), [{ fileName: 'a.png', chat: ADDRESS_2, time: PAST, progress: 100 }]);
});

test('file:downloaded: the file list, file-downloaded, and a room message or a DM message', async (t) => {
	const { ctx, send, db, hugin } = make(t);
	const topic = 'ab'.repeat(32);
	const base = { hash: HASH, fileName: 'a.png', chat: ADDRESS_2, address: ADDRESS_2, name: 'bob', time: PAST, size: 10, topic, key: 'invite', dm: false, driveKey: DRIVE_KEY, auto: true, path: 'storage' };
	await emit(ctx, E.FILE_DOWNLOADED, base);
	assert.deepEqual(hugin.get_files(), [{ fileName: 'a.png', time: PAST, size: 10, path: 'storage', hash: HASH, topic }]);
	const downloaded = JSON.parse(send.of('file-downloaded')[0]);
	assert.equal(downloaded.hash, HASH);
	assert.equal(downloaded.topic, topic);
	const [msg] = send.of('roomMsg');
	assert.equal(msg.room, 'invite');
	assert.equal(msg.file.type, 'image');
	assert.equal(msg.file.saved, true);
	assert.ok(db.rooms.has(HASH));

	send.clear();
	const hash2 = 'ef'.repeat(32);
	await emit(ctx, E.FILE_DOWNLOADED, { ...base, hash: hash2, dm: true, key: ADDRESS_2 });
	assert.deepEqual(db.calledWith('saveMsg').slice(-1), [['Downloaded a.png', ADDRESS_2, false, PAST]]);
	assert.equal(send.of('newMsg').length, 1);
	assert.equal(send.of('privateMsg').length, 1);
	const [added] = send.of('remote-file-added');
	assert.equal(added.chat, ADDRESS_2);
	assert.equal(added.remoteFiles[0].saved, true);
	assert.equal(added.remoteFiles[0].path, 'storage');
});

test('file:uploaded and file:removed: the file list, upload progress, deleted hashes (not for pruned files)', async (t) => {
	const { ctx, send, hugin } = make(t);
	const topic = 'ab'.repeat(32);
	await emit(ctx, E.FILE_UPLOADED, { hash: HASH, fileName: 'a.png', chat: ADDRESS, address: ADDRESS, name: 'nils', time: PAST, size: 10, topic, key: 'k', dm: false, path: '/tmp/a.png' });
	assert.deepEqual(hugin.get_files(), [{ fileName: 'a.png', time: PAST, size: 10, path: '/tmp/a.png', hash: HASH, topic }]);
	assert.deepEqual(send.of('upload-file-progress'), [{ fileName: 'a.png', chat: ADDRESS, time: PAST, progress: 100 }]);
	await emit(ctx, E.FILE_REMOVED, { topic, key: 'k', dm: false, hashes: ['11'.repeat(32)], reason: 'prune' });
	assert.equal(hugin.is_deleted('11'.repeat(32)), false);
	await emit(ctx, E.FILE_REMOVED, { topic, key: 'k', dm: false, hashes: [HASH], reason: 'delete' });
	assert.equal(hugin.is_deleted(HASH), true);
});

test('node events: connection state (not on destroy), node address; errors: a failed download is shown, node errors are not', async (t) => {
	const { ctx, send } = make(t);
	await emit(ctx, E.NODE_CONNECTED, { remotePublicKey: 'k', backup: false, publicNode: true });
	await emit(ctx, E.NODE_DISCONNECTED, { reason: 'change' });
	await emit(ctx, E.NODE_DISCONNECTED, { reason: 'destroy' });
	assert.deepEqual(send.of('hugin-node-connection'), [true, false]);
	await emit(ctx, E.NODE_ADDRESS, { address: ADDRESS_2, version: '1' });
	assert.deepEqual(send.of('hugin-node-address'), [ADDRESS_2]);
	await emit(ctx, E.ERROR, { message: 'connection reset', source: 'node' });
	await emit(ctx, E.ERROR, { message: 'file not in the peer drive', source: 'files' });
	assert.deepEqual(send.of('error-notify-message'), ['file not in the peer drive']);
	// ignored events reach no renderer channel
	send.clear();
	ctx.p2p.emit(E.NODE_JOB, { job: {} });
	ctx.p2p.emit(E.NODE_ERROR, { message: 'x', code: 'y' });
	ctx.p2p.emit('node:pow-required', { kind: 'post', hash: HASH, attempt: 1 });
	await ctx.settled();
	assert.deepEqual(send.channels(), []);
});

test('a failing event handler is logged and later events are still handled', async (t) => {
	const logs = [];
	const { ctx, send } = make(t, { deps: { log: (level, msg, data) => logs.push([level, msg, data]) } });
	ctx.db.saveFeedMessage = async () => {
		throw new Error('disk full');
	};
	await emit(ctx, E.FEED_MESSAGE, { message: signedFeed() });
	await emit(ctx, E.NODE_ADDRESS, { address: ADDRESS_2 });
	assert.ok(logs.some(([level, msg, data]) => level === 'warn' && msg === 'event not handled' && data.event === E.FEED_MESSAGE));
	assert.deepEqual(send.of('hugin-node-address'), [ADDRESS_2]);
});

// =============================================================================================
// host hooks

test('host hooks: identity, spend-key signing, an awaited verifier that only accepts true', async () => {
	const signed = [];
	const hugin = fakeHugin({ address: ADDRESS, nickname: '<b>nils</b>', avatar: AVATAR });
	const host = H.createHost({
		db: memoryDb(),
		hugin,
		store: memoryStore(),
		sign: async (m) => {
			signed.push(m);
			return 'sig';
		},
		verify: async (m, a, s) => (s === 'throw' ? Promise.reject(new Error('bad key')) : s === 'yes' ? 'yes' : s === 'ok')
	});
	assert.deepEqual(host.identity(), { address: ADDRESS, name: 'nils', avatar: AVATAR });
	hugin.nickname = 'later';
	assert.equal(host.identity().name, 'later', 'read when asked');
	assert.equal(await host.sign('payload'), 'sig');
	assert.deepEqual(signed, ['payload']);
	assert.equal(await host.verify('m', ADDRESS, 'ok'), true);
	assert.equal(await host.verify('m', ADDRESS, 'no'), false);
	assert.equal(await host.verify('m', ADDRESS, 'yes'), false, 'a truthy answer is not true');
	assert.equal(await host.verify('m', ADDRESS, 'throw'), false);
	assert.equal(host.findShare, undefined, 'no PoW backend unless given');
	assert.equal(host.paths, undefined, 'no file storage unless given');
});

test('host hooks: storage queries go to the database unchanged', async () => {
	const db = memoryDb();
	const host = H.createHost({ db, hugin: fakeHugin(), store: memoryStore(), sign: async () => '', verify: async () => false });
	const { invite } = keys.createRoomInvite();
	const m = signedRoomMessage({ room: invite });
	await db.saveGroupMsg(H.roomMessageRow(m));
	await db.saveGroupMsg({ message: 'a.png', room: invite, hash: HASH, signature: '', timestamp: PAST, name: 'x', reply: '', address: ADDRESS_2 });
	assert.equal(await host.roomMessageExists(m.hash), true);
	assert.equal(await host.roomMessageExists('00'.repeat(32)), false);
	const history = await host.getRoomHistory(invite);
	assert.deepEqual(history.map((r) => r.hash), [m.hash], 'unsigned file rows are not history');
	assert.equal(history[0].timestamp, PAST);
	assert.deepEqual(await host.getLatestRoomHashes(invite), [m.hash]);
	assert.equal((await host.getRoomMessage(m.hash)).signature, m.signature);
	const f = signedFeed();
	await db.saveFeedMessage(H.feedRow(f));
	assert.equal(await host.feedMessageExists(f.hash), true);
	assert.equal((await host.getFeedHistory()).length, 1);
});

test('host hooks: bans per topic, blocks, per-topic file sync, known and deleted files, the storage limit', () => {
	const store = memoryStore();
	const hugin = fakeHugin({ store });
	const host = H.createHost({ db: memoryDb(), hugin, store, sign: async () => '', verify: async () => false, findShare: async () => null, paths: () => ({ storage: '/s', downloads: '/d' }) });
	const topic = 'ab'.repeat(32);
	hugin.ban(ADDRESS_2, topic);
	assert.equal(host.isBanned(ADDRESS_2, topic), true);
	assert.equal(host.isBanned(ADDRESS_2, 'cd'.repeat(32)), false);
	hugin.block_list.push({ address: ADDRESS_2 });
	assert.equal(host.isBlocked(ADDRESS_2), true);
	assert.equal(host.isBlocked(ADDRESS), false);
	assert.equal(host.autoSyncFiles(topic, 'invite', false), false);
	hugin.syncImages.push(topic);
	assert.equal(host.autoSyncFiles(topic, 'invite', false), true);
	assert.equal(host.knownFile(HASH), false);
	hugin.file_info({ hash: HASH });
	assert.equal(host.knownFile(HASH), true);
	hugin.add_deleted_hashes(['11'.repeat(32)]);
	assert.equal(host.knownFile('11'.repeat(32)), true);
	assert.equal(host.storageLimit(), 100000000000);
	store.set('storageLimit', 5000);
	assert.equal(host.storageLimit(), 5000);
	assert.equal(typeof host.findShare, 'function');
	assert.deepEqual(host.paths(), { storage: '/s', downloads: '/d' });
});

test('PoW backend: the job goes to the workers with the time budget; no share or an invalid job gives null', async () => {
	const seen = [];
	let share = null;
	const challenge = {
		setJob: (job) => seen.push(['job', job.job_id]),
		findShare: async (ms) => {
			seen.push(['ms', ms]);
			return share;
		}
	};
	let created = 0;
	const findShare = H.createPowBackend({
		createChallenge: () => {
			created++;
			return challenge;
		},
		hash: async () => '00'.repeat(32)
	});
	assert.equal(await findShare({ job: { job_id: 'j1' }, timeBudgetMs: 30000 }), null);
	assert.deepEqual(seen, [['job', 'j1'], ['ms', 30000]]);
	share = { nonce: 'AABBCCDD', result: 'AB'.repeat(32) };
	assert.equal(await findShare({ job: { job_id: 'j2' }, timeBudgetMs: 10 }), null, 'a share for a job that does not validate is not used');
	assert.equal(created, 1, 'one worker pool');
});

// =============================================================================================
// ipcMain handlers and sending

test('ipcMain: the room, voice and file channels the renderer uses', (t) => {
	const { ctx } = make(t);
	const ipcMain = fakeIpcMain();
	ctx.registerIpc(ipcMain);
	assert.deepEqual(
		[...ipcMain.listeners.keys()].sort(),
		[
			'ban-user',
			'exit-voice-channel',
			'expand-voice-channel-sdp',
			'get-sdp-voice-channel',
			'group-download',
			'group-upload',
			'join-voice',
			'new-channel',
			'typing',
			'update-voice-channel-status'
		].sort()
	);
	assert.deepEqual([...ipcMain.handlers.keys()], ['save-to-downloads']);
});

test('ipcMain: typing, ban and voice go to the room the renderer key names; UI echoes; save-to-downloads without storage', async (t) => {
	const { ctx, send } = make(t);
	const ipcMain = fakeIpcMain();
	ctx.registerIpc(ipcMain);
	const { invite } = keys.createRoomInvite();
	await ctx.joinRoom(invite);
	await ctx.joinDm(DERIVATION, ADDRESS_2);
	const calls = [];
	ctx.p2p.rooms.typing = (key, typing) => calls.push(['typing', key, typing]);
	ctx.p2p.rooms.ban = async (key, address) => calls.push(['ban', key, address]);
	ctx.p2p.voice.setStatus = async (key, status, opts) => calls.push(['voice', key, status, opts]);
	await ipcMain.send('typing', { key: DERIVATION, typing: true });
	await ipcMain.send('typing', { key: invite, typing: false });
	await ipcMain.send('ban-user', { key: invite, address: ADDRESS_2 });
	await ipcMain.send('join-voice', { key: invite, video: true, audioMute: false, videoMute: false, screenshare: false });
	await ipcMain.send('update-voice-channel-status', { key: invite, video: false, audioMute: true, videoMute: false, screenshare: false });
	await sleep(10);
	assert.deepEqual(calls, [
		['typing', ADDRESS_2, true],
		['typing', invite, false],
		['ban', invite, ADDRESS_2],
		['voice', invite, { voice: true, video: true, audioMute: false, videoMute: false, screenshare: false }, { update: false }],
		['voice', invite, { voice: true, video: false, audioMute: true, videoMute: false, screenshare: false }, { update: true }]
	]);

	await ipcMain.send('expand-voice-channel-sdp', ['sdp', ADDRESS_2]);
	await ipcMain.send('new-channel', { name: 'general' });
	await sleep(10);
	assert.deepEqual(send.of('got-expanded-voice-channel'), [['sdp', ADDRESS_2]]);
	assert.deepEqual(send.of('channel-created'), [{ name: 'general' }]);

	const result = await ipcMain.invoke('save-to-downloads', { hash: HASH, fileName: 'a.png', topic: 'ab'.repeat(32) });
	assert.equal(result.success, false);
	assert.equal(send.of('error-notify-message').length, 1);
});

test('exit-voice-channel: leaves only the voice channel we are in, and tells the renderer to close its calls', async (t) => {
	const { ctx, send } = make(t);
	const { invite } = keys.createRoomInvite();
	const other = keys.createRoomInvite().invite;
	await ctx.joinRoom(invite);
	await ctx.joinRoom(other);
	assert.equal(await ctx.exitVoice(invite), false, 'not in voice');
	assert.equal(await ctx.setVoiceStatus({ key: invite }, false), true);
	assert.equal(await ctx.exitVoice(other), false, 'in voice in another room');
	assert.deepEqual(send.of('leave-voice-channel'), []);
	assert.equal(await ctx.exitVoice(invite), true);
	assert.equal(send.of('leave-active-voice-channel').length, 1);
	assert.equal(send.of('leave-voice-channel').length, 1);
	assert.equal(ctx.p2p.voice.active, null);
});

test('sendRoomMessage: plain text, hash derived, signed by our address; signed only when the room is not joined', async (t) => {
	const { ctx } = make(t, { nickname: '<b>nils</b>' });
	const { invite } = keys.createRoomInvite();
	const offline = await ctx.sendRoomMessage({ room: invite, message: MARKUP, reply: '', tip: false, timestamp: PAST, hash: 'ignored' });
	assert.equal(offline.message, S.sanitizeText(MARKUP));
	assert.equal(offline.name, 'nils');
	assert.equal(offline.timestamp, String(PAST));
	assert.equal(offline.sent, true);
	assert.equal(offline.channel, 'channel');
	const signedFields = { ...offline, timestamp: PAST };
	assert.ok(W.isRoomMessageHash(signedFields));
	assert.equal(await fakeVerify(W.roomMessageSigningPayload(signedFields), ADDRESS, offline.signature), true);

	await ctx.joinRoom(invite);
	const sent = [];
	const send = ctx.p2p.rooms.send.bind(ctx.p2p.rooms);
	ctx.p2p.rooms.send = async (key, fields) => {
		const out = await send(key, fields);
		sent.push(out);
		return out;
	};
	const live = await ctx.sendRoomMessage({ room: invite, message: 'hello', timestamp: PAST + 5 });
	assert.equal(sent.length, 1, 'sent through the joined room');
	assert.equal(live.hash, sent[0].hash);
	assert.equal(live.signature, sent[0].signature);
	assert.equal(await ctx.sendRoomMessage({ message: 'no room' }), null);
});

test('ownRoomMessage ("Joined room"): signed, not sent', async (t) => {
	const { ctx } = make(t);
	const { invite } = keys.createRoomInvite();
	const m = await ctx.ownRoomMessage({ room: invite, message: 'Joined room', reply: '', tip: false, timestamp: PAST });
	assert.equal(m.message, 'Joined room');
	assert.equal(m.room, invite);
	assert.equal(await fakeVerify(W.roomMessageSigningPayload({ ...m, timestamp: PAST }), ADDRESS, m.signature), true);
});

test('topicKeyMap: open swarms with their renderer keys (storage stats)', async (t) => {
	const { ctx } = make(t);
	const { invite } = keys.createRoomInvite();
	await ctx.joinRoom(invite);
	await ctx.joinDm(DERIVATION, ADDRESS_2 + 'f'.repeat(64));
	assert.deepEqual(ctx.topicKeyMap(), {
		[keys.roomTopic(invite).topic]: { key: invite, beam: false, chat: null },
		[keys.dmTopic(DERIVATION).topic]: { key: DERIVATION, beam: true, chat: ADDRESS_2 }
	});
});
