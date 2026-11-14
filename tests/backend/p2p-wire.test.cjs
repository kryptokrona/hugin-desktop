'use strict';

// Adapter glue between hugin-p2p's pure modules and this backend (src/backend/p2p-wire.cjs).
// node:test, no network, no Electron: `node --test tests/backend/*.test.cjs`
// (pnpm run test:backend).
//
// Inbound: the adapters must return the shapes the IPC events and the database have always
// received. Outbound: the builders must produce what hugin-p2p-design/WIRE.md §2 lists, and
// every message must decode again with the library (what new peers accept).

const test = require('node:test');
const assert = require('node:assert/strict');
const W = require('../../src/backend/p2p-wire.cjs');

const ADDRESS = 'SEKR' + 'a'.repeat(95);
const ADDRESS_2 = 'SEKR' + 'b'.repeat(95);
const TOPIC = 'ab'.repeat(32);
const HASH = 'cd'.repeat(32);
const HASH_2 = 'ef'.repeat(32);
const INVITE = '12'.repeat(64);
const DRIVE_KEY = '34'.repeat(32);
const SIG = 'f'.repeat(128);
const PAST = 1700000000000;

const roomInput = (over = {}) => ({
	message: 'hi',
	room: INVITE,
	reply: '',
	address: ADDRESS,
	timestamp: PAST,
	name: 'nils',
	hash: HASH,
	tip: false,
	...over
});

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
	const m = W.roomMessageIn(roomInput());
	assert.deepEqual(m, {
		message: 'hi',
		address: ADDRESS,
		signature: '',
		room: INVITE,
		timestamp: String(PAST),
		name: 'nils',
		reply: '',
		hash: HASH,
		sent: false,
		channel: 'channel',
		tip: false
	});
	assert.equal(W.roomMessageIn(roomInput(), { sent: true }).sent, true);
});

test('roomMessageIn: the "Joined room" call site (string timestamp, empty signature)', () => {
	const m = W.roomMessageIn({
		timestamp: String(PAST),
		room: INVITE,
		message: 'Joined room',
		address: ADDRESS,
		reply: '',
		signature: '',
		name: 'nils',
		hash: HASH,
		tip: false
	});
	assert.equal(m.message, 'Joined room');
	assert.equal(m.timestamp, String(PAST));
	assert.equal(parseInt(m.timestamp), PAST);
});

test('roomMessageIn: text is sanitized like before, nickname accepted', () => {
	const m = W.roomMessageIn(roomInput({ message: '<b>bold</b> text', name: undefined, nickname: 'Tom &amp; Jerry' }));
	assert.equal(m.message, 'bold text');
	assert.equal(m.name, 'Tom & Jerry');
});

test('roomMessageIn: refusals return false', () => {
	assert.equal(W.roomMessageIn(roomInput({ hash: undefined })), false);
	assert.equal(W.roomMessageIn(roomInput({ message: 'x'.repeat(778) })), false);
	assert.equal(W.roomMessageIn(roomInput({ timestamp: undefined })), false);
	assert.equal(W.roomMessageIn(roomInput({ name: 'n'.repeat(51) })), false);
	assert.equal(W.roomMessageIn(roomInput({ tip: { amount: '1', receiver: ADDRESS } })), false);
	assert.equal(W.roomMessageIn(null), false);
});

