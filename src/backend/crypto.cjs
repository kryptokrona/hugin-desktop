const { sleep, hexToUint, nonceFromTimestamp, trimExtra, randomKey, parse_call, sanitize_pm_message } = require('./utils.cjs');
const naclUtil = require('tweetnacl-util')
const nacl = require('tweetnacl')
const {Address, Crypto, CryptoNote} = require('kryptokrona-utils');
const { Hugin } = require('./account.cjs');
const xkrUtils = new CryptoNote()
const crypto = new Crypto()
const DHT = require('hyperdht')
const Keychains = require('keypear');
const { ipcMain } = require('electron');
const { saveMsg } = require('./database.cjs');
const { extraDataToMessage } = require('hugin-crypto');
const sodium = require('sodium-native')

ipcMain.handle('get-room-invite', async () => {
    return create_room_invite()
})

ipcMain.handle('message-keypair', async () => {
    return await keychain.messageKeyPair()
})

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

function encrypt_sealed_box(pk, m) {
  const pub = Buffer.from(pk, 'hex')
  const cipher = Buffer.alloc(m.length + sodium.crypto_box_SEALBYTES)
  sodium.crypto_box_seal(cipher, m, pub)
  return cipher
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

function naclHash(val) {
    return nacl.hash(hexToUint(val))
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

const decrpyt_beam_message = async (str, msgKey) => {
    let decrypted_message = await extraDataToMessage(str, [msgKey], keychain.getXKRKeypair())
    decrypted_message.k = msgKey
    decrypted_message.sent = false

    const [message, address, key, timestamp] = sanitize_pm_message(decrypted_message)
    if (!message) return
    
    const newMsg = {
        msg: message,
        chat: address,
        sent: false,
        timestamp: timestamp,
        offchain: true,
        beam: true,
    }

    Hugin.send('newMsg', newMsg)
    Hugin.send('privateMsg', newMsg)
    saveMsg(message, address, false, timestamp)
}


module.exports = {encrypt_sealed_box, decrpyt_beam_message, sign_admin_message, sign_joined_message, verify_signature, decryptSwarmMessage, verifySignature, signMessage, keychain, verify_signature, naclHash, get_new_peer_keys, create_keys_from_seed}