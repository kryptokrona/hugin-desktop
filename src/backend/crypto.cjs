const { sleep } = require('./utils.cjs');
const naclUtil = require('tweetnacl-util')
const nacl = require('tweetnacl')
const {Address,CryptoNote} = require('kryptokrona-utils')
const xkrUtils = new CryptoNote()

async function decryptSwarmMessage(tx, hash, group_key) {

    try {

    let decryptBox = false
    let key

        let possibleKey = group_key

        try {
            decryptBox = nacl.secretbox.open(
                hexToUint(tx.sb),
                nonceFromTimestamp(tx.t),
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

    if (!verified) return false

    payload_json.sent = false
    let offchain = true

    return [payload_json, tx.t, hash]

    } catch {
        return [false]
    }
}

async function verifySignature(message, addr, signature) {

    const sekrAddr = await Address.fromAddress(addr)
    const verified = await xkrUtils.verifyMessageSignature(
        message,
        sekrAddr.spend.publicKey,
        signature
    )

    if (!verified) return false

    return true
}


async function signMessage(message, privateSpendKey) {
    return await xkrUtils.signMessage(message, privateSpendKey)
}


module.exports = {decryptSwarmMessage, verifySignature, signMessage}
