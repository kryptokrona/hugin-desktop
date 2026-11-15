'use strict';

// Two desktop hosts (src/backend/p2p-host.cjs with in-memory databases and account state) on a
// local DHT testnet (`hyperdht/testnet.js`, 127.0.0.1 only): a room with the admin, room messages
// both ways (saved as signed, shown as plain text), the DM swarm between the two, and leaving.
// Waits poll state and give up after a timeout (a failed assertion, never a hang).

const test = require('node:test');
const assert = require('node:assert/strict');
const createTestnet = require('hyperdht/testnet.js');
const { keys, sanitize: S, wire: W } = require('hugin-p2p');
const H = require('../../src/backend/p2p-host.cjs');
const { ADDRESS, ADDRESS_2, fakeSign, fakeVerify, memoryDb, memoryStore, fakeHugin, recorder } = require('./helpers/desktop-stubs.cjs');

const TIMEOUT = 120000;
const DHT_WAIT = 60000;
const DERIVATION = 'cd'.repeat(32);
const MARKUP = 'Hej <b>bold</b> <script>alert(1)</script>&amp; done';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor(fn, label, ms = 30000) {
	const start = Date.now();
	while (!(await fn())) {
		if (Date.now() - start > ms) assert.fail('timed out waiting for ' + label);
		await sleep(50);
	}
}

function make(testnet, address, nickname) {
	const db = memoryDb();
	const store = memoryStore();
	const hugin = fakeHugin({ address, nickname, store });
	const send = recorder();
	const dms = [];
	const froms = [];
	const ctx = H.createDesktopP2P(
		{
			db,
			hugin,
			store,
			send,
			sign: async (m) => fakeSign(address, m),
			verify: fakeVerify,
			dm: {
				open: async (wire, opts) => {
					dms.push(wire);
					froms.push(opts && opts.from);
					return { status: 'not-dm' };
				}
			},
			decryptNodeMessages: async () => {},
			log: () => {}
		},
		{ bootstrap: testnet.bootstrap, files: false, rooms: { pingIntervalMs: 0, leaveFlushMs: 50, historyPickMs: 0 } }
	);
	const peerIn = (topic, other) => send.of('peer-connected').some((p) => p.topic === topic && p.address === other);
	return { ctx, db, send, dms, froms, address, peerIn };
}

test('two desktop hosts on a DHT testnet: room, messages both ways, DM swarm, leave', { timeout: TIMEOUT }, async (t) => {
	const testnet = await createTestnet(3);
	const A = make(testnet, ADDRESS, 'alice');
	const B = make(testnet, ADDRESS_2, 'bob');
	// the hosts first, then the testnet they bootstrap from
	t.after(async () => {
		await Promise.all([A.ctx.destroy(), B.ctx.destroy()]);
		await testnet.destroy();
	});

	const { invite, adminSeed } = keys.createRoomInvite();
	const topic = keys.roomTopic(invite).topic;
	A.db.roomKeys.push({ invite, priv: adminSeed });
	assert.equal(await A.ctx.joinRoom(invite), true);
	assert.equal(await B.ctx.joinRoom(invite), true);
	await A.ctx.p2p.rooms.get(invite).flushed();
	await B.ctx.p2p.rooms.get(invite).flushed();

	await waitFor(() => A.peerIn(topic, ADDRESS_2) && B.peerIn(topic, ADDRESS), 'both peers joined in the room', DHT_WAIT);
	const seenByB = B.send.of('peer-connected').find((p) => p.address === ADDRESS);
	assert.equal(seenByB.admin, true, "B sees A's admin signature");
	assert.equal(seenByB.name, 'alice');
	assert.equal(A.send.of('peer-connected').find((p) => p.address === ADDRESS_2).admin, false);
	assert.equal(JSON.parse(A.send.of('swarm-connected')[0]).admin, true);

	// A -> B: signed and sent by A, saved as signed by B, shown as plain text
	const sent = await A.ctx.sendRoomMessage({ room: invite, message: MARKUP, reply: '', tip: false, timestamp: Date.now() });
	assert.ok(sent);
	await waitFor(() => B.db.rooms.has(sent.hash), 'the message reaches B');
	const row = B.db.rooms.get(sent.hash);
	assert.equal(row.signature, sent.signature);
	assert.equal(row.timestamp, Number(sent.timestamp));
	assert.equal(row.message, S.sanitizeText(MARKUP), 'A sends plain text');
	await B.ctx.settled();
	const shown = B.send.of('roomMsg').find((m) => m.hash === sent.hash);
	assert.equal(shown.message, S.sanitizeText(MARKUP));
	assert.equal(shown.address, ADDRESS);
	assert.equal(shown.name, 'alice');

	// B -> A
	const back = await B.ctx.sendRoomMessage({ room: invite, message: 'and back', timestamp: Date.now() });
	await waitFor(() => A.db.rooms.has(back.hash), 'the answer reaches A');
	assert.equal(await fakeVerify(W.roomMessageSigningPayload(A.db.rooms.get(back.hash)), ADDRESS_2, back.signature), true);

	// typing
	A.ctx.p2p.rooms.typing(invite, true);
	await waitFor(() => B.send.of('typing').some((x) => x.address === ADDRESS && x.typing === true && x.key === invite), 'typing reaches B');

	// DM swarm: each side joins with the derivation hash it computed and the contact's address
	const dmTopic = keys.dmTopic(DERIVATION).topic;
	assert.equal(await A.ctx.joinDm(DERIVATION, ADDRESS_2), true);
	assert.equal(await B.ctx.joinDm(DERIVATION, ADDRESS), true);
	await waitFor(() => A.peerIn(dmTopic, ADDRESS_2) && B.peerIn(dmTopic, ADDRESS), 'both admitted in the DM swarm', DHT_WAIT);
	await waitFor(() => A.ctx.sendDm(ADDRESS_2, 'beef00') === 1, 'the DM swarm is writable');
	await waitFor(() => B.dms.includes('beef00'), 'the DM payload reaches B');
	assert.equal(B.froms[B.dms.indexOf('beef00')], ADDRESS, "opened as the contact's payload");
	assert.equal(JSON.parse(A.send.of('swarm-connected').find((s) => JSON.parse(s).beam))['key'], DERIVATION);

	// leave the room: B sees A go, A gets swarm-disconnected
	assert.equal(await A.ctx.endSwarm(invite), true);
	await A.ctx.settled();
	assert.ok(A.send.of('swarm-disconnected').includes(topic));
	await waitFor(() => B.send.of('peer-disconnected').some((p) => p.topic === topic && p.address === ADDRESS), 'B sees A leave');
});
