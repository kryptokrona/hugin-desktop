'use strict';

// Adapter glue between hugin-p2p's pure modules and this backend (src/backend/p2p-wire.cjs).
// node:test, no network, no Electron: `node --test tests/backend/*.test.cjs`
// (pnpm run test:backend).
//
// Inbound: the adapters must return the shapes the IPC events and the database have always
// received. Outbound: the builders must produce what hugin-p2p-design/WIRE.md §2 lists, and
// every message must decode again with the library (what new peers accept). Room and feed
// messages carry a hash derived from their fields and a 128-hex signature over the library's
// domain-prefixed payload; signing goes through a `sign` function the backend supplies.

const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../../src/backend/p2p-wire.cjs');
const wire = require('hugin-p2p/wire');

const ADDRESS = 'SEKR' + 'a'.repeat(95);
const ADDRESS_2 = 'SEKR' + 'b'.repeat(95);
const TOPIC = 'ab'.repeat(32);
const HASH = 'cd'.repeat(32);
const HASH_2 = 'ef'.repeat(32);
const INVITE = '12'.repeat(64);
const DRIVE_KEY = '34'.repeat(32);
const SIG = 'f'.repeat(128);
const PAST = 1700000000000;

/**
 * A room message as a peer sends it: signed, hash derived from the fields unless `over.hash` is
 * given. The hash is computed over the normalized form (integer timestamp, `nickname` as the
 * name when `name` is missing), the way receivers recompute it; when the fields cannot be
 * hashed (an invalid message on purpose) a fixed hash is used.
 */
const roomInput = (over = {}) => {
	const m = {
		message: 'hi',
		room: INVITE,
		reply: '',
		address: ADDRESS,
		timestamp: PAST,
		name: 'nils',
		hash: '',
		signature: SIG,
		tip: false,
		...over
	};
	if (!over.hash) {
		const name = m.name === undefined || m.name === null ? m.nickname : m.name;
		try {
			m.hash = wire.roomMessageHash({ ...m, timestamp: Number(m.timestamp), name });
		} catch (e) {
			m.hash = HASH;
		}
	}
	return m;
};

/** A feed message as a peer sends it, hash derived unless `over.hash` is given. */
const feedInput = (over = {}) => {
	const m = {
		type: 'feed',
		message: 'post',
		nickname: 'nils',
		address: ADDRESS,
		reply: '',
		tip: false,
		hash: '',
		timestamp: PAST,
		signature: SIG,
		...over
	};
	if (!over.hash) m.hash = wire.feedMessageHash(m);
	return m;
};

/** A signer stub returning `signature`, remembering what it signed. */
const signer = (signature = SIG) => {
	const calls = [];
	const sign = async (m) => {
		calls.push(m);
		return signature;
	};
	sign.calls = calls;
	return sign;
};

const joinedInput = (over = {}) => ({
	address: ADDRESS,
	signature: '',
	avatar: '',
	message: TOPIC,
	joined: true,
	topic: TOPIC,
	name: 'nils',
	voice: false,
	channels: [],
	video: false,
	time: String(PAST),
	idSig: SIG,
	audioMute: false,
	videoMute: false,
	screenshare: false,
	messages: [],
	...over
});

const voiceInput = (over = {}) => ({
	address: ADDRESS,
	avatar: '',
	signature: SIG,
	message: TOPIC,
	voice: true,
	topic: TOPIC,
	name: 'nils',
	video: false,
	audioMute: false,
	videoMute: true,
	screenshare: false,
	...over
});

const parse = (str) => JSON.parse(str);

// ---------------------------------------------------------------------------------------------
// inbound adapters: same shapes as before

test('roomMessageIn: the object desktop saves and sends to the renderer', () => {
	const input = roomInput();
	const m = W.roomMessageIn(input);
	assert.deepEqual(m, {
		message: 'hi',
		address: ADDRESS,
		signature: SIG,
		room: INVITE,
		timestamp: String(PAST),
		name: 'nils',
		reply: '',
		hash: input.hash,
		sent: false,
		channel: 'channel',
		tip: false
	});
	assert.equal(W.roomMessageIn(roomInput(), { sent: true }).sent, true);
	assert.equal(W.roomMessageIn(roomInput({ timestamp: String(PAST) })).timestamp, String(PAST), 'string timestamps are read');
});

