'use strict';

// hugin-desktop's adapter over the pure modules of hugin-p2p (`hugin-p2p/sanitize`,
// `hugin-p2p/wire`). It has no Electron imports, so tests/backend can load it under plain Node.
//
// Inbound: the library validators check types and lengths and return normalized values whose
// text is exactly what the peer sent. The `*In` adapters map those values to the objects this
// backend has always handed to the database and to the renderer (IPC events): text fields go
// through `sanitizeText` (desktop's sanitize-html policy, now implemented in hugin-p2p), avatars
// are decoded bytes (a Buffer, or '' when there is none) and room message timestamps are
// strings. They return `false` when the library refuses the input. Each adapter runs the
// library validator itself, so it can be given raw data or a value `decode` already returned.
// Room and feed messages carry a hash derived from their fields (`wire.roomMessageHash`,
// `wire.feedMessageHash`) and the author's XKR signature over a domain-prefixed payload
// (`wire.roomMessageSigningPayload`, `wire.feedSigningPayload`); `*In` refuses another hash and
// `verifyRoomMessage` / `verifyFeedMessage` check the signature with the backend's verifier.
//
// Outbound: thin wrappers around the `hugin-p2p/wire` builders that return the JSON string for
// the hugin-messages channel (`wire.encode`, which refuses anything above 2 MiB). The builders
// throw a WireError for input a peer would refuse or ban for; callers catch it and do not send.
// `roomMessageSign` and `feedSign` build the messages this app creates: they derive the hash
// and sign through the given `sign` function (the backend passes `crypto.cjs` `signMessage` with
// the wallet's spend key). This file has no Electron or key access of its own.

const S = require('hugin-p2p/sanitize');
const W = require('hugin-p2p/wire');

const text = S.sanitizeText;
const bool = (v) => v === true;

/** Base64 avatar -> decoded bytes, as desktop always passed avatars on ('' when there is none). */
function avatarBytes(avatar) {
	if (typeof avatar !== 'string' || avatar.length === 0) return '';
	return Buffer.from(avatar, 'base64');
}

function tipIn(tip) {
	if (!tip) return false;
	return { amount: tip.amount, receiver: text(tip.receiver) };
}

// ---------------------------------------------------------------------------------------------
// inbound

/**
 * Decodes one hugin-messages frame (`wire.decode`): `{ type, value }` for a valid message,
 * `{ type: 'dm', value }` for a DM payload in a DM swarm, `{ type: 'ignored', reason }` or
 * `{ type: 'invalid', kind?, reason, ban }`.
 */
function decode(input, { dm = false, now } = {}) {
	const opts = { dm };
	if (now !== undefined) opts.now = now;
	return W.decode(input, opts);
}

/** The library-normalized room message (`sanitize.roomMessage`) whose hash is the derived one, or null. */
function validRoomMessage(data) {
	const r = S.roomMessage(data, { hexHash: true });
	if (!r.ok || !W.isRoomMessageHash(r.value)) return null;
	return r.value;
}

/**
 * Room message (live, history, or one this app creates) in desktop's shape:
 * `{ message, address, signature, room, timestamp (string), name, reply, hash, sent,
 *    channel: 'channel', tip }`, or false. The hash must be the one derived from the fields and
 * the signature 128 hex characters; the timestamp is kept as signed (no clamping).
 */
function roomMessageIn(data, { sent = false } = {}) {
	const v = validRoomMessage(data);
	if (!v) return false;
	return {
		message: text(v.message),
		address: text(v.address),
		signature: text(v.signature),
		room: text(v.room),
		timestamp: String(v.timestamp),
		name: text(v.name),
		reply: text(v.reply),
		hash: text(v.hash),
		sent,
		channel: 'channel',
		tip: tipIn(v.tip)
	};
}

/** `joined` announcement in desktop's shape (avatar as bytes, `driveKey` null unless 64 hex). */
function joinedIn(data) {
	const r = S.joined(data);
	if (!r.ok) return false;
	const v = r.value;
	return {
		address: text(v.address),
		avatar: avatarBytes(v.avatar),
		message: text(v.message),
		signature: text(v.signature),
		topic: text(v.topic),
		name: text(v.name),
		voice: v.voice,
		joined: v.joined,
		channels: [],
		video: v.video,
		time: text(v.time),
		idSig: v.idSig,
		audioMute: v.audioMute,
		videoMute: v.videoMute,
		screenshare: v.screenshare,
		messages: v.messages,
		driveKey: v.driveKey
	};
}

/**
 * Voice channel status in desktop's shape (the `voice-channel-status` IPC payload). Voice
 * statuses are not signed (hugin-p2p 3.0); `signature` stays in the shape as ''.
 */
function voiceStatusIn(data) {
	const r = S.voiceStatus(data);
	if (!r.ok) return false;
	const v = r.value;
	return {
		address: text(v.address),
		avatar: avatarBytes(v.avatar),
		message: text(v.message),
		signature: '',
		topic: text(v.topic),
		name: text(v.name),
		voice: v.voice,
		video: v.video,
		videoMute: v.videoMute,
		audioMute: v.audioMute,
		screenshare: v.screenshare
	};
}

