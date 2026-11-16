'use strict';

// The real src/backend/database.cjs on a node:sqlite database (Node >= 22.13), with Electron,
// electron-store and better-sqlite3 replaced as the hugin-interop harness does
// (helpers/desktop-stubs.cjs). Room and feed messages must come back from the queries hugin-network
// uses exactly as they were signed (text, empty name, signature, integer timestamp, tip), so
// peers can verify them when they are served as history; what the renderer reads is plain text.

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { wire: W, keys, sanitize: S } = require('hugin-network');
const { ADDRESS, ADDRESS_2, fakeSign, fakeVerify, hasNodeSqlite, installElectronStubs } = require('./helpers/desktop-stubs.cjs');

const PAST = 1700000000000;
const MARKUP = 'Hej <b>bold</b> <script>alert(1)</script>&amp; done';
const skip = hasNodeSqlite() ? false : 'node:sqlite is not available in this Node version';

function signedRoomMessage({ room, address = ADDRESS_2, name = 'bob', message = 'hi', reply = '', timestamp = PAST, tip = false }) {
	const checked = W.roomMessage({ hash: '0'.repeat(64), room, address, name, message, reply, signature: '0'.repeat(128), timestamp, tip });
	const draft = { ...checked, hash: W.roomMessageHash(checked) };
	return W.roomMessage({ ...draft, signature: fakeSign(address, W.roomMessageSigningPayload(draft)) });
}

function signedFeed({ address = ADDRESS_2, nickname = 'bob', message = 'post', reply = '', timestamp = PAST, tip = false } = {}) {
	const checked = W.feed({ message, nickname, address, reply, tip, timestamp, hash: '0'.repeat(64), signature: 'x' });
	const draft = { ...checked, hash: W.feedMessageHash(checked) };
	return W.feed({ ...draft, signature: fakeSign(address, W.feedSigningPayload(draft)) });
}

let db = null;

async function database() {
	if (db) return db;
	const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'hugin-desktop-db-'));
	installElectronStubs({ userData });
	// app load order: account.cjs (-> database.cjs)
	require('../../src/backend/account.cjs');
	db = require('../../src/backend/database.cjs');
	await db.loadDB(userData, ':memory:', ['aa'.repeat(32), 'bb'.repeat(32)]);
	return db;
}

test('room messages: stored and served back exactly as signed, with the integer timestamp', { skip }, async () => {
	const D = await database();
	const { invite } = keys.createRoomInvite();
	const m = signedRoomMessage({ room: invite, message: MARKUP, name: '', tip: { amount: 7, receiver: ADDRESS } });
	const saved = await D.saveGroupMsg({ ...m, sent: false }, false, true);
	assert.ok(saved, 'saved');
	assert.equal(saved.name, 'Anonymous', 'the renderer is shown Anonymous for an empty name');
	assert.equal(await D.saveGroupMsg({ ...m, sent: false }, false, true), false, 'one row per hash');

	const row = await D.getRoomMessageRow(m.hash);
	assert.deepEqual(row, {
		message: MARKUP,
		address: ADDRESS_2,
		signature: m.signature,
		room: invite,
		timestamp: PAST,
		name: '',
		reply: '',
		hash: m.hash,
		tip: { amount: 7, receiver: ADDRESS }
	});
	const r = S.roomMessage(row, { hexHash: true });
	assert.ok(r.ok, r.reason);
	assert.ok(W.isRoomMessageHash(r.value));
	assert.equal(await fakeVerify(W.roomMessageSigningPayload(r.value), ADDRESS_2, m.signature), true);
	assert.deepEqual(await D.getRoomHistoryRows(invite), [row]);
	assert.equal(await D.roomMessageExists(m.hash), true);
	assert.equal(await D.getRoomMessageRow('00'.repeat(32)), null);
	assert.equal(await D.getRoomMessageRow("' OR 1=1 --"), null);

	// what the renderer reads
	const [shown] = await D.printGroup(invite, 0);
	assert.equal(shown.message, S.sanitizeText(MARKUP));
	assert.equal(shown.name, 'Anonymous');
	assert.equal(shown.timestamp, String(PAST), 'stored as the digits of the integer');
	const reply = await D.getGroupReply(m.hash);
	assert.equal(reply.message, S.sanitizeText(MARKUP));
});

test('room messages: rows without a signature (file messages) are neither history nor in the Ping hashes', { skip }, async () => {
	const D = await database();
	const { invite } = keys.createRoomInvite();
	const m = signedRoomMessage({ room: invite, message: 'signed', timestamp: PAST + 10 });
	await D.saveGroupMsg({ ...m, sent: false }, false, true);
	const fileHash = 'ef'.repeat(32);
	await D.saveGroupMsg({ message: 'a.png', address: ADDRESS_2, name: 'bob', timestamp: PAST + 20, time: PAST + 20, room: invite, hash: fileHash, reply: '', sent: false, tip: false, signature: '' });
	assert.equal(await D.roomMessageExists(fileHash), true);
	assert.deepEqual((await D.getRoomHistoryRows(invite)).map((x) => x.hash), [m.hash]);
	assert.deepEqual(await D.getLatestRoomHashes(invite), [m.hash]);
});

test('own room messages saved in the renderer shape (string timestamp) come back as the signed integer', { skip }, async () => {
	const D = await database();
	const { invite } = keys.createRoomInvite();
	const m = signedRoomMessage({ room: invite, address: ADDRESS, name: 'nils', message: 'mine', timestamp: PAST + 30 });
	await D.saveGroupMsg({ ...m, timestamp: String(m.timestamp), sent: true, channel: 'channel' }, m.hash, m.timestamp, false, true);
	const row = await D.getRoomMessageRow(m.hash);
	assert.equal(row.timestamp, PAST + 30);
	assert.equal(await fakeVerify(W.roomMessageSigningPayload(row), ADDRESS, row.signature), true);
});

test('feed messages: stored as signed (tip included) and served back verifiable; the renderer reads plain text', { skip }, async () => {
	const D = await database();
	const f = signedFeed({ message: MARKUP, tip: { amount: 2, receiver: ADDRESS } });
	await D.saveFeedMessage(f);
	assert.equal(await D.feedMessageExists(f.hash), true);
	const served = (await D.printFeed(0, true)).find((x) => x.hash === f.hash);
	const r = S.feedMessage(served);
	assert.ok(r.ok, r.reason);
	assert.equal(r.value.message, MARKUP);
	assert.deepEqual(r.value.tip, { amount: 2, receiver: ADDRESS });
	assert.equal(await fakeVerify(W.feedSigningPayload(r.value), ADDRESS_2, f.signature), true);
	const shown = (await D.printFeed(0)).find((x) => x.hash === f.hash);
	assert.equal(shown.message, S.sanitizeText(MARKUP));
});