test('roomMessageSign: the "Joined room" call site and the send path (derived hash, signed)', async () => {
	const sign = signer();
	const m = await W.roomMessageSign(
		{ timestamp: PAST, room: INVITE, message: 'Joined room', address: ADDRESS, reply: '', name: 'nils', hash: HASH, tip: false },
		sign
	);
	assert.equal(m.message, 'Joined room');
	assert.equal(m.timestamp, String(PAST));
	assert.equal(parseInt(m.timestamp), PAST);
	assert.equal(m.sent, true);
	assert.equal(m.signature, SIG);
	assert.notEqual(m.hash, HASH, 'the hash passed in is replaced by the derived one');
	assert.ok(W.isRoomMessageHash({ ...m, timestamp: PAST }));
	assert.equal(sign.calls.length, 1);
	assert.equal(sign.calls[0], W.roomMessageSigningPayload({ ...m, timestamp: PAST }));
	assert.ok(sign.calls[0].startsWith('hugin/room-message\n'));
	// what the wire carries decodes again, and verifies with a verifier that gets the same payload
	const out = JSON.parse(W.roomMessageOut(m));
	assert.equal(W.decode(JSON.stringify(out)).type, 'room-message');
	assert.equal(await W.verifyRoomMessage(out, async (p, a, s) => p === sign.calls[0] && a === ADDRESS && s === SIG), true);

	// own text is sanitized before it is hashed and signed, so the wire carries what was signed
	const marked = await W.roomMessageSign({ timestamp: PAST, room: INVITE, message: '<b>bold</b> &amp; done', address: ADDRESS, name: '<i>nils</i>' }, sign);
	assert.equal(marked.message, 'bold & done');
	assert.equal(marked.name, 'nils');
	const markedOut = JSON.parse(W.roomMessageOut(marked));
	assert.equal(markedOut.message, 'bold & done');
	assert.ok(W.isRoomMessageHash(markedOut), 'the sent text is the hashed text');
	assert.equal(W.roomMessageIn(markedOut).message, 'bold & done');

	await assert.rejects(W.roomMessageSign({ timestamp: PAST, room: INVITE, message: 'x', address: ADDRESS, name: 'n'.repeat(51) }, sign));
	await assert.rejects(W.roomMessageSign({ timestamp: PAST, room: INVITE, message: 'x', address: ADDRESS, name: 'nils' }, async () => ''), /signature/);
	await assert.rejects(W.roomMessageSign({ timestamp: PAST, room: INVITE, message: 'x', address: ADDRESS, name: 'nils' }, signer('short')), 'the signature must be 128 hex characters');
});

test('verifyRoomMessage: the verifier gets the library payload of the message as sent', async () => {
	const input = roomInput({ message: '<b>hi</b>' });
	const calls = [];
	const ok = await W.verifyRoomMessage(input, async (payload, address, signature) => {
		calls.push([payload, address, signature]);
		return true;
	});
	assert.equal(ok, true);
	assert.deepEqual(calls, [[wire.roomMessageSigningPayload(input), ADDRESS, SIG]]);
	assert.ok(calls[0][0].includes('<b>hi</b>'), 'the text as sent, not sanitized');
	assert.equal(await W.verifyRoomMessage(input, async () => false), false);
	assert.equal(await W.verifyRoomMessage(input, async () => 1), false, 'exactly true');
	assert.equal(await W.verifyRoomMessage(input, async () => { throw new Error('x'); }), false);
	assert.equal(await W.verifyRoomMessage(input, undefined), false);
	assert.equal(await W.verifyRoomMessage(roomInput({ hash: HASH }), async () => true), false, 'another hash');
	assert.equal(await W.verifyRoomMessage(roomInput({ signature: '' }), async () => true), false, 'no signature');
});

test('roomMessageIn: text is sanitized like before, nickname accepted', () => {
	const m = W.roomMessageIn(roomInput({ message: '<b>bold</b> text', name: undefined, nickname: 'Tom &amp; Jerry' }));
	assert.equal(m.message, 'bold text');
	assert.equal(m.name, 'Tom & Jerry');
});