/** File announcement in desktop's shape (`size`/`time` numbers, signature as `sig`). */
function fileMessageIn(data) {
	const r = S.fileMessage(data);
	if (!r.ok) return false;
	const v = r.value;
	return {
		fileName: text(v.fileName),
		address: text(v.address),
		name: text(v.name),
		topic: text(v.topic),
		info: text(v.info),
		type: text(v.type),
		size: v.size,
		time: v.time,
		hash: text(v.hash),
		key: text(v.key),
		sig: text(v.signature)
	};
}

/** The library-normalized feed message whose hash is the derived one, or null. */
function validFeedMessage(data) {
	const r = S.feedMessage(data);
	if (!r.ok || !W.isFeedMessageHash(r.value)) return null;
	return r.value;
}

/**
 * Feed message in desktop's shape (what `saveFeedMessage` and the `feed-message` IPC take);
 * false unless the hash is the one derived from the fields.
 */
function feedMessageIn(data) {
	const v = validFeedMessage(data);
	if (!v) return false;
	return {
		message: text(v.message),
		address: text(v.address),
		nickname: text(v.nickname),
		signature: text(v.signature),
		reply: text(v.reply),
		hash: text(v.hash),
		timestamp: v.timestamp,
		tip: tipIn(v.tip)
	};
}

// ---------------------------------------------------------------------------------------------
// signatures

/**
 * Awaited check of a room message's signature: `verify(payload, address, signature)` (the
 * backend's `verifySignature`) must resolve to exactly `true` for the library-normalized
 * message (text as sent, not sanitized). False for an invalid message, a wrong hash, a
 * verifier that throws, or no verifier; never throws.
 */
async function verifyRoomMessage(data, verify) {
	const v = validRoomMessage(data);
	if (!v) return false;
	return verifyWith(() => W.roomMessageSigningPayload(v), v, verify);
}

/** Like `verifyRoomMessage` for a feed message (`wire.feedSigningPayload`). */
async function verifyFeedMessage(data, verify) {
	const v = validFeedMessage(data);
	if (!v) return false;
	return verifyWith(() => W.feedSigningPayload(v), v, verify);
}

async function verifyWith(payloadOf, v, verify) {
	if (typeof verify !== 'function') return false;
	let payload;
	try {
		payload = payloadOf();
	} catch (e) {
		return false;
	}
	try {
		return (await verify(payload, v.address, v.signature)) === true;
	} catch (e) {
		return false;
	}
}

/** The host's signature (a non-empty string) of `payload`; throws when `sign` gives none. */
async function signPayload(payload, sign) {
	if (typeof sign !== 'function') throw new TypeError('sign must be a function');
	const sig = await sign(payload);
	if (typeof sig !== 'string' || sig.length === 0) throw new TypeError('sign() gave no signature');
	return sig;
}

/**
 * A room message this app creates, in desktop's shape with `sent: true`: the hash is derived
 * from the fields (a `hash` in `o` is ignored) and `signature` is `sign(payload)` for the
 * room message payload (`sign(message) -> Promise<string>`, the backend's `signMessage` with
 * the spend key). Throws a WireError for a message a peer would refuse, or the signer's error.
 */
async function roomMessageSign(o, sign) {
	const reply = o.reply === undefined || o.reply === null ? '' : o.reply;
	const raw = {
		hash: '',
		room: o.room,
		address: o.address,
		message: o.message,
		name: o.name,
		reply,
		signature: '',
		timestamp: Number(o.timestamp),
		tip: o.tip
	};
	raw.hash = W.roomMessageHash(raw);
	raw.signature = await signPayload(W.roomMessageSigningPayload(raw), sign);
	const built = W.roomMessage(raw);
	const m = roomMessageIn(built, { sent: true });
	if (!m) throw new W.WireError('room message: not valid after signing', 'signature');
	return m;
}

/**
 * A feed message this app creates (the object `feedOut` takes and `send_feed_message`
 * returns): hash derived from the fields, `signature` = `sign(feed payload)`.
 */
async function feedSign(o, sign) {
	const reply = o.reply === undefined || o.reply === null ? '' : o.reply;
	const raw = {
		type: 'feed',
		message: o.message,
		nickname: o.nickname,
		address: o.address,
		reply,
		tip: o.tip,
		hash: '',
		timestamp: Number(o.timestamp),
		signature: ''
	};
	raw.hash = W.feedMessageHash(raw);
	raw.signature = await signPayload(W.feedSigningPayload(raw), sign);
	return W.feed(raw);
}

/**
 * Stored room messages that can be sent as history (`joined.messages`, `send-history`,
 * `missing-messages`): valid rows with the derived hash and a stored 128-hex signature
 * (`sanitize.roomHistory`). Rows without one are left out (receivers drop them anyway).
 */
