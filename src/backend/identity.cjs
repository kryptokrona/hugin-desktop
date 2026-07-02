// Long-lived ML-KEM-512 identity keypair + per-contact KEM state, desktop side.
//
// Mirror of hugin-native's src/services/hugin/identity.ts — same shape and
// semantics, different storage. The keypair lives in the wallet's encrypted
// SQLite (better-sqlite3-multiple-ciphers), so it inherits at-rest
// encryption from the wallet passphrase. No separate OS-keystore call.
//
// What this module owns:
//   - Lazy load / first-launch generation of the identity keypair.
//   - The per-contact handshake state lookup (messageKey + pendingKemCapsule).
//   - The "received peer pub" / "received peer capsule" persistence hooks
//     the message receive path fires after every successful decrypt.

const hc = require('hugin-crypto');
const {
    loadKemIdentity,
    saveKemIdentity,
    getContacts,
    updateContactKemState,
} = require('./database.cjs');

let cached = null;

/**
 * Load the device's long-lived ML-KEM identity keypair, generating it on
 * first launch. Call once at wallet start; cached in module scope so
 * per-message paths are cheap.
 */
function loadOrCreateIdentity() {
    if (cached) return cached;
    const row = loadKemIdentity();
    if (row && row.publicKey && row.secretKey) {
        cached = {
            publicKey: hc.hexToUint(row.publicKey),
            secretKey: hc.hexToUint(row.secretKey),
        };
        return cached;
    }
    const kp = hc.generateKemKeypair();
    saveKemIdentity({
        publicKey: hc.uintToHex(kp.publicKey),
        secretKey: hc.uintToHex(kp.secretKey),
    });
    cached = kp;
    return kp;
}

/** Raw public key bytes — what hugin-crypto wants. */
function identityPublicKeyBytes() {
    return loadOrCreateIdentity().publicKey;
}

/** Secret key bytes for decapsulation. Never expose outside the process. */
function identitySecretKeyBytes() {
    return loadOrCreateIdentity().secretKey;
}

// ---------------------------------------------------------------------------
// Per-contact KEM state — read/write through the contacts row.
// ---------------------------------------------------------------------------

async function getContactCrypto(address) {
    const contacts = await getContacts();
    const c = contacts.find((x) => x.address === address);
    if (!c) return {};
    const out = {};
    if (c.key && typeof c.key === 'string' && c.key.length === 64) {
        out.messageKey = hc.hexToUint(c.key);
    }
    if (c.pending_kem_capsule && typeof c.pending_kem_capsule === 'string' && c.pending_kem_capsule.length > 0) {
        out.pendingKemCapsule = hc.hexToUint(c.pending_kem_capsule);
    }
    return out;
}

/**
 * Bob's path: received Alice's `kem_pub`. Immediately encapsulate, persist
 * both halves on the contact row, stash the capsule to ship on the next
 * outgoing send.
 */
function onReceivedPeerKemPub(address, peerKemPub) {
    const { ciphertext, sharedSecret } = hc.encapsulate(peerKemPub);
    updateContactKemState(address, {
        key: hc.uintToHex(sharedSecret),
        pending_kem_capsule: hc.uintToHex(ciphertext),
    });
    return { messageKey: sharedSecret, pendingKemCapsule: ciphertext };
}

/**
 * Alice's path: hugin-crypto decapsulated Bob's capsule for us and handed
 * back the shared secret. Persist as the contact's messageKey.
 */
function onReceivedKemCapsule(address, sharedSecret) {
    updateContactKemState(address, { key: hc.uintToHex(sharedSecret) });
}

/** After we ship the kem capsule in an outgoing message, clear it. */
function markKemCapsuleDelivered(address) {
    updateContactKemState(address, { pending_kem_capsule: '' });
}

module.exports = {
    loadOrCreateIdentity,
    identityPublicKeyBytes,
    identitySecretKeyBytes,
    getContactCrypto,
    onReceivedPeerKemPub,
    onReceivedKemCapsule,
    markKemCapsuleDelivered,
};
