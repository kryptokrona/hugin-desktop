'use strict';

// src/backend/crypto-backend.cjs under plain Node: the wallet libraries run on kryptokrona-crypto
// 2.0 or later with its Node-API addon, one copy for kryptokrona-wallet-backend-js,
// kryptokrona-utils and hugin-crypto; the wallet start paths of wallet.cjs check it first.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const C = require('../../src/backend/crypto-backend.cjs');

const NAPI = 7; // any number: evaluateCryptoCopy compares type with the copy's own CryptoType.NAPI

test('the loaded kryptokrona-crypto is 2.0.0 or later and runs on its Node-API addon', () => {
	const result = C.checkCryptoBackend();
	assert.equal(result.ok, true, result.reason);
	assert.equal(result.copies.length, 1, 'one copy: ' + result.copies.map((c) => c.path).join(', '));
	const [copy] = result.copies;
	assert.ok(C.versionAtLeast(copy.version, '2.0.0'), copy.version);
	assert.equal(typeof copy.napi, 'number');
	assert.equal(copy.type, copy.napi, 'Crypto.type is CryptoType.NAPI');

	// the copy every wallet library resolves
	const real = (id, from) => fs.realpathSync(require.resolve(id, { paths: [from] }));
	const walletDir = path.dirname(real('kryptokrona-wallet-backend-js/package.json', __dirname));
	const hcDir = path.dirname(real('hugin-crypto/package.json', __dirname));
	const utilsFromHc = path.dirname(real('kryptokrona-utils/package.json', hcDir));
	const utilsFromWallet = path.dirname(real('kryptokrona-utils/package.json', walletDir));
	assert.equal(utilsFromHc, utilsFromWallet, 'hugin-crypto and the wallet backend load one kryptokrona-utils');
	assert.equal(require(path.join(utilsFromWallet, 'package.json')).version, '1.5.0');
	assert.equal(require(path.join(walletDir, 'package.json')).version, '2.7.0');
	const cryptoDir = path.dirname(real('kryptokrona-crypto/package.json', utilsFromWallet));
	assert.equal(cryptoDir, fs.realpathSync(copy.path));
	assert.ok(fs.readdirSync(path.join(cryptoDir, 'prebuilt', 'napi')).some((f) => f.endsWith('.node')), 'prebuilt/napi holds the addon');
});

test('versions', () => {
	assert.deepEqual(C.parseVersion('2.0.0'), [2, 0, 0]);
	assert.deepEqual(C.parseVersion('2.10.3-beta.1'), [2, 10, 3]);
	assert.equal(C.parseVersion('2.0'), null);
	assert.equal(C.parseVersion(undefined), null);
	for (const v of ['2.0.0', '2.0.1', '2.1.0', '3.0.0', '10.0.0']) assert.equal(C.versionAtLeast(v, '2.0.0'), true, v);
	for (const v of ['1.0.3', '1.1.0', '1.99.99', '0.9.0', 'x']) assert.equal(C.versionAtLeast(v, '2.0.0'), false, v);
});

test('a copy is ok only from 2.0.0 with its Node-API addon', () => {
	assert.equal(C.evaluateCryptoCopy({ version: '2.0.0', type: NAPI, napi: NAPI }).ok, true);
	assert.equal(C.evaluateCryptoCopy({ version: '2.3.1', type: NAPI, napi: NAPI }).ok, true);
	const old = C.evaluateCryptoCopy({ version: '1.0.3', type: 1, napi: undefined });
	assert.equal(old.ok, false);
	assert.match(old.reason, /1\.0\.3 is loaded; the wallet needs 2\.0\.0 or later/);
	assert.equal(C.evaluateCryptoCopy({ version: '1.1.0', type: 6, napi: undefined }).ok, false);
	const external = C.evaluateCryptoCopy({ version: '2.0.0', type: 6, napi: NAPI });
	assert.equal(external.ok, false, 'no addon for the platform (CryptoType.EXTERNAL)');
	assert.match(external.reason, /Node-API addon is not loaded/);
	assert.equal(C.evaluateCryptoCopy({ version: 'unknown', type: NAPI, napi: NAPI }).ok, false);
	assert.equal(C.evaluateCryptoCopy().ok, false);
});