function historyRows(messages) {
	if (!Array.isArray(messages)) return [];
	return S.roomHistory(messages, { hexHash: true }).filter(W.isRoomMessageHash);
}

// ---------------------------------------------------------------------------------------------
// outbound (each returns the encoded JSON string)

/**
 * `joined`; voice/video/mute flags that are not `true` are sent as false, and only history
 * rows `historyRows` keeps are sent.
 */
function joinedOut(o) {
	return W.encode(
		W.joined({
			...o,
			messages: historyRows(o.messages),
			voice: bool(o.voice),
			video: bool(o.video),
			audioMute: bool(o.audioMute),
			videoMute: bool(o.videoMute),
			screenshare: bool(o.screenshare)
		})
	);
}

/**
 * Room message from a desktop-shaped message (`roomMessageIn` / `roomMessageSign` output), in
 * the shape native sends. The signature (128 hex characters) is required.
 */
function roomMessageOut(m) {
	return W.encode(
		W.roomMessage({
			hash: m.hash,
			room: m.room,
			address: m.address,
			message: m.message,
			name: m.name,
			reply: m.reply,
			signature: m.signature,
			timestamp: Number(m.timestamp),
			tip: m.tip
		})
	);
}

function typingOut(typing) {
	return W.encode(W.typing(typing));
}

/**
 * Room state Ping. Peers and hashes that are not 64 hex characters are left out (receivers skip
 * them), at most 100 peers and 25 hashes are sent (receivers ban above that) and only the 10
 * most recent files.
 */
function pingOut({ peers = [], files = [], hashes = [] } = {}) {
	return W.encode(
		W.ping({
			peers: peers.filter(S.isHex64).slice(-S.SEND.ping.peers),
			files: W.recentFiles(files, S.SEND.ping.files),
			hashes: hashes.filter(S.isHex64).slice(0, S.SEND.ping.hashes)
		})
	);
}

function requestMessagesOut(hashes) {
	return W.encode(W.requestMessages(hashes));
}

/** missing-messages with the stored rows `historyRows` keeps. */
function missingMessagesOut(messages) {
	return W.encode(W.missingMessages(historyRows(messages)));
}

/** request-history with the 10 most recent files (receivers ignore longer lists). */
function requestHistoryOut(files = []) {
	return W.encode(W.requestHistory(W.recentFiles(files, S.SEND.ping.files)));
}

/** send-history with the rows `historyRows` keeps and the 10 most recent files (receivers ignore longer lists). */
function sendHistoryOut({ messages = [], files = [] } = {}) {
	return W.encode(W.sendHistory({ messages: historyRows(messages), files: W.recentFiles(files, S.SEND.ping.files) }));
}

function requestFeedOut() {
	return W.encode(W.requestFeed());
}

function sendFeedHistoryOut(messages) {
	return W.encode(W.sendFeedHistory(messages));
}

function feedOut(o) {
	return W.encode(W.feed(o));
}

function banOut(address) {
	return W.encode(W.ban(address));
}

function disconnectedOut() {
	return W.encode(W.disconnected());
}

/** Voice status (not signed); flags that are not `true` are sent as false. */
function voiceStatusOut(o) {
	return W.encode(
		W.voiceStatus({
			...o,
			voice: bool(o.voice),
			video: bool(o.video),
			audioMute: bool(o.audioMute),
			videoMute: bool(o.videoMute),
			screenshare: bool(o.screenshare)
		})
	);
}

function sdpOut(o) {
	return W.encode(W.sdp(o));
}

/** File announcement, without `driveKey` (receivers use the one from `joined`). */
function fileSharedOut(o) {
	return W.encode(W.fileShared(o));
}

module.exports = {
	PRE_JOIN_KINDS: S.PRE_JOIN_KINDS,
	sanitizeText: text,
	encode: W.encode,
	decode,
	avatarBytes,
	roomMessageIn,
	joinedIn,
	voiceStatusIn,
	fileMessageIn,
	feedMessageIn,
	verifyRoomMessage,
	verifyFeedMessage,
	roomMessageSign,
	feedSign,
	historyRows,
	roomMessageHash: W.roomMessageHash,
	roomMessageSigningPayload: W.roomMessageSigningPayload,
	isRoomMessageHash: W.isRoomMessageHash,
	feedMessageHash: W.feedMessageHash,
	isFeedMessageHash: W.isFeedMessageHash,
	joinedOut,
	roomMessageOut,
	typingOut,
	pingOut,
	requestMessagesOut,
	missingMessagesOut,
	requestHistoryOut,
	sendHistoryOut,
	requestFeedOut,
	sendFeedHistoryOut,
	feedOut,
	banOut,
	disconnectedOut,
	voiceStatusOut,
	sdpOut,
	sdpFlags: W.sdpFlags,
	fileSharedOut,
	feedSigningPayload: W.feedSigningPayload,
	fileSigningPayload: W.fileSigningPayload
};
