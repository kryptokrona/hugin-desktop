'use strict';

// Stand-ins for what the backend gets from Electron and its native modules, for tests under plain
// Node (`node --test tests/backend/*.test.cjs`), the same approach as the hugin-interop harness:
//
//   installElectronStubs(paths)  maps `electron`, `electron-store`, `better-sqlite3-multiple-ciphers`,
//                                `uiohook-napi` and `node-mac-permissions` (Module._load), so the real
//                                database.cjs / account.cjs load and run on a node:sqlite database;
//   memoryDb()                   the database.cjs functions p2p-host.cjs uses, in memory;
//   fakeHugin(), memoryStore()   the account state (account.cjs `Hugin`) and electron-store;
//   fakeSign / fakeVerify        a stand-in for the XKR message signature (128 hex characters, only
//                                "the holder" of an address produces it).

const Module = require('module');
const crypto = require('crypto');
const EventEmitter = require('events');
const keys = require('hugin-p2p/keys');

const ADDRESS = 'SEKR' + 'a'.repeat(95);
const ADDRESS_2 = 'SEKR' + 'b'.repeat(95);
const ADDRESS_3 = 'SEKR' + 'c'.repeat(95);

function fakeSign(address, message) {
	return crypto.createHash('sha512').update(address + '|' + message, 'utf8').digest('hex');
}

async function fakeVerify(message, address, signature) {
	return signature === fakeSign(address, message);
}

// ---------------------------------------------------------------------------------------------
// electron-store and the account state

/** electron-store's `get` (dot paths) and `set` (object or key/value), in memory. */
function memoryStore(initial = {}) {
	const data = JSON.parse(JSON.stringify(initial));
	const get = (key) => {
		let v = data;
		for (const part of String(key).split('.')) {
			if (v === null || typeof v !== 'object' || !(part in v)) return undefined;
			v = v[part];
		}
		return v;
	};
	const set = (key, value) => {
		if (key && typeof key === 'object') {
			for (const [k, v] of Object.entries(key)) data[k] = JSON.parse(JSON.stringify(v));
			return;
		}
		const parts = String(key).split('.');
		let o = data;
		for (const part of parts.slice(0, -1)) {
			if (!o[part] || typeof o[part] !== 'object') o[part] = {};
			o = o[part];
		}
		o[parts[parts.length - 1]] = value === undefined ? undefined : JSON.parse(JSON.stringify(value));
	};
	return { data, get, set, delete: (key) => delete data[key], has: (key) => get(key) !== undefined };
}

/** The parts of account.cjs `Hugin` p2p-host.cjs reads and calls. */
function fakeHugin({ address = ADDRESS, nickname = 'nils', avatar = '', store = memoryStore() } = {}) {
	const hugin = {
		address,
		nickname,
		avatar,
		syncImages: [],
		roomFiles: [],
		block_list: [],
		downloadDir: '/tmp/downloads',
		store,
		banned: (a, topic) => (store.get('bannedUsers') || []).some((b) => b.address === a && b.topic === topic),
		ban(a, topic) {
			if (hugin.banned(a, topic)) return;
			const list = store.get('bannedUsers') || [];
			list.push({ address: a, topic });
			store.set({ bannedUsers: list });
		},
		blocked: (a) => hugin.block_list.some((b) => b.address === a),
		get_files: () => store.get('files') || [],
		is_deleted: (hash) => (store.get('deletedFileHashes') || []).includes(hash),
		file_info(file) {
			const list = hugin.get_files();
			list.push(file);
			store.set({ files: list });
		},
		add_deleted_hashes(hashes) {
			const list = store.get('deletedFileHashes') || [];
			store.set({ deletedFileHashes: [...list, ...hashes.filter((h) => !list.includes(h))] });
		}
	};
	return hugin;
}

// ---------------------------------------------------------------------------------------------
// database.cjs in memory

/**
 * The database.cjs functions p2p-host.cjs calls, on Maps, with the same contract: room rows keep
 * every field as given (integer timestamps stay numbers), saves return the row or false for a
 * duplicate hash. `calls` records [name, ...args].
 */
