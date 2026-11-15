'use strict';

// Direct messages on desktop: the DmCrypto of src/backend/identity.cjs (hugin-p2p/dm with the
// real hugin-crypto and kryptokrona-utils keys) and the backend paths that use it.
//
// - two DmCrypto instances with their stores in memory (helpers/dm-parties.cjs): the ML-KEM
//   handshake and messages both ways, the DM swarm key and the push view tag;
// - an ML-KEM identity stored by earlier versions (kem_identity) is the one used;
// - the backend itself (database.cjs on node:sqlite, messages.cjs, the session's DmCrypto, as the
//   hugin-interop harness loads it): the dm_crypto table, a node pool batch through
//   decrypt_hugin_messages, a reply sent through send_message.

const test = require('node:test');
const { after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const fs = require('fs');
const path = require('path');
const hc = require('hugin-crypto');
const push = require('hugin-p2p/push');
const { STATUS } = require('hugin-p2p/dm');
const { hasNodeSqlite, installElectronStubs } = require('./helpers/desktop-stubs.cjs');
const { dmParty, memoryDmStore, xkrWallet, xkr } = require('./helpers/dm-parties.cjs');

const T0 = 1731500000000;
const skip = hasNodeSqlite() ? false : 'node:sqlite is not available in this Node version';
const hex = (bytes) => Buffer.from(bytes).toString('hex');
const randomHash = () => require('crypto').randomBytes(32).toString('hex');

// =============================================================================================
// two DmCrypto instances

test('two desktop DmCrypto instances: ML-KEM handshake, then messages both ways under one key', async () => {
	const alice = await dmParty('alice');
	const bob = await dmParty('bob');

	const m1 = await alice.dm.encrypt(bob.address, 'hi bob', { name: 'alice', timestamp: T0 });
	assert.equal(m1.handshake, 'initial', 'no key yet: our ML-KEM public key goes along');
	assert.equal(m1.kind, 'dm');
	assert.equal(m1.fitsNode, true);
	assert.equal(m1.hash, hc.messageHash(m1.payload), 'message id: the hash of the payload');
	assert.equal(alice.db.state(bob.address), null, 'sending changes no state');
	assert.equal(alice.db.kemSaves, 1, 'the ML-KEM identity is made and saved on first use');
	assert.equal(alice.db.kem.publicKey.length, 1600);
	assert.equal(alice.db.kem.secretKey.length, 3264);

	const r1 = await bob.dm.open(m1.payload);
	assert.equal(r1.status, STATUS.OK);
	assert.deepEqual(r1.message, {
		from: alice.address,
		message: 'hi bob',
		name: 'alice',
		timestamp: T0,
		hash: m1.hash,
		type: 'friend-request',
		established: true
	});
	const b1 = bob.db.state(alice.address);
	assert.equal(b1.messageKey.length, 64, "bob made a key from alice's ML-KEM key");
	assert.equal(b1.pendingKemCapsule.length, 1536, 'and owes alice its capsule');
	assert.equal(b1.peerKemPub, alice.db.kem.publicKey.toLowerCase());

	const m2 = await bob.dm.encrypt(alice.address, 'hi alice', { name: 'bob', timestamp: T0 + 1000 });
	assert.equal(m2.handshake, 'reply', 'the key and its capsule');
	const r2 = await alice.dm.open(m2.payload);
	assert.equal(r2.status, STATUS.OK);
	assert.equal(r2.message.type, 'message', 'opened with the key from the capsule');
	assert.equal(r2.message.message, 'hi alice');
	assert.equal(r2.message.name, 'bob');
	assert.equal(alice.db.state(bob.address).messageKey, b1.messageKey, 'alice holds the same key');

	const m3 = await alice.dm.encrypt(bob.address, 'under the key', { name: 'alice', timestamp: T0 + 2000 });
	assert.equal(m3.handshake, 'established');
	assert.ok(m3.payload.length < m1.payload.length, 'no ML-KEM fields any more');
	const r3 = await bob.dm.open(m3.payload);
	assert.equal(r3.status, STATUS.OK);
	assert.equal(r3.message.type, 'message');
	assert.equal(bob.db.state(alice.address).pendingKemCapsule, '', 'the capsule arrived: it is not sent any more');

	const m4 = await bob.dm.encrypt(alice.address, 'and back', { name: 'bob', timestamp: T0 + 3000 });
	assert.equal(m4.handshake, 'established');
	const r4 = await alice.dm.open(m4.payload);
	assert.equal(r4.status, STATUS.OK);
	assert.equal(r4.message.message, 'and back');

	// another wallet's view tag does not match; a changed payload does not open
	const carol = await dmParty('carol');
	assert.equal((await carol.dm.open(m4.payload)).status, STATUS.NOT_FOR_US);
	const last = m4.payload.length - 2;
	const tampered = m4.payload.slice(0, last) + (m4.payload.slice(last) === '00' ? '01' : '00');
	assert.equal((await alice.dm.open(tampered)).status, STATUS.REFUSED);
	assert.equal((await alice.dm.open('7b7d')).status, STATUS.NOT_DM);
});

test('DM swarm key and push view tag: the values desktop has always used', async () => {
	const alice = await dmParty('alice');
	const bob = await dmParty('bob');
	const ab = await alice.dm.derivationHash(bob.address);
	assert.equal(ab, await bob.dm.derivationHash(alice.address), 'the same on both sides');
	// cn_fast_hash(generate_key_derivation(contact's view public key, own private view key))
	const derivation = await xkr.generateKeyDerivation(bob.viewPub, alice.wallet.viewPriv);
	assert.equal(ab, await xkr.cn_fast_hash(derivation));

	const now = Date.now();
	const m = await alice.dm.encrypt(bob.address, 'tag', { timestamp: now });
	assert.equal(m.viewTag, push.dmViewTag(bob.viewPub, { now }), '3 hex characters for a DM');
	const call = await alice.dm.encrypt(bob.address, 'call', { timestamp: now, call: true });
	assert.equal(call.kind, 'call');
	assert.equal(call.viewTag, push.dmViewTag(bob.viewPub, { now, long: true }));
});

test('the ML-KEM identity stored by earlier versions (kem_identity) is the one used', async () => {
	const kp = hc.generateKemKeypair();
	const stored = { publicKey: hc.uintToHex(kp.publicKey), secretKey: hc.uintToHex(kp.secretKey) };
	const bob = await dmParty('bob', { db: memoryDmStore({ kem: stored }) });
	const alice = await dmParty('alice');

	const id = await bob.dm.kemIdentity();
	assert.equal(hex(id.publicKey), stored.publicKey.toLowerCase());
	assert.equal(hex(id.secretKey), stored.secretKey.toLowerCase());
	assert.equal(bob.db.kemSaves, 0, 'no new key pair is made');

	// alice encapsulates against the stored public key; bob opens her capsule with the stored secret key
	assert.equal((await alice.dm.open((await bob.dm.encrypt(alice.address, 'hi', { timestamp: T0 })).payload)).status, STATUS.OK);
	assert.equal(alice.db.state(bob.address).peerKemPub, stored.publicKey.toLowerCase());
	const r = await bob.dm.open((await alice.dm.encrypt(bob.address, 'hi back', { timestamp: T0 + 1000 })).payload);
	assert.equal(r.status, STATUS.OK);
	assert.equal(r.message.type, 'message');
});

// =============================================================================================
// the backend: database.cjs, messages.cjs and the session's DmCrypto

let backend = null;

after(async () => {
	if (backend) await backend.P2P.destroy();
});

/** The backend as the app loads it, on a wallet with real keys (bob) and an in-memory database. */
async function loadBackend() {
	if (backend) return backend;
	const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'hugin-desktop-dm-'));
	installElectronStubs({ userData });
	const B = (file) => require(path.join('../../src/backend', file));
	B('utils.cjs');
	const { Hugin } = B('account.cjs');
	B('crypto.cjs');
	const messages = B('messages.cjs');
	const db = B('database.cjs');
	const identity = B('identity.cjs');
	const P2P = B('p2p-host.cjs').instance();

	const wallet = await xkrWallet();
	const sent = [];
	Hugin.wallet = wallet;
	Hugin.address = wallet.address;
	Hugin.nickname = 'bob';
	Hugin.sender = (channel, data) => sent.push([channel, data]);
	Hugin.syncImages = [];
	Hugin.block_list = [];
	await db.loadDB(userData, ':memory:', ['aa'.repeat(32), 'bb'.repeat(32)]);

	// no network: DM swarm joins and node posts are recorded
	const joins = [];
	const posts = [];
	P2P.newSwarm = async (...args) => {
		joins.push(args);
		return true;
	};
	P2P.postToNode = async (...args) => {
		posts.push(args);
		return { success: true };
	};

	// the key pair an earlier version saved in kem_identity
	const kp = hc.generateKemKeypair();
	const oldKem = { publicKey: hc.uintToHex(kp.publicKey), secretKey: hc.uintToHex(kp.secretKey) };
	db.saveKemIdentity(oldKem);

	backend = { Hugin, messages, db, identity, P2P, wallet, sent, joins, posts, oldKem };
	return backend;
}