test('roomMessageIn: refusals return false', () => {
	assert.equal(W.roomMessageIn(roomInput({ hash: HASH })), false, 'hash not derived from the fields');
	assert.equal(W.roomMessageIn(roomInput({ hash: 'nothex' })), false);
	assert.equal(W.roomMessageIn(roomInput({ signature: '' })), false, 'no signature');
	assert.equal(W.roomMessageIn(roomInput({ signature: 'sig' })), false);
	assert.equal(W.roomMessageIn(roomInput({ message: 'x'.repeat(778) })), false);
	assert.equal(W.roomMessageIn(roomInput({ timestamp: undefined })), false);
	assert.equal(W.roomMessageIn(roomInput({ name: 'n'.repeat(51) })), false);
	assert.equal(W.roomMessageIn(roomInput({ tip: { amount: '1', receiver: ADDRESS } })), false);
	assert.equal(W.roomMessageIn(null), false);
	const changed = { ...roomInput(), message: 'changed' };
	assert.equal(W.roomMessageIn(changed), false, 'a changed field no longer matches the hash');
});

test('roomMessageIn: the timestamp is kept as signed; hash case is free; a tip stored as JSON is parsed', () => {
	const ahead = roomInput({ timestamp: PAST + 5000 });
	assert.equal(W.roomMessageIn(ahead).timestamp, String(PAST + 5000));
	const upper = roomInput();
	upper.hash = upper.hash.toUpperCase();
	assert.equal(W.roomMessageIn(upper).hash, upper.hash);
	const m = W.roomMessageIn(roomInput({ tip: { amount: 5, receiver: ADDRESS_2 } }));
	assert.deepEqual(m.tip, { amount: 5, receiver: ADDRESS_2 });
	// a stored row carries the tip as JSON text; the hash was derived from the tip object
	const row = { ...roomInput({ tip: { amount: 5, receiver: ADDRESS_2 } }) };
	row.tip = JSON.stringify(row.tip);
	assert.deepEqual(W.roomMessageIn(row).tip, { amount: 5, receiver: ADDRESS_2 });
});

test('joinedIn: desktop shape, avatar as decoded bytes', () => {
	const j = W.joinedIn(joinedInput({ avatar: 'AAEC', driveKey: DRIVE_KEY, time: PAST }));
	assert.deepEqual(Object.keys(j), [
		'address', 'avatar', 'message', 'signature', 'topic', 'name', 'voice', 'joined', 'channels',
		'video', 'time', 'idSig', 'audioMute', 'videoMute', 'screenshare', 'messages', 'driveKey'
	]);
	assert.ok(Buffer.isBuffer(j.avatar));
	assert.deepEqual([...j.avatar], [0, 1, 2]);
	assert.equal(j.time, String(PAST));
	assert.equal(j.driveKey, DRIVE_KEY);
	assert.deepEqual(j.channels, []);
});

test('joinedIn: no avatar is "", a malformed driveKey is ignored, a bad topic is refused', () => {
	const j = W.joinedIn(joinedInput({ driveKey: 'nothex' }));
	assert.equal(j.avatar, '');
	assert.equal(j.driveKey, null);
	assert.equal(W.joinedIn(joinedInput({ topic: 'short' })), false);
	assert.equal(W.joinedIn(joinedInput({ voice: 'yes' })), false);
});

test('voiceStatusIn: the voice-channel-status payload (not signed)', () => {
	const v = W.voiceStatusIn(voiceInput({ avatar: 'AAEC' }));
	assert.deepEqual(Object.keys(v), [
		'address', 'avatar', 'message', 'signature', 'topic', 'name', 'voice', 'video', 'videoMute',
		'audioMute', 'screenshare'
	]);
	assert.equal(v.signature, '');
	assert.equal(W.voiceStatusIn(voiceInput({ signature: undefined })).address, ADDRESS);
	assert.deepEqual([...v.avatar], [0, 1, 2]);
	assert.equal(W.voiceStatusIn(voiceInput({ avatar: 'not base64!' })).avatar, '');
	assert.equal(W.voiceStatusIn(voiceInput({ video: undefined })), false);
});

test('fileMessageIn: numbers for size/time, signature as sig', () => {
	const f = W.fileMessageIn({
		fileName: 'cat.png',
		address: ADDRESS,
		name: 'nils',
		topic: TOPIC,
		info: 'file-shared',
		type: 'file',
		size: '10',
		time: String(PAST),
		hash: HASH,
		signature: SIG
	});
	assert.deepEqual(f, {
		fileName: 'cat.png',
		address: ADDRESS,
		name: 'nils',
		topic: TOPIC,
		info: 'file-shared',
		type: 'file',
		size: 10,
		time: PAST,
		hash: HASH,
		key: undefined,
		sig: SIG
	});
	assert.equal(W.fileMessageIn({ ...f, signature: SIG, file: true }), false);
});

