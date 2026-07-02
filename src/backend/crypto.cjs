const { sleep, hexToUint, nonceFromTimestamp, trimExtra, randomKey, parse_call, sanitize_pm_message } = require('./utils.cjs');
const { createHash } = require('crypto')
const {Address, Crypto, CryptoNote} = require('kryptokrona-utils');
const { Hugin } = require('./account.cjs');
const xkrUtils = new CryptoNote()
const crypto = new Crypto()
const DHT = require('hyperdht')
const Keychains = require('keypear');
const { ipcMain } = require('electron');
const { saveMsg } = require('./database.cjs');
const hc = require('hugin-crypto');
const sodium = require('sodium-native')

ipcMain.handle('get-room-invite', async () => {
    return create_room_invite()
})

ipcMain.handle('message-keypair', async () => {
    return await keychain.messageKeyPair()
})


const verifySignature = async (message, addr, signature) => {
    try {
    const sekrAddr = await Address.fromAddress(addr)
    const verified = await xkrUtils.verifyMessageSignature(
        message,
        sekrAddr.spend.publicKey,
        signature
    )

    if (!verified) return false

    return true
    } catch (e) {
        return false
    }
}


const signMessage = async (message, privateSpendKey) => {
    return await xkrUtils.signMessage(message, privateSpendKey)
}

const keychain =  {

    getXKRKeypair() {
        const [privateSpendKey, privateViewKey] = keychain.getPrivKeys()
        return { privateSpendKey, privateViewKey }
    },

    getPrivKeys() {
        return Hugin.wallet.getPrimaryAddressPrivateKeys()
    },

   async generateDeterministicSubwalletKeys(spendKey, index) {
        return await crypto.generateDeterministicSubwalletKeys(spendKey, index)
    },

    async messageKeyPair() {
        const [priv, view] = keychain.getPrivKeys()
        const keys = await crypto.generateDeterministicSubwalletKeys(priv, 1)
        const address = await Address.fromSeed(keys.private_key)
        const pub = address.m_keys.m_spendKeys.m_publicKey
        const signKey = address.m_keys.m_spendKeys.m_privateKey
        return [signKey, pub]
    }
    
}

function create_peer_base_keys(buf) {
    const keypair = DHT.keyPair(buf)
    const keys = Keychains.from(keypair) 
    return keys
}

function get_new_peer_keys(key) {
    const secret = Buffer.alloc(32).fill(key)
    const base_keys = create_peer_base_keys(secret)
    const seed = randomKey()
    const dht_keys = create_keys_from_seed(seed)
    //Sign the dht public key with our base_keys
    const signature = base_keys.get().sign(dht_keys.get().publicKey)
    return [base_keys, dht_keys, signature]
}

function create_keys_from_seed(seed) {
    const random_key = Buffer.alloc(32).fill(seed)
    return create_peer_base_keys(random_key)
}

function create_room_invite() {
    const seed = randomKey()
    const rand = randomKey()
    const admin = create_keys_from_seed(seed)
    //[invite, admin seed]
    return [rand + admin.get().publicKey.toString('hex'), seed]
}

// SHA-512 (same digest tweetnacl's nacl.hash produced), now via node crypto.
function naclHash(val) {
    return createHash('sha512').update(Buffer.from(hexToUint(val))).digest()
}

function verify_signature(message, signature, pub) {
    if (signature.length !== 64) return false
    return Keychains.verify(message, signature, pub)
}

const sign_admin_message = (dht_keys, invite, adminkeys) => {
    const admin = adminkeys.find(a => a.invite === invite)
    const keys = create_keys_from_seed(admin.priv)
    return keys.get().sign(dht_keys.get().publicKey)
}

const sign_joined_message = (dht_keys) => {
    const key = keychain.getXKRKeypair().privateSpendKey
    const keys = create_keys_from_seed(key)
    //return [signature, publickey]
    return [keys.get().sign(dht_keys.get().publicKey).toString('hex'), keys.publicKey.toString('hex')]
}

const identity = require('./identity.cjs')

// Beam-delivered PM. Mirror of the node-path check_for_pm_message in
// messages.cjs: hand hugin-crypto our identity secret + a contact-key
// resolver, then persist any handshake state the decrypt surfaces.
const decrpyt_beam_message = async (str) => {
    const wire = hc.decodeExtra(str)
    if (!wire) return
    const [, privateViewKey] = keychain.getPrivKeys()
    const decrypted = await hc.openFriendRequest(
        wire,
        {
            privateViewKey,
            getMessageKey: async (from) => {
                const c = await identity.getContactCrypto(from)
                return c.messageKey || null
            },
        },
        identity.identitySecretKeyBytes(),
    )
    if (!decrypted) return

    if (decrypted.handshake?.peerKemPub) {
        identity.onReceivedPeerKemPub(decrypted.from, decrypted.handshake.peerKemPub)
    } else if (decrypted.handshake?.sharedSecret) {
        identity.onReceivedKemCapsule(decrypted.from, decrypted.handshake.sharedSecret)
    }

    // Same hash construction as the sender + the node-poll receive path:
    // hc.messageHash(wireHex). Beam-delivered duplicates dedup against
    // earlier saves with the same id.
    const hash = hc.messageHash(str)
    const result = sanitize_pm_message({
        from: decrypted.from,
        msg: decrypted.msg,
        t: decrypted.t,
        hash,
        sent: false,
    })
    if (!result.message) return

    const newMsg = {
        message: result.message,
        conversation: result.conversation,
        sent: false,
        timestamp: result.timestamp,
        hash,
        p2p: true,
        beam: true,
    }

    Hugin.send('newMsg', newMsg)
    Hugin.send('privateMsg', newMsg)
    saveMsg(result.message, result.conversation, false, result.timestamp, true, hash)
}


module.exports = {decrpyt_beam_message, sign_admin_message, sign_joined_message, verify_signature, verifySignature, signMessage, keychain, verify_signature, naclHash, get_new_peer_keys, create_keys_from_seed}