function memoryDb() {
	const rooms = new Map(); // hash -> row
	const feed = new Map();
	const calls = [];
	const roomKeys = [];
	const users = [];
	const pms = [];
	const record = (name, args) => calls.push([name, ...args]);
	const signed = (r) => typeof r.signature === 'string' && r.signature.length === 128;
	const db = {
		rooms,
		feed,
		calls,
		roomKeys,
		users,
		pms,
		calledWith: (name) => calls.filter((c) => c[0] === name).map((c) => c.slice(1)),
		roomMessageExists: async (hash) => rooms.has(hash),
		getRoomHistoryRows: async (key) =>
			[...rooms.values()].filter((r) => r.room === key && signed(r)).slice(-50).map((r) => ({ ...r })),
		getRoomMessageRow: async (hash) => (rooms.has(hash) ? { ...rooms.get(hash) } : null),
		getLatestRoomHashes: async (key) =>
			[...rooms.values()].filter((r) => r.room === key && signed(r)).map((r) => r.hash).slice(-25),
		feedMessageExists: async (hash) => feed.has(hash),
		printFeed: async () => [...feed.values()].map((r) => ({ ...r })),
		async saveGroupMsg(msg, ...rest) {
			record('saveGroupMsg', [msg, ...rest]);
			if (!msg || typeof msg.hash !== 'string' || rooms.has(msg.hash)) return false;
			rooms.set(msg.hash, { ...msg });
			return msg;
		},
		async saveFeedMessage(msg) {
			record('saveFeedMessage', [msg]);
			if (!msg || feed.has(msg.hash)) return;
			feed.set(msg.hash, { ...msg });
		},
		saveRoomUser(user) {
			record('saveRoomUser', [user]);
			users.push(user);
		},
		removeRoom(key) {
			record('removeRoom', [key]);
		},
		loadRoomKeys: () => roomKeys.slice(),
		async saveMsg(message, addr, sent, timestamp) {
			record('saveMsg', [message, addr, sent, timestamp]);
			const row = { message, conversation: addr, sent, timestamp };
			pms.push(row);
			return row;
		}
	};
	return db;
}

/** What the backend sends to the renderer, recorded. */
function recorder() {
	const sent = [];
	const send = (channel, data) => sent.push([channel, data]);
	send.sent = sent;
	send.of = (channel) => sent.filter(([c]) => c === channel).map(([, d]) => d);
	send.channels = () => sent.map(([c]) => c);
	send.clear = () => sent.splice(0);
	return send;
}

/** A Hyperswarm stand-in for Rooms' `createSwarm` option (no network). */
class FakeSwarm extends EventEmitter {
	constructor(opts) {
		super();
		this.opts = opts;
		this.keyPair = { publicKey: crypto.randomBytes(32), secretKey: crypto.randomBytes(64) };
		this.destroyed = false;
	}

	join() {
		return { flushed: async () => {}, refresh: () => {}, destroy: async () => {} };
	}

	async leave() {}

	joinPeer() {}

	leavePeer() {}

	async suspend() {}

	async resume() {}

	async destroy() {
		this.destroyed = true;
	}
}

function fakeSwarms() {
	const swarms = [];
	const createSwarm = (o) => {
		const swarm = new FakeSwarm(o);
		swarms.push(swarm);
		return { swarm, topic: keys.topicFromSwarmKey(o.key).discoveryKey, keyPair: swarm.keyPair };
	};
	return { swarms, createSwarm };
}

/** ipcMain that records its handlers; `send`/`invoke` call them like the renderer would. */
function fakeIpcMain() {
	const listeners = new Map();
	const handlers = new Map();
	const event = { sender: { send() {} }, reply() {} };
	return {
		listeners,
		handlers,
		on(channel, fn) {
			if (!listeners.has(channel)) listeners.set(channel, []);
			listeners.get(channel).push(fn);
			return this;
		},
		once(channel, fn) {
			return this.on(channel, fn);
		},
		removeListener() {
			return this;
		},
		removeAllListeners() {
			return this;
		},
		handle(channel, fn) {
			handlers.set(channel, fn);
		},
		removeHandler(channel) {
			handlers.delete(channel);
		},
		async send(channel, ...args) {
			const list = listeners.get(channel) || [];
			if (list.length === 0) throw new Error('no listener for ' + channel);
			await Promise.all(list.map((fn) => fn(event, ...args)));
		},
		async invoke(channel, ...args) {
			const fn = handlers.get(channel);
			if (!fn) throw new Error('no handler for ' + channel);
			return fn(event, ...args);
		}
	};
}