test('feedMessageIn: what saveFeedMessage and feed-message take', () => {
	const input = feedInput();
	const f = W.feedMessageIn({ ...input, timestamp: String(PAST) });
	assert.deepEqual(f, {
		message: 'post',
		address: ADDRESS,
		nickname: 'nils',
		signature: SIG,
		reply: '',
		hash: input.hash,
		timestamp: PAST,
		tip: false
	});
	assert.equal(W.feedMessageIn(feedInput({ hash: HASH })), false, 'hash not derived from the fields');
	assert.equal(W.feedMessageIn({ ...input, message: 'changed' }), false);
});

test('verifyFeedMessage and feedSign', async () => {
	const input = feedInput();
	const calls = [];
	assert.equal(await W.verifyFeedMessage(input, async (p, a, s) => (calls.push([p, a, s]), true)), true);
	assert.deepEqual(calls, [[wire.feedSigningPayload(input), ADDRESS, SIG]]);
	assert.ok(calls[0][0].startsWith('hugin/feed\n'));
	assert.equal(await W.verifyFeedMessage(input, async () => false), false);
	assert.equal(await W.verifyFeedMessage(feedInput({ hash: HASH }), async () => true), false);

	const sign = signer();
	const payload = await W.feedSign({ message: 'post', nickname: 'nils', address: ADDRESS, reply: undefined, tip: false, timestamp: PAST }, sign);
	assert.deepEqual(payload, { ...input, reply: '' });
	assert.deepEqual(sign.calls, [wire.feedSigningPayload(payload)]);
	assert.equal(W.decode(W.feedOut(payload)).type, 'feed');
	assert.equal(await W.verifyFeedMessage(payload, async (p) => p === sign.calls[0]), true);
	await assert.rejects(W.feedSign({ message: 'post', nickname: 'nils', address: ADDRESS, timestamp: PAST }, async () => ''));
});

test('decode: kinds, DM payloads and ban decisions', () => {
	assert.equal(W.decode(JSON.stringify(roomInput())).type, 'room-message');
	assert.deepEqual(W.decode('a1b2c3', { dm: true }), { type: 'dm', value: 'a1b2c3' });
	const notJson = W.decode('a1b2c3');
	assert.equal(notJson.type, 'invalid');
	assert.equal(notJson.ban, true);
	const bigPing = W.decode(JSON.stringify({ type: 'Ping', hashes: new Array(26).fill(HASH) }));
	assert.equal(bigPing.type, 'invalid');
	assert.equal(bigPing.kind, 'ping');
	assert.equal(bigPing.ban, true);
	assert.equal(W.decode(JSON.stringify({ type: 'something-new' })).type, 'ignored');
	assert.equal(W.decode('null').reason, 'not_object');
	assert.equal(W.decode(JSON.stringify(roomInput()), { dm: true }).type, 'ignored');
	assert.ok(W.PRE_JOIN_KINDS.includes('joined'));
	assert.ok(!W.PRE_JOIN_KINDS.includes('ping'));
});

// ---------------------------------------------------------------------------------------------
// outbound builders: WIRE.md §2

test('joinedOut: fields of WIRE.md, message = topic, time as string', () => {
	const msg = parse(
		W.joinedOut({
			address: ADDRESS,
			signature: '',
			avatar: 'AAEC',
			topic: TOPIC,
			name: 'nils',
			voice: false,
			video: true,
			time: String(PAST),
			idSig: SIG,
			audioMute: undefined,
			videoMute: false,
			screenshare: false,
			messages: [],
			driveKey: DRIVE_KEY
		})
	);
	assert.deepEqual(msg, {
		address: ADDRESS,
		signature: '',
		avatar: 'AAEC',
		message: TOPIC,
		joined: true,
		topic: TOPIC,
		name: 'nils',
		voice: true,
		channels: [],
		video: true,
		time: String(PAST),
		idSig: SIG,
		audioMute: false,
		videoMute: false,
		screenshare: false,
		messages: [],
		driveKey: DRIVE_KEY
	});
	assert.equal(W.decode(JSON.stringify(msg)).type, 'joined');
});

test('joinedOut: no driveKey unless 64 hex, no avatar above 200 000 bytes', () => {
	const base = { address: ADDRESS, topic: TOPIC, name: 'nils', time: '1', idSig: SIG };
	const msg = parse(W.joinedOut({ ...base, driveKey: null, avatar: 'A'.repeat(300000) }));
	assert.ok(!('driveKey' in msg));
	assert.equal(msg.avatar, '');
	assert.throws(() => W.joinedOut({ ...base, name: 'n'.repeat(51) }));
});

