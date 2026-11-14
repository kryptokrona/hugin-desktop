const { sanitize_pm_message } = require('./utils.cjs');
const {Address, Crypto, CryptoNote} = require('kryptokrona-utils');
const { Hugin } = require('./account.cjs');
const xkrUtils = new CryptoNote()
const crypto = new Crypto()
// Swarm keys, topics, room invites and admin signatures come from `hugin-p2p/keys` (topic
// derivation and the Hugin `mid` from `hugin-p2p/swarm` underneath), so this file never loads
// hyperdht itself and only one hyperdht copy is in the process.
const { createRoomInvite } = require('hugin-p2p/keys')
const { ipcMain } = require('electron');
const { saveMsg } = require('./database.cjs');
const hc = require('hugin-crypto');

// [invite, admin seed]: invite = 64 random hex + hex(admin public key), where the admin key
// pair is keyPair(fill32(admin seed)), the same pair `keys.signAdmin` signs with.
ipcMain.handle('get-room-invite', async () => {
    const { invite, adminSeed } = createRoomInvite()
    return [invite, adminSeed]
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
        await identity.onReceivedPeerKemPub(decrypted.from, decrypted.handshake.peerKemPub)
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


module.exports = {decrpyt_beam_message, verifySignature, signMessage, keychain}