/** resolve/load stand-ins for one kryptokrona-crypto copy of `version`. */
function fakeTree(version, { type = NAPI, napi = NAPI, throws = false } = {}) {
	const files = {
		'/app/node_modules/kryptokrona-crypto/package.json': { version },
		'/app/node_modules/kryptokrona-crypto/dist/index.js': {
			Crypto: Object.assign(
				function Crypto() {
					if (throws) throw new Error('addon failed');
				},
				{ type }
			),
			CryptoType: napi === undefined ? undefined : { NAPI: napi }
		}
	};
	const resolve = (id) => {
		switch (id) {
			case 'kryptokrona-wallet-backend-js/package.json':
				return '/app/node_modules/kryptokrona-wallet-backend-js/package.json';
			case 'kryptokrona-utils/package.json':
				return '/app/node_modules/kryptokrona-utils/package.json';
			case 'kryptokrona-crypto/package.json':
				return '/app/node_modules/kryptokrona-crypto/package.json';
			case 'kryptokrona-crypto':
				return '/app/node_modules/kryptokrona-crypto/dist/index.js';
			default:
				throw new Error('not found: ' + id);
		}
	};
	return { resolve, load: (file) => files[file] };
}

test('checkCryptoBackend refuses kryptokrona-crypto 1.x and a copy without its addon', () => {
	const old = C.checkCryptoBackend(fakeTree('1.0.3', { type: 1, napi: undefined }));
	assert.equal(old.ok, false);
	assert.match(old.reason, /1\.0\.3/);
	assert.equal(old.copies.length, 1);

	const noAddon = C.checkCryptoBackend(fakeTree('2.0.0', { type: 6 }));
	assert.equal(noAddon.ok, false);

	const failing = C.checkCryptoBackend(fakeTree('2.0.0', { throws: true }));
	assert.equal(failing.ok, false, 'an addon that fails to load');

	const missing = C.checkCryptoBackend({
		resolve: () => {
			throw new Error('Cannot find module kryptokrona-crypto');
		}
	});
	assert.equal(missing.ok, false);
	assert.match(missing.reason, /not loaded/);

	assert.equal(C.checkCryptoBackend(fakeTree('2.0.0')).ok, true);
});

test('the wallet gate: no wallet start while the check fails', () => {
	const notified = [];
	const logged = [];
	let checks = 0;
	const ready = C.cryptoGate({
		check: () => {
			checks++;
			return C.checkCryptoBackend(fakeTree('1.0.3', { type: 1, napi: undefined }));
		},
		notify: (m) => notified.push(m),
		log: (m) => logged.push(m)
	});
	assert.equal(ready(), false);
	assert.equal(ready(), false);
	assert.equal(checks, 1, 'checked once');
	assert.equal(notified.length, 2, 'the reason is shown on every attempt');
	assert.match(notified[0], /^Wallet not started: kryptokrona-crypto 1\.0\.3/);

	const ok = C.cryptoGate({ check: () => C.checkCryptoBackend(fakeTree('2.0.0')), notify: () => assert.fail('no notice'), log: () => {} });
	assert.equal(ok(), true);
	assert.equal(C.cryptoGate({ log: () => {} })(), true, 'the gate on the installed libraries');

	// wallet.cjs: creating/importing (createAccount) and opening (startHugin) a wallet pass the gate first
	const src = fs.readFileSync(path.join(__dirname, '../../src/backend/wallet.cjs'), 'utf8');
	assert.match(src, /const cryptoBackendReady = cryptoGate\(/);
	assert.match(src, /async function createAccount\(accountData\) \{\s*if \(!cryptoBackendReady\(\)\) return false/);
	assert.match(src, /async function startHugin\(walletName, password, node\) \{\s*if \(!cryptoBackendReady\(\)\) return false/);
});
