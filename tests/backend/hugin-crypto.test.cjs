'use strict';

// hugin-crypto 1.1.0 as installed for desktop: its message API (createFriendRequest /
// openFriendRequest) between two wallets with real keys, the ML-KEM handshake through it, and the
// recipient's own address (`myAddress`) in every open.

const test = require('node:test');
const assert = require('node:assert/strict');
const hc = require('hugin-crypto');
const { xkrWallet } = require('./helpers/dm-parties.cjs');

const T0 = 1731500000000;

async function party() {
	const wallet = await xkrWallet();
	const [spendPriv, viewPriv] = wallet.getPrimaryAddressPrivateKeys();
	return {
		address: wallet.address,
		sender: { address: wallet.address, privateSpendKey: spendPriv },
		open: { privateViewKey: viewPriv, myAddress: wallet.address },
		viewPriv,
		kem: hc.generateKemKeypair()
	};
}

test('hugin-crypto 1.1.0 is the installed version', () => {
	assert.equal(require('hugin-crypto/package.json').version, '1.1.0');
});

test('hugin-crypto: create, then open with the own address, through the ML-KEM handshake', async () => {
	const alice = await party();
	const bob = await party();

	// initial: alice's ML-KEM public key goes along
	const wire = await hc.createFriendRequest({
		message: 'hi bob',
		sender: alice.sender,
		toAddress: bob.address,
		name: 'alice',
		myKemPub: alice.kem.publicKey,
		timestamp: T0
	});
	const extra = hc.encodeExtra(wire);
	const r1 = await hc.openFriendRequest(hc.decodeExtra(extra), bob.open, bob.kem.secretKey);
	assert.ok(r1, 'opened');
	assert.equal(r1.type, 'friend-request');
	assert.equal(r1.from, alice.address);
	assert.equal(r1.msg, 'hi bob');
	assert.equal(r1.name, 'alice');
	assert.equal(r1.t, T0);
	assert.equal(r1.verified, true);
	assert.deepEqual(r1.handshake.peerKemPub, alice.kem.publicKey);

	// first reply: bob's capsule and the inner box under the new key
	const { ciphertext, sharedSecret } = hc.encapsulate(r1.handshake.peerKemPub);
	const reply = await hc.createFriendRequest({
		message: 'hi alice',
		sender: bob.sender,
		toAddress: alice.address,
		messageKey: sharedSecret,
		kemCiphertext: ciphertext,
		timestamp: T0 + 1
	});
	const r2 = await hc.openFriendRequest(reply, { ...alice.open, getMessageKey: () => null }, alice.kem.secretKey);
	assert.ok(r2, 'opened');
	assert.equal(r2.type, 'message');
	assert.equal(r2.from, bob.address);
	assert.equal(r2.msg, 'hi alice');
	assert.deepEqual(r2.handshake.sharedSecret, sharedSecret, 'alice gets the same key');

	// established: the stored key, looked up by the sender's address
	const asked = [];
	const msg = await hc.createFriendRequest({
		message: 'both keys',
		sender: alice.sender,
		toAddress: bob.address,
		messageKey: sharedSecret,
		timestamp: T0 + 2
	});
	const r3 = await hc.openFriendRequest(msg, {
		...bob.open,
		getMessageKey: async (from) => {
			asked.push(from);
			return from === alice.address ? sharedSecret : null;
		}
	});
	assert.ok(r3, 'opened');
	assert.equal(r3.msg, 'both keys');
	assert.equal(r3.handshake, undefined);
	assert.deepEqual(asked, [alice.address]);
});

test('hugin-crypto: openFriendRequest resolves to false for another recipient and for bad input', async () => {
	const alice = await party();
	const bob = await party();
	const carol = await party();
	const wire = await hc.createFriendRequest({
		message: 'for bob',
		sender: alice.sender,
		toAddress: bob.address,
		timestamp: T0
	});
	assert.ok(await hc.openFriendRequest(wire, bob.open));

	assert.equal(await hc.openFriendRequest(wire, carol.open), false, "carol's keys");
	assert.equal(
		await hc.openFriendRequest(wire, { privateViewKey: bob.viewPriv, myAddress: carol.address }),
		false,
		'the signature names bob as the recipient'
	);
	assert.equal(await hc.openFriendRequest(wire, { privateViewKey: bob.viewPriv }), false, 'no myAddress');
	assert.equal(await hc.openFriendRequest({ ...wire, box: 'zz' }, bob.open), false, 'box not hex');
	assert.equal(await hc.openFriendRequest({ ...wire, t: wire.t + 1 }, bob.open), false, 'another t');
	assert.equal(await hc.openFriendRequest(null, bob.open), false);
	assert.equal(hc.decodeExtra('not hex'), false);
});
