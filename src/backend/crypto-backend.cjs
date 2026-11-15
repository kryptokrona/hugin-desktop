'use strict';

// The crypto library under the wallet: kryptokrona-wallet-backend-js and kryptokrona-utils run on
// kryptokrona-crypto 2.0 or later, whose Node-API addon (prebuilt/napi, napi-rs) loads in every
// Electron and Node.js version. `checkCryptoBackend()` looks at the kryptokrona-crypto copies the
// wallet libraries load (version and `Crypto.type`); wallet.cjs starts no wallet when the check
// fails (`cryptoGate`). No Electron imports, so tests/backend can load this module under plain Node.

const path = require('path');

/** Lowest kryptokrona-crypto version the wallet starts with. */
const MIN_CRYPTO_VERSION = '2.0.0';

/** [major, minor, patch] of a semver string, or null. */
function parseVersion(version) {
	const m = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.+-]*)?$/.exec(String(version));
	return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}

/** true when `version` is at least `min` (major, minor, patch). */
function versionAtLeast(version, min) {
	const v = parseVersion(version);
	const m = parseVersion(min);
	if (!v || !m) return false;
	for (let i = 0; i < 3; i++) {
		if (v[i] !== m[i]) return v[i] > m[i];
	}
	return true;
}

/**
 * The verdict for one loaded copy: `{ version, type, napi }` (`type`: `Crypto.type`, `napi`:
 * `CryptoType.NAPI` of that copy, undefined before 2.0.0) -> `{ ok, reason }`. A copy is ok
 * with version >= 2.0.0 and its Node-API addon loaded (`type === CryptoType.NAPI`).
 */
function evaluateCryptoCopy({ version, type, napi } = {}) {
	if (!parseVersion(version)) return { ok: false, reason: 'kryptokrona-crypto: unknown version' };
	if (!versionAtLeast(version, MIN_CRYPTO_VERSION)) {
		return { ok: false, reason: `kryptokrona-crypto ${version} is loaded; the wallet needs ${MIN_CRYPTO_VERSION} or later` };
	}
	if (typeof napi !== 'number' || type !== napi) {
		return { ok: false, reason: `kryptokrona-crypto ${version}: its Node-API addon is not loaded for ${process.platform}-${process.arch}` };
	}
	return { ok: true, reason: '' };
}

/**
 * The kryptokrona-crypto copies the wallet libraries load, each as
 * `{ path, version, type, napi }`: the one kryptokrona-wallet-backend-js resolves, the one its
 * kryptokrona-utils resolves (that is where `Crypto` comes from) and the one the backend's own
 * kryptokrona-utils resolves. With the pnpm overrides of package.json they are one copy.
 * `resolve(id, fromDir)` and `load(file)` are for tests (default: Node's resolution).
 */
function loadedCryptoCopies({ resolve = defaultResolve, load = require } = {}) {
	const walletDir = path.dirname(resolve('kryptokrona-wallet-backend-js/package.json', __dirname));
	const bases = [
		walletDir,
		path.dirname(resolve('kryptokrona-utils/package.json', walletDir)),
		path.dirname(resolve('kryptokrona-utils/package.json', __dirname))
	];
	const copies = new Map();
	for (const base of bases) {
		const pkgFile = resolve('kryptokrona-crypto/package.json', base);
		if (copies.has(pkgFile)) continue;
		const dir = path.dirname(pkgFile);
		const pkg = load(pkgFile);
		const lib = load(resolve('kryptokrona-crypto', base));
		let type;
		try {
			// the constructor loads the addon; Crypto.type tells which backend it runs on
			new lib.Crypto();
			type = lib.Crypto.type;
		} catch {
			type = undefined;
		}
		copies.set(pkgFile, {
			path: dir,
			version: pkg && pkg.version,
			type,
			napi: lib.CryptoType ? lib.CryptoType.NAPI : undefined
		});
	}
	return [...copies.values()];
}

function defaultResolve(id, fromDir) {
	return require.resolve(id, { paths: [fromDir] });
}

/**
 * `{ ok, reason, copies }`: ok when every kryptokrona-crypto copy the wallet libraries load is
 * 2.0.0 or later with its Node-API addon. Never throws (a copy that does not load is a reason).
 */
function checkCryptoBackend(opts) {
	let copies;
	try {
		copies = loadedCryptoCopies(opts);
	} catch (err) {
		return { ok: false, reason: 'kryptokrona-crypto not loaded: ' + ((err && err.message) || err), copies: [] };
	}
	if (copies.length === 0) return { ok: false, reason: 'kryptokrona-crypto not found', copies };
	for (const copy of copies) {
		const verdict = evaluateCryptoCopy(copy);
		if (!verdict.ok) return { ok: false, reason: verdict.reason + ' (' + copy.path + ')', copies };
	}
	return { ok: true, reason: '', copies };
}

/**
 * The check wallet.cjs makes before it creates, imports or opens a wallet: `ready()` runs
 * `check` (default `checkCryptoBackend`) on its first call and returns its `ok`; while it is
 * false every call logs the reason and passes it to `notify` (the renderer's error toast).
 */
function cryptoGate({ check = checkCryptoBackend, notify = () => {}, log = console.log } = {}) {
	let result = null;
	return function ready() {
		if (!result) {
			result = check() || { ok: false, reason: 'kryptokrona-crypto: no result', copies: [] };
			if (result.ok) log('kryptokrona-crypto ' + result.copies.map((c) => c.version).join(', ') + ' (Node-API)');
		}
		if (!result.ok) {
			const message = 'Wallet not started: ' + result.reason;
			log(message);
			try {
				notify(message);
			} catch {}
		}
		return result.ok === true;
	};
}

module.exports = {
	MIN_CRYPTO_VERSION,
	parseVersion,
	versionAtLeast,
	evaluateCryptoCopy,
	loadedCryptoCopies,
	checkCryptoBackend,
	cryptoGate
};
