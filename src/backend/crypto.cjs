const { sleep, hexToUint, nonceFromTimestamp, trimExtra } = require('./utils.cjs');
const naclUtil = require('tweetnacl-util')
const nacl = require('tweetnacl')
const {Address, Crypto, CryptoNote} = require('kryptokrona-utils');
const { Hugin } = require('./account.cjs');
const xkrUtils = new CryptoNote()
const crypto = new Crypto()
const decryptSwarmMessage = async (tx, hash, group_key) => {

    try {
    let json = JSON.parse(trimExtra(tx))
    let decryptBox = false
    let key

        let possibleKey = group_key

        try {
            decryptBox = nacl.secretbox.open(
                hexToUint(json.sb),
                nonceFromTimestamp(json.t),
                hexToUint(possibleKey)
            )

        } catch (err) {
            console.log(err)
        }

    if (!decryptBox) {
        return [false]
    }

    const message_dec = naclUtil.encodeUTF8(decryptBox)
    const payload_json = JSON.parse(message_dec)
    const from = payload_json.k

    const verified = await verifySignature(payload_json.m, from, payload_json.s)
    if (!verified) return [false]

    payload_json.sent = false

    return [payload_json, json.t, hash]

    } catch {
        return [false]
    }
}

const verifySignature = async (message, addr, signature) => {

    const sekrAddr = await Address.fromAddress(addr)
    const verified = await xkrUtils.verifyMessageSignature(
        message,
        sekrAddr.spend.publicKey,
        signature
    )

    if (!verified) return false

    return true
}


const signMessage = async (message, privateSpendKey) => {
    return await xkrUtils.signMessage(message, privateSpendKey)
}

const keychain =  {

    getNaclKeys(privateSpendKey) {
        const secretKey = hexToUint(privateSpendKey)
        const keyPair = nacl.box.keyPair.fromSecretKey(secretKey)
        return keyPair
    },

    getXKRKeypair() {
        const [privateSpendKey, privateViewKey] = keychain.getPrivKeys()
        return { privateSpendKey, privateViewKey }
    },
    
    getPrivKeys() {
        return Hugin.wallet.getPrimaryAddressPrivateKeys()
    },
    
    getKeyPair() {
        const [privateSpendKey, privateViewKey] = keychain.getPrivKeys()
        return keychain.getNaclKeys(privateSpendKey)
    },
    
    getMsgKey() {
        const naclPubKey = keychain.getKeyPair().publicKey
        return Buffer.from(naclPubKey).toString('hex')
    },

   async generateDeterministicSubwalletKeys(spendKey) {
        return await crypto.generateDeterministicSubwalletKeys(spendKey, 1)
    }
    
}


module.exports = {decryptSwarmMessage, verifySignature, signMessage, keychain}