test('roomMessageOut: native shape from the desktop-normalized message', () => {
	const input = roomInput({ tip: { amount: 1, receiver: ADDRESS_2 } });
	const normalized = W.roomMessageIn(input, { sent: true });
	const msg = parse(W.roomMessageOut(normalized));
	assert.deepEqual(msg, {
		hash: input.hash,
		room: INVITE,
		address: ADDRESS,
		message: 'hi',
		name: 'nils',
		reply: '',
		signature: SIG,
		timestamp: PAST,
		tip: { amount: 1, receiver: ADDRESS_2 }
	});
	assert.equal(W.decode(JSON.stringify(msg)).type, 'room-message');
	assert.throws(() => W.roomMessageOut({ ...normalized, hash: 'not-hex' }));
	assert.throws(() => W.roomMessageOut({ ...normalized, signature: '' }), 'a signature is required');
});

test('historyRows: only stored rows with the derived hash and a signature are sent as history', () => {
	const ok = roomInput();
	const rows = W.historyRows([ok, roomInput({ signature: '' }), roomInput({ hash: HASH }), { hash: HASH }, null]);
	assert.equal(rows.length, 1);
	assert.equal(rows[0].hash, ok.hash);
	assert.equal(rows[0].signature, SIG);
	assert.deepEqual(W.historyRows(undefined), []);
	const joined = parse(W.joinedOut({ address: ADDRESS, topic: TOPIC, name: 'nils', time: '1', idSig: SIG, messages: [ok, roomInput({ signature: '' })] }));
	assert.equal(joined.messages.length, 1);
});

test('typingOut', () => {
	assert.equal(W.typingOut(true), '{"typing":true}');
	assert.throws(() => W.typingOut('yes'));
});

test('pingOut: at most 100 hex peers, the 10 newest files, at most 25 hex hashes', () => {
	const peers = Array.from({ length: 120 }, (_, i) => i.toString(16).padStart(64, '0'));
	const files = Array.from({ length: 15 }, (_, i) => ({ fileName: `f${i}`, hash: HASH, time: PAST + i, size: 1 }));
	const hashes = [...new Array(30).fill(HASH), 'short'];
	const msg = parse(W.pingOut({ peers: [...peers, 'nothex'], files, hashes }));
	assert.equal(msg.type, 'Ping');
	assert.equal(msg.peers.length, 100);
	assert.equal(msg.peers[99], peers[119]);
	assert.deepEqual(msg.files.map((f) => f.fileName), files.slice(-10).map((f) => f.fileName));
	assert.equal(msg.hashes.length, 25);
	assert.equal(W.decode(JSON.stringify(msg)).type, 'ping');
	assert.deepEqual(parse(W.pingOut({ hashes: [] })), { type: 'Ping', peers: [], files: [], hashes: [] });
});

test('history and request messages', () => {
	assert.deepEqual(parse(W.requestMessagesOut([HASH, HASH_2])), { type: 'request-messages', hashes: [HASH, HASH_2] });
	const stored = roomInput({ message: 'old', address: ADDRESS_2, name: 'x' });
	const row = { ...stored, sent: 1 };
	const sent = { message: 'old', address: ADDRESS_2, signature: SIG, room: INVITE, timestamp: PAST, name: 'x', reply: '', hash: stored.hash, tip: false };
	assert.deepEqual(parse(W.missingMessagesOut([row])), { type: 'missing-messages', messages: [sent] });
	assert.deepEqual(parse(W.missingMessagesOut([{ ...row, signature: '' }])), { type: 'missing-messages', messages: [] });
	const files = Array.from({ length: 12 }, (_, i) => ({ fileName: `f${i}`, hash: HASH, time: PAST + i, size: 1 }));
	const req = parse(W.requestHistoryOut(files));
	assert.equal(req.type, 'request-history');
	assert.equal(req.files.length, 10);
	const hist = parse(W.sendHistoryOut({ messages: [row], files }));
	assert.equal(hist.type, 'send-history');
	assert.deepEqual(hist.messages, [sent]);
	assert.equal(hist.files.length, 10);
	assert.deepEqual(parse(W.requestFeedOut()), { type: 'request-feed' });
	assert.deepEqual(parse(W.sendFeedHistoryOut([])), { type: 'send-feed-history', messages: [] });
	for (const str of [W.requestMessagesOut([HASH]), W.missingMessagesOut([row]), W.requestHistoryOut(files), W.sendHistoryOut({ messages: [row], files }), W.requestFeedOut(), W.sendFeedHistoryOut([])]) {
		assert.equal(W.decode(str).type, parse(str).type);
	}
});

