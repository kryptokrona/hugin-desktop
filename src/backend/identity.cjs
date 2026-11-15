'use strict';

// Direct messages: the wallet session's DmCrypto (hugin-p2p/dm) and the hooks desktop gives it.
//
// hugin-p2p/dm builds and opens the DM payloads and keeps the per-contact ML-KEM handshake;
// desktop supplies the crypto provider (hugin-crypto), the wallet's key operations and storage:
//
//   identity()                    the wallet's primary address and the nickname sent with DMs
//   sign(message)                 the primary spend key signature (crypto.cjs signMessage)
//   verify(message, address, sig) crypto.cjs verifySignature
//   keyDerivation(publicKey)      generate_key_derivation(publicKey, primary private view key)
//   load/saveContactCrypto        one JSON state per address in the dm_crypto table
//   load/saveKemIdentity          the kem_identity row: the ML-KEM-512 key pair this install has
//                                 used since it was first made (hex, both halves)
//
// createDmHost / createDmCrypto take every dependency as an argument, so they run under plain
// Node (tests/backend). dm() is the app's instance: one DmCrypto per open wallet, made on first
// use and seeded with the node pool hashes already handled (knownTxs).

const { DmCrypto } = require('hugin-p2p/dm');

/** Node pool hashes handed to a new DmCrypto (it remembers this many). */
const KNOWN_POOL_HASHES = 1000;

function consoleLog(level, msg, data) {
    if (level === 'debug') return;
    if (data === undefined) console.log('[dm]', level, msg);
    else console.log('[dm]', level, msg, data);
}

/**
 * The host hooks of hugin-p2p/dm. `deps`:
 *   db        loadDmCrypto(address), saveDmCrypto(address, state), loadKemIdentity(),
 *             saveKemIdentity({ publicKey, secretKey }) (database.cjs or a stub)
 *   wallet    getPrimaryAddress(), getPrimaryAddressPrivateKeys() -> [privateSpendKey, privateViewKey]
 *   name()    the display name sent with DMs
 *   sign(message, privateSpendKey), verify(message, address, signature),
 *   keyDerivation(publicKey, privateViewKey)   the wallet's key operations (kryptokrona-utils)
 *   now(), log(level, msg, data)               optional
 */
function createDmHost(deps) {
    const { db, wallet } = deps;
    const keys = () => wallet.getPrimaryAddressPrivateKeys();
    const host = {
        identity: () => {
            const name = typeof deps.name === 'function' ? deps.name() : '';
            return { address: wallet.getPrimaryAddress(), name: typeof name === 'string' ? name : '' };
        },
        sign: (message) => deps.sign(message, keys()[0]),
        verify: async (message, address, signature) => {
            try {
                return (await deps.verify(message, address, signature)) === true;
            } catch (err) {
                return false;
            }
        },
        keyDerivation: (publicKey) => deps.keyDerivation(publicKey, keys()[1]),
        loadContactCrypto: (address) => db.loadDmCrypto(address),
        saveContactCrypto: (address, state) => db.saveDmCrypto(address, state),
        loadKemIdentity: async () => {
            const row = await db.loadKemIdentity();
            return row ? { publicKey: row.publicKey, secretKey: row.secretKey } : null;
        },
        saveKemIdentity: ({ publicKey, secretKey }) => db.saveKemIdentity({ publicKey, secretKey }),
        log: typeof deps.log === 'function' ? deps.log : () => {}
    };
    if (typeof deps.now === 'function') host.now = deps.now;
    return host;
}

/**
 * A DmCrypto over createDmHost(deps). `deps.crypto`: the crypto provider (default hugin-crypto);
 * `deps.knownPoolHashes`: node pool hashes already handled, oldest first.
 */
function createDmCrypto(deps) {
    const known = Array.isArray(deps.knownPoolHashes) ? deps.knownPoolHashes.slice(-KNOWN_POOL_HASHES) : [];
    return new DmCrypto({
        crypto: deps.crypto || require('hugin-crypto'),
        host: createDmHost(deps),
        knownPoolHashes: known
    });
}

// ---------------------------------------------------------------------------------------------
// the app's instance

let session = null;

/**
 * The DmCrypto of the open wallet (account.cjs `Hugin.wallet`), made on the first call after the
 * wallet opened and the database loaded. Rejects while no wallet is open.
 */
function dm() {
    const { Hugin } = require('./account.cjs');
    const wallet = Hugin.wallet;
    if (!wallet) return Promise.reject(new Error('no wallet is open'));
    if (session && session.wallet === wallet) return session.dm;
    const db = require('./database.cjs');
    const { signMessage, verifySignature } = require('./crypto.cjs');
    const { Crypto } = require('kryptokrona-utils');
    const xkr = new Crypto();
    const made = (async () => {
        const known = await db.loadKnownTxs();
        return createDmCrypto({
            db,
            wallet,
            name: () => Hugin.nickname,
            sign: signMessage,
            verify: verifySignature,
            keyDerivation: (publicKey, privateViewKey) => xkr.generateKeyDerivation(publicKey, privateViewKey),
            knownPoolHashes: known.map((row) => row && row.hash).filter((h) => typeof h === 'string'),
            log: consoleLog
        });
    })();
    session = { wallet, dm: made };
    made.catch(() => {
        if (session && session.dm === made) session = null;
    });
    return made;
}

/**
 * Loads the ML-KEM identity of the open wallet's install (made and saved on first launch), so
 * the first DM does not wait for it.
 */
async function loadOrCreateIdentity() {
    return (await dm()).kemIdentity();
}

module.exports = {
    createDmHost,
    createDmCrypto,
    dm,
    loadOrCreateIdentity
};