test('roomMessageIn: a timestamp in the future becomes now; a tip stored as JSON is parsed', () => {
	const now = PAST + 1000;
	assert.equal(W.roomMessageIn(roomInput({ timestamp: now + 5000 }), { now }).timestamp, String(now));
	const m = W.roomMessageIn(roomInput({ tip: JSON.stringify({ amount: 5, receiver: ADDRESS_2 }) }));
	assert.deepEqual(m.tip, { amount: 5, receiver: ADDRESS_2 });
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

test('voiceStatusIn: the voice-channel-status payload', () => {
	const v = W.voiceStatusIn(voiceInput({ avatar: 'AAEC' }));
	assert.deepEqual(Object.keys(v), [
		'address', 'avatar', 'message', 'signature', 'topic', 'name', 'voice', 'video', 'videoMute',
		'audioMute', 'screenshare'
	]);
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
	const f = W.feedMessageIn({
		type: 'feed',
		message: 'post',
		nickname: 'nils',
		address: ADDRESS,
		tip: false,
		hash: HASH,
		timestamp: String(PAST),
		signature: SIG
	});
	assert.deepEqual(f, {
		message: 'post',
		address: ADDRESS,
		nickname: 'nils',
		signature: SIG,
		reply: '',
		hash: HASH,
		timestamp: PAST,
		tip: false
	});
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
	const normalized = W.roomMessageIn(roomInput({ tip: { amount: 1, receiver: ADDRESS_2 } }), { sent: true });
	const msg = parse(W.roomMessageOut(normalized));
	assert.deepEqual(msg, {
		hash: HASH,
		room: INVITE,
		address: ADDRESS,
		message: 'hi',
		name: 'nils',
		reply: '',
		signature: '',
		timestamp: PAST,
		tip: { amount: 1, receiver: ADDRESS_2 }
	});
	assert.equal(W.decode(JSON.stringify(msg)).type, 'room-message');
	assert.throws(() => W.roomMessageOut({ ...normalized, hash: 'not-hex' }));
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
	const row = { message: 'old', address: ADDRESS_2, signature: '', room: INVITE, timestamp: PAST, name: 'x', reply: '', hash: HASH_2, sent: 1, tip: '' };
	assert.deepEqual(parse(W.missingMessagesOut([row])), { type: 'missing-messages', messages: [row] });
	const files = Array.from({ length: 12 }, (_, i) => ({ fileName: `f${i}`, hash: HASH, time: PAST + i, size: 1 }));
	const req = parse(W.requestHistoryOut(files));
	assert.equal(req.type, 'request-history');
	assert.equal(req.files.length, 10);
	const hist = parse(W.sendHistoryOut({ messages: [row], files }));
	assert.equal(hist.type, 'send-history');
	assert.deepEqual(hist.messages, [row]);
	assert.equal(hist.files.length, 10);
	assert.deepEqual(parse(W.requestFeedOut()), { type: 'request-feed' });
	assert.deepEqual(parse(W.sendFeedHistoryOut([])), { type: 'send-feed-history', messages: [] });
	for (const str of [W.requestMessagesOut([HASH]), W.missingMessagesOut([row]), W.requestHistoryOut(files), W.sendHistoryOut({ messages: [row], files }), W.requestFeedOut(), W.sendFeedHistoryOut([])]) {
		assert.equal(W.decode(str).type, parse(str).type);
	}
});

test('feedOut and its signing payload', () => {
	const msg = parse(
		W.feedOut({ message: 'post', nickname: 'nils', address: ADDRESS, reply: undefined, tip: false, hash: HASH, timestamp: PAST, signature: SIG })
	);
	assert.deepEqual(msg, {
		type: 'feed',
		message: 'post',
		nickname: 'nils',
		address: ADDRESS,
		reply: '',
		tip: false,
		hash: HASH,
		timestamp: PAST,
		signature: SIG
	});
	assert.equal(W.feedSigningPayload('post', HASH), 'post' + HASH);
	assert.equal(W.decode(JSON.stringify(msg)).type, 'feed');
});

test('ban and disconnected', () => {
	assert.deepEqual(parse(W.banOut(ADDRESS_2)), { type: 'ban', address: ADDRESS_2 });
	assert.deepEqual(parse(W.disconnectedOut()), { type: 'disconnected' });
	assert.equal(W.decode(W.banOut(ADDRESS_2)).type, 'ban');
	assert.equal(W.decode(W.disconnectedOut()).type, 'disconnected');
});

test('voiceStatusOut: message = topic, flags that are not true are false', () => {
	const msg = parse(
		W.voiceStatusOut({ address: ADDRESS, avatar: '', signature: SIG, voice: true, topic: TOPIC, name: 'nils', video: undefined, audioMute: true })
	);
	assert.deepEqual(msg, {
		address: ADDRESS,
		avatar: '',
		signature: SIG,
		message: TOPIC,
		voice: true,
		topic: TOPIC,
		name: 'nils',
		video: false,
		audioMute: true,
		videoMute: false,
		screenshare: false
	});
	assert.equal(W.voiceSigningPayload(TOPIC), TOPIC);
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
	assert.equal(W.fileSigningPayload({ hash: HASH, size: 10, time: PAST, fileName: 'cat.png' }), HASH + '10' + PAST + 'cat.png');
	assert.equal(W.decode(JSON.stringify(msg)).type, 'file');
});

test('encode refuses frames above 2 MiB', () => {
	assert.throws(() => W.encode({ x: 'a'.repeat(2 * 1024 * 1024) }));
});