// ---------------------------------------------------------------------------------------------
// Electron and native modules for the real database.cjs / account.cjs

/**
 * better-sqlite3's API as database.cjs uses it, on node:sqlite (Node >= 22.13). Arrays bind as
 * separate parameters, undefined as NULL; `key`/`rekey` do nothing.
 */
function sqliteShim() {
	const { DatabaseSync } = require('node:sqlite');
	const value = (v) => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
	const bind = (args) => {
		const out = [];
		for (const a of args) {
			if (Array.isArray(a)) out.push(...a.map(value));
			else out.push(value(a));
		}
		return out;
	};
	class Statement {
		constructor(stmt) {
			this._stmt = stmt;
		}
		run(...args) {
			const r = this._stmt.run(...bind(args));
			return { changes: Number(r.changes), lastInsertRowid: r.lastInsertRowid };
		}
		get(...args) {
			return this._stmt.get(...bind(args));
		}
		all(...args) {
			return this._stmt.all(...bind(args));
		}
		*iterate(...args) {
			yield* this._stmt.all(...bind(args));
		}
	}
	class Database {
		constructor(file = ':memory:') {
			this._db = new DatabaseSync(file);
		}
		prepare(sql) {
			return new Statement(this._db.prepare(sql));
		}
		exec(sql) {
			this._db.exec(sql);
			return this;
		}
		pragma(sql) {
			return this._db.prepare('PRAGMA ' + sql).all();
		}
		transaction(fn) {
			return (...args) => {
				this._db.exec('BEGIN');
				try {
					const r = fn(...args);
					this._db.exec('COMMIT');
					return r;
				} catch (err) {
					this._db.exec('ROLLBACK');
					throw err;
				}
			};
		}
		key() {
			return 0;
		}
		rekey() {
			return 0;
		}
		close() {
			this._db.close();
		}
	}
	return Database;
}

function hasNodeSqlite() {
	try {
		require('node:sqlite');
		return true;
	} catch (err) {
		return false;
	}
}

/** Maps Electron and the native modules for every later require in this process. */
function installElectronStubs({ userData, downloads = userData }) {
	const ipcMain = fakeIpcMain();
	const store = memoryStore();
	class Store {
		constructor() {
			return store;
		}
	}
	const electron = {
		app: Object.assign(new EventEmitter(), {
			getPath: (name) => (name === 'downloads' ? downloads : userData),
			getVersion: () => '0.0.0-test',
			getName: () => 'hugin-test',
			isPackaged: false
		}),
		ipcMain,
		dialog: { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) },
		globalShortcut: { register: () => true, unregister() {}, unregisterAll() {} },
		powerMonitor: Object.assign(new EventEmitter(), { getSystemIdleTime: () => 0 }),
		Notification: class {
			show() {}
		},
		shell: { openExternal: async () => {}, showItemInFolder() {} }
	};
	const stubs = {
		electron,
		'electron-store': Store,
		'better-sqlite3-multiple-ciphers': sqliteShim(),
		'uiohook-napi': { uIOhook: { on() {}, off() {}, start() {}, stop() {} }, UiohookKey: {} },
		'node-mac-permissions': { askForAccessibilityAccess() {} }
	};
	const load = Module._load;
	Module._load = function (request, parent, isMain) {
		if (Object.prototype.hasOwnProperty.call(stubs, request)) return stubs[request];
		return load.call(this, request, parent, isMain);
	};
	return { electron, ipcMain, store };
}

module.exports = {
	ADDRESS,
	ADDRESS_2,
	ADDRESS_3,
	fakeSign,
	fakeVerify,
	memoryStore,
	fakeHugin,
	memoryDb,
	recorder,
	FakeSwarm,
	fakeSwarms,
	fakeIpcMain,
	hasNodeSqlite,
	installElectronStubs
};