const sentOn = (b, channel) => b.sent.filter(([c]) => c === channel).map(([, d]) => d);

test('dm_crypto table: one JSON state per address', { skip }, async () => {
	const { db } = await loadBackend();
	const address = 'SEKR' + 'd'.repeat(95);
	assert.equal(db.loadDmCrypto(address), null);
	const state = { messageKey: 'ab'.repeat(32), pendingKemCapsule: '', peerKemPub: '', keyTime: T0, previousKeys: ['cd'.repeat(32)] };
	db.saveDmCrypto(address, state);
	assert.deepEqual(db.loadDmCrypto(address), state);
	db.saveDmCrypto(address, { ...state, keyTime: T0 + 1 });
	assert.equal(db.loadDmCrypto(address).keyTime, T0 + 1, 'replaced, one row');
	assert.equal(db.loadDmCrypto("x' OR 1=1 --"), null);
	assert.throws(() => db.saveDmCrypto('short', state));
});

test("the session's DmCrypto uses the wallet's keys and the stored ML-KEM identity", { skip }, async () => {
	const b = await loadBackend();
	const dm = await b.identity.dm();
	assert.equal(dm, await b.identity.dm(), 'one DmCrypto per wallet session');
	const kem = await b.identity.loadOrCreateIdentity();
	assert.equal(hex(kem.publicKey), b.oldKem.publicKey.toLowerCase(), 'the ML-KEM identity does not change');
	assert.equal(b.db.loadKemIdentity().publicKey, b.oldKem.publicKey);
	const alice = await dmParty('alice');
	assert.equal(await dm.derivationHash(alice.address), await alice.dm.derivationHash(b.wallet.address));
});

