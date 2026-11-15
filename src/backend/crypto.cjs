const {Address, Crypto, CryptoNote} = require('kryptokrona-utils');
const { Hugin } = require('./account.cjs');
const xkrUtils = new CryptoNote()
const crypto = new Crypto()
// Swarm keys, topics, room invites and admin signatures come from `hugin-p2p/keys` (topic
// derivation and the Hugin `mid` from `hugin-p2p/swarm` underneath), so this file never loads
// hyperdht itself and only one hyperdht copy is in the process.
const { createRoomInvite } = require('hugin-p2p/keys')
const { ipcMain } = require('electron');

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

module.exports = {verifySignature, signMessage, keychain}