test('feedOut and its signing payload', () => {
	const input = feedInput();
	const msg = parse(
		W.feedOut({ message: 'post', nickname: 'nils', address: ADDRESS, reply: undefined, tip: false, hash: input.hash, timestamp: PAST, signature: SIG })
	);
	assert.deepEqual(msg, {
		type: 'feed',
		message: 'post',
		nickname: 'nils',
		address: ADDRESS,
		reply: '',
		tip: false,
		hash: input.hash,
		timestamp: PAST,
		signature: SIG
	});
	assert.equal(
		W.feedSigningPayload(msg),
		'hugin/feed\n' + JSON.stringify([input.hash, PAST, ADDRESS, 'nils', 'post', '', null])
	);
	assert.equal(W.decode(JSON.stringify(msg)).type, 'feed');
});

test('ban and disconnected', () => {
	assert.deepEqual(parse(W.banOut(ADDRESS_2)), { type: 'ban', address: ADDRESS_2 });
	assert.deepEqual(parse(W.disconnectedOut()), { type: 'disconnected' });
	assert.equal(W.decode(W.banOut(ADDRESS_2)).type, 'ban');
	assert.equal(W.decode(W.disconnectedOut()).type, 'disconnected');
});

test('voiceStatusOut: message = topic, flags that are not true are false, no signature', () => {
	const msg = parse(
		W.voiceStatusOut({ address: ADDRESS, avatar: '', voice: true, topic: TOPIC, name: 'nils', video: undefined, audioMute: true })
	);
	assert.deepEqual(msg, {
		address: ADDRESS,
		avatar: '',
		message: TOPIC,
		voice: true,
		topic: TOPIC,
		name: 'nils',
		video: false,
		audioMute: true,
		videoMute: false,
		screenshare: false
	});
	assert.equal(W.voiceSigningPayload, undefined);
	assert.equal(W.decode(JSON.stringify(msg)).type, 'voice');
});

test('sdpOut and sdpFlags', () => {
	assert.deepEqual(W.sdpFlags({ type: 'offer', data: { sdp: 'v=0' } }), { offer: true, retry: false });
	assert.deepEqual(W.sdpFlags({ type: 'answer', data: { sdp: 'v=0' } }), { offer: false, retry: false });
	assert.deepEqual(W.sdpFlags({ type: 'offer', data: { renegotiate: true } }), { offer: false, retry: false });
	assert.deepEqual(W.sdpFlags({ type: 'offer', data: {}, retry: true }), { offer: true, retry: true });
	const msg = parse(W.sdpOut({ data: { type: 'offer', sdp: 'v=0' }, offer: true, address: ADDRESS, topic: TOPIC, retry: false }));
	assert.deepEqual(msg, { data: { type: 'offer', sdp: 'v=0' }, offer: true, address: ADDRESS, topic: TOPIC, retry: false });
	assert.equal(W.decode(JSON.stringify(msg)).type, 'sdp');
});

test('fileSharedOut: no driveKey, and its signing payload', () => {
	const msg = parse(
		W.fileSharedOut({ fileName: 'cat.png', address: ADDRESS, name: 'nils', topic: TOPIC, size: 10, time: PAST, hash: HASH, signature: SIG })
	);
	assert.deepEqual(msg, {
		fileName: 'cat.png',
		address: ADDRESS,
		name: 'nils',
		topic: TOPIC,
		info: 'file-shared',
		type: 'file',
		size: 10,
		time: PAST,
		hash: HASH,
		signature: SIG
	});
	assert.equal(
		W.fileSigningPayload({ topic: TOPIC, hash: HASH, size: 10, time: PAST, fileName: 'cat.png', address: ADDRESS }),
		'hugin/file\n' + JSON.stringify([TOPIC, HASH, 10, PAST, 'cat.png', ADDRESS])
	);
	assert.throws(() => W.fileSigningPayload({ hash: HASH, size: 10, time: PAST, fileName: 'cat.png' }), 'topic and address are part of it');
	assert.equal(W.decode(JSON.stringify(msg)).type, 'file');
});

test('encode refuses frames above 2 MiB', () => {
	assert.throws(() => W.encode({ x: 'a'.repeat(2 * 1024 * 1024) }));
});
