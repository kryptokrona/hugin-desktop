'use strict';

// DM parties for tests: an XKR wallet with real keys (kryptokrona-utils), its DM stores in
// memory, and a DmCrypto made by src/backend/identity.cjs (createDmCrypto) over the real
// hugin-crypto, with the wallet operations desktop uses:
//   sign(message, privateSpendKey)           CryptoNote.signMessage (crypto.cjs signMessage)
//   verify(message, address, signature)      CryptoNote.verifyMessageSignature against the
//                                            address's spend key (crypto.cjs verifySignature)
//   keyDerivation(publicKey, privateViewKey) Crypto.generateKeyDerivation
//
//   xkrWallet()             a wallet stand-in: getPrimaryAddress(), getPrimaryAddressPrivateKeys()
//   memoryDmStore({ kem })  database.cjs's DM functions on a Map (contact states kept as JSON
//                           strings, as the dm_crypto column holds them) and the kem_identity row
//   dmParty(name, opts)     { name, wallet, address, viewPub, db, dm }

const { Address, Crypto, CryptoNote } = require('kryptokrona-utils');
const { createDmCrypto } = require('../../../src/backend/identity.cjs');

const xkr = new Crypto();
const note = new CryptoNote();

const sign = (message, privateSpendKey) => note.signMessage(message, privateSpendKey);

async function verify(message, address, signature) {
	try {
		const addr = await Address.fromAddress(address);
		return (await note.verifyMessageSignature(message, addr.spend.publicKey, signature)) === true;
	} catch (err) {
		return false;
	}
}

const keyDerivation = (publicKey, privateViewKey) => xkr.generateKeyDerivation(publicKey, privateViewKey);

async function xkrWallet() {
	const addr = await Address.fromEntropy();
	const address = await addr.address();
	const keys = [addr.spend.privateKey, addr.view.privateKey];
	return {
		address,
		viewPub: addr.view.publicKey,
		viewPriv: addr.view.privateKey,
		getPrimaryAddress: () => address,
		getPrimaryAddressPrivateKeys: () => keys.slice()
	};
}

function memoryDmStore({ kem = null } = {}) {
	const contacts = new Map();
	const store = {
		contacts,
		kem,
		kemSaves: 0,
		loadDmCrypto: async (address) => (contacts.has(address) ? JSON.parse(contacts.get(address)) : null),
		saveDmCrypto: async (address, state) => {
			contacts.set(address, JSON.stringify(state));
		},
		loadKemIdentity: () => (store.kem ? { ...store.kem, alg: 'ml_kem512', created: 1 } : null),
		saveKemIdentity: ({ publicKey, secretKey }) => {
			store.kemSaves++;
			store.kem = { publicKey, secretKey };
		},
		/** The stored state of `address` (parsed), or null. */
		state: (address) => (contacts.has(address) ? JSON.parse(contacts.get(address)) : null)
	};
	return store;
}

async function dmParty(name, { db = memoryDmStore(), now } = {}) {
	const wallet = await xkrWallet();
	const dm = createDmCrypto({ db, wallet, name: () => name, sign, verify, keyDerivation, now, log: () => {} });
	return { name, wallet, address: wallet.address, viewPub: wallet.viewPub, db, dm };
}

module.exports = { xkrWallet, memoryDmStore, dmParty, sign, verify, keyDerivation, xkr };