test('a node pool batch through decrypt_hugin_messages: the DM saved with its contact, every entry known once, then a reply through the node', { skip }, async () => {
	const b = await loadBackend();
	const alice = await dmParty('alice');
	const carol = await xkrWallet();

	const m1 = await alice.dm.encrypt(b.wallet.address, 'hello from the node', { name: 'alice' });
	const toCarol = await alice.dm.encrypt(carol.address, 'for carol', { name: 'alice' });
	const other = Buffer.from(JSON.stringify({ m: 'x'.repeat(150) })).toString('hex');
	const batch = [
		{ hash: m1.hash, cipher: m1.payload, timestamp: m1.timestamp },
		{ hash: randomHash(), cipher: toCarol.payload, timestamp: m1.timestamp },
		{ hash: randomHash(), cipher: other, timestamp: m1.timestamp },
		{ hash: randomHash(), cipher: 'abcd', timestamp: m1.timestamp },
		{ hash: 'not a hash', cipher: m1.payload }
	];
	await b.messages.decrypt_hugin_messages(batch);

	const shown = sentOn(b, 'newMsg');
	assert.equal(shown.length, 1, 'one DM for us');
	assert.equal(shown[0].message, 'hello from the node');
	assert.equal(shown[0].conversation, alice.address);
	assert.equal(shown[0].hash, m1.hash);
	assert.equal(await b.db.messageExists(m1.hash), true);
	const contact = (await b.db.getContacts()).find((c) => c.address === alice.address);
	assert.ok(contact, 'a first message adds the sender as a contact');
	assert.equal(contact.name, 'alice');
	const dh = await alice.dm.derivationHash(b.wallet.address);
	assert.deepEqual(b.joins, [[{ key: dh }, true, alice.address]], "and joins the contact's DM swarm");
	for (const entry of batch.slice(0, 4)) assert.equal(await b.db.knownTxExists(entry.hash), true, 'stored in knownTxs');
	const state = b.db.loadDmCrypto(alice.address);
	assert.equal(state.messageKey.length, 64, 'the handshake state is in dm_crypto');
	assert.equal(state.pendingKemCapsule.length, 1536);

	b.sent.length = 0;
	await b.messages.decrypt_hugin_messages(batch);
	assert.deepEqual(sentOn(b, 'newMsg'), [], 'a known entry is not opened again');

	// bob answers through the node: the key and its capsule; alice opens it under the key
	await b.messages.send_message('hi alice', alice.address);
	assert.equal(b.posts.length, 1);
	const [cipher, viewtag, kind, hash] = b.posts[0];
	assert.equal(kind, 'dm');
	assert.equal(hash, hc.messageHash(cipher));
	assert.equal(viewtag, push.dmViewTag(alice.viewPub));
	const r = await alice.dm.open(cipher);
	assert.equal(r.status, STATUS.OK);
	assert.equal(r.message.type, 'message');
	assert.equal(r.message.message, 'hi alice');
	assert.equal(r.message.name, 'bob');
	assert.equal(await b.db.messageExists(hash), true, 'the sent message is saved');

	// alice's next message is under the key: bob's capsule is not sent any more
	const m2 = await alice.dm.encrypt(b.wallet.address, 'under the key', { name: 'alice' });
	assert.equal(m2.handshake, 'established');
	b.sent.length = 0;
	await b.messages.decrypt_hugin_messages([{ hash: m2.hash, cipher: m2.payload, timestamp: m2.timestamp }]);
	assert.deepEqual(sentOn(b, 'newMsg').map((m) => m.message), ['under the key']);
	assert.equal(b.db.loadDmCrypto(alice.address).pendingKemCapsule, '');
	await b.messages.send_message('established', alice.address);
	assert.equal(b.posts.length, 2);
	const r2 = await alice.dm.open(b.posts[1][0]);
	assert.equal(r2.status, STATUS.OK);
	assert.equal(r2.message.message, 'established');
});
