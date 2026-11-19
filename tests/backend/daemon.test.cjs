'use strict';

// src/backend/daemon.cjs: which daemon the wallet gets for a node, and a wallet-backend-js
// Daemon over Hyperswarm against a stand-in xkrd node on a local DHT.

const test = require('node:test');
const assert = require('node:assert/strict');
const b4a = require('b4a');
const createTestnet = require('hyperdht/testnet.js');
const { createHuginSwarm } = require('hugin-network/swarm');
const xd = require('hugin-network/xkr-daemon');
const D = require('../../src/backend/daemon.cjs');

const INVITE = 'xkr:' + '11'.repeat(32) + '22'.repeat(32) + '33'.repeat(32) + '44'.repeat(32);

test('node input: host:port, hyperswarm and invites', () => {
	assert.deepEqual(D.parseNodeInput('node.example:11898'), { node: 'node.example', port: 11898 });
	assert.deepEqual(D.parseNodeInput('hyperswarm'), { node: 'hyperswarm', port: 0 });
	assert.deepEqual(D.parseNodeInput('hyperswarm:0'), { node: 'hyperswarm', port: 0 });
	assert.deepEqual(D.parseNodeInput(INVITE), { node: INVITE, port: 0 });
	assert.deepEqual(D.parseNodeInput(INVITE + ':0'), { node: INVITE, port: 0 });
	assert.equal(D.isSwarmNode('node.example'), false);
	assert.equal(D.isSwarmNode(INVITE), true);
});

test('an HTTP node gives an HTTP daemon', async () => {
	const daemon = D.makeDaemon('node.example', 11898);
	assert.equal(daemon.getConnectionInfo().host, 'node.example');
	await D.closeDaemon();
});

test('hyperswarm: the wallet daemon syncs from an xkrd node on the wallets topic', { timeout: 90000 }, async (t) => {
	const testnet = await createTestnet(3);
	t.after(() => testnet.destroy());
	const node = createHuginSwarm({ key: xd.walletsTopicKey('mainnet'), bootstrap: testnet.bootstrap });
	t.after(() => node.swarm.destroy());
	const info = { status: 'OK', height: 11, network_height: 11, last_known_block_index: 10, hashrate: 1, major_version: 7, minor_version: 0, start_time: 0, supported_height: 0, upgrade_heights: [], version: '1.0.0', synced: true, tx_versions: [1, 2] };
	node.swarm.on('connection', (conn) => {
		conn.on('error', () => {});
		const reader = new xd.FrameReader();
		conn.on('data', (chunk) => {
			for (const f of reader.push(chunk)) {
				if (f.service) conn.write(xd.encodeFrame({ v: 1, height: 10, hash: 'ab'.repeat(32), synced: true, services: ['wallet'], state_span: null, state_hash: null, pruning_seed: 0 }));
				else conn.write(xd.encodeFrame({ id: f.id, result: { status: 200, body: f.params.path === '/fee' ? { address: '', amount: 0, status: 'OK' } : info } }));
			}
		});
	});
	await node.swarm.join(node.topic, { server: true, client: false }).flushed();

	const daemon = D.makeDaemon(D.SWARM_NODE, 0, { bootstrap: testnet.bootstrap });
	t.after(() => D.closeDaemon());
	assert.equal(daemon.getConnectionInfo().host, 'hyperswarm');
	await daemon.init();
	assert.equal(daemon.getNetworkBlockCount(), 10, 'network_height - 1, as over HTTP');
	assert.deepEqual(daemon.getTransactionVersions(), [1, 2]);
});
