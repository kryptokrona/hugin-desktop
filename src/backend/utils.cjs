const { randomBytes } = require('crypto');
// Text sanitising is hugin-p2p's pure-JS implementation of desktop's sanitize-html policy
// (no tags allowed, then un-escaped): the plain text content, markup removed, entities decoded.
// Non-string values are returned unchanged.
const { sanitizeText } = require('hugin-p2p/sanitize');
const { Crypto, Keys } = require('kryptokrona-utils');
const { ipcMain, dialog } = require('electron');
const crypto = new Crypto();
//PoW defaults (tuned for desktop app)
const pow_config = {
	DEBUG: true,
	HASHES_PER_SECOND: 800,
	TIME_BUDGET_MS: 90000,
	SHARES: 1,
	BOOST_HASHES_PER_SECOND: 600,
	BOOST_TIME_BUDGET_MS: 90000,
	MAX_JOB_TIME_MS: 90000,
	MAX_BLOB_HEX_BYTES: 1024
};
//Unified PoW logging toggle
const logPow = (...args) => {
	if (pow_config.DEBUG) {
		console.log('[pow]', ...args);
	}
};

const { createReadStream } = require('fs');
const MEDIA_TYPES = [
	{ file: '.png', type: 'image' },
	{ file: '.jpg', type: 'image' },
	{ file: '.gif', type: 'image' },
	{ file: '.jfif', type: 'image' },
	{ file: '.jpeg', type: 'image' },
	{ file: '.webp', type: 'image' },
	{ file: '.mp4', type: 'video' },
	{ file: '.webm', type: 'video' },
	{ file: '.avi', type: 'video' },
	{ file: '.webp', type: 'video' },
	{ file: '.mov', type: 'video' },
	{ file: '.wmv', type: 'video' },
	{ file: '.mkv', type: 'video' },
	{ file: '.mpeg', type: 'video' },
	{ file: '.m4a', type: 'audio' },
	{ file: '.mp3', type: 'audio' },
	{ file: '.wav', type: 'audio' }
];

ipcMain.handle('load-file', async (e, path, size) => {
	if (!is_loadable_path(path)) return ['File not found'];
	return await load_file(path, size);
});

// load-file serves files from the app's own directories (user data, the download directory,
// the clipboard image directory), files the app has recorded in its file list, and files the
// user picked for upload in this session.
const nodePath = require('path');
const fs = require('fs');
const { isPathInside } = require('./validate.cjs');
const userPickedFiles = new Set();

function clipboard_dir() {
	const { app } = require('electron');
	return nodePath.join(app.getPath('temp'), 'hugin-clipboard');
}

function register_user_file(p) {
	if (typeof p !== 'string' || p.length === 0) return;
	userPickedFiles.add(nodePath.resolve(p));
}

function real_path(p) {
	try {
		return fs.realpathSync(p);
	} catch {
		return null;
	}
}

function is_loadable_path(p) {
	if (typeof p !== 'string' || p.length === 0 || p.includes('\0')) return false;
	const real = real_path(p);
	if (!real) return false;
	if (userPickedFiles.has(nodePath.resolve(p)) || userPickedFiles.has(real)) return true;
	// Required here, not at load time: account.cjs requires this module.
	const { app } = require('electron');
	const { Hugin } = require('./account.cjs');
	try {
		const files = Hugin.get_files();
		if (Array.isArray(files) && files.some((f) => f && f.path === p)) return true;
	} catch {}
	const roots = [app.getPath('userData'), Hugin.downloadDir, clipboard_dir()];
	return roots.some((root) => {
		if (typeof root !== 'string' || root.length === 0) return false;
		return isPathInside(real_path(root) ?? root, real);
	});
}

// Directories the user chose in the directory dialog; change-download-dir accepts only these.
const pickedDirectories = new Set();

ipcMain.handle('select-directory', async () => {
	const dir = await dialog.showOpenDialog({
		properties: ['openDirectory']
	});
	if (dir && Array.isArray(dir.filePaths)) {
		for (const p of dir.filePaths) pickedDirectories.add(p);
	}
	return dir;
});

function is_picked_directory(p) {
	return typeof p === 'string' && pickedDirectories.has(p);
}

const CLIPBOARD_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const MAX_CLIPBOARD_BASE64 = 70000000;

// The file name is reduced to a plain base name with an image extension, and the result must
// stay inside the clipboard image directory.
function clipboard_file_name(filename) {
	const base = nodePath.basename(typeof filename === 'string' ? filename : '');
	const dot = base.lastIndexOf('.');
	let ext = dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
	if (!CLIPBOARD_IMAGE_EXTENSIONS.includes(ext)) ext = 'png';
	let stem = (dot > 0 ? base.slice(0, dot) : base).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64);
	if (stem.length === 0) stem = 'image';
	return `${stem}.${ext}`;
}

ipcMain.handle('save-clipboard-image', async (e, base64Data, filename) => {
	if (typeof base64Data !== 'string' || base64Data.length > MAX_CLIPBOARD_BASE64) return null;

	const tempDir = clipboard_dir();
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir, { recursive: true });
	}

	const uniqueFilename = `${Date.now()}-${randomBytes(4).toString('hex')}-${clipboard_file_name(filename)}`;
	const filePath = nodePath.join(tempDir, uniqueFilename);
	if (!isPathInside(tempDir, filePath)) return null;

	// Convert base64 to buffer and write to a new file
	const base64Content = base64Data.replace(/^data:image\/\w+;base64,/, '');
	const buffer = Buffer.from(base64Content, 'base64');
	try {
		fs.writeFileSync(filePath, buffer, { flag: 'wx' });
	} catch (err) {
		console.log('save-clipboard-image failed:', err.message);
		return null;
	}

	return { path: filePath, size: buffer.length };
});

//Check if it is an image or video with allowed type
function check_if_media(path, size, check = false) {
	if (path === undefined && !check) return [false];
	if (size >= 50000000) return [false];
	for (const a of MEDIA_TYPES) {
		if (path.toLowerCase().endsWith(a.file)) {
			return [true, a.type];
		}
	}
	return [false];
}

async function load_file(path, size) {
	let imgArray = [];
	const [media, type] = check_if_media(path, size);
	if (media) {
		return new Promise((resolve) => {
			try {
				const stream = createReadStream(path);

				stream.on('data', (data) => {
					imgArray.push(data);
				});
				stream.on('error', () => {
					resolve(['File not found']);
				});

				stream.on('end', () => {
					resolve([Buffer.concat(imgArray), type]);
				});
			} catch {
				resolve(['File not found']);
			}
		});
	} else {
		return ['File'];
	}
}

function randomKey() {
	return randomBytes(32).toString('hex');
}

async function hash(text) {
	return await crypto.cn_fast_hash(toHex(text));
}

function toHex(str, hex) {
	try {
		hex = unescape(encodeURIComponent(str))
			.split('')
			.map(function (v) {
				return v.charCodeAt(0).toString(16);
			})
			.join('');
	} catch (e) {
		hex = str;
		//console.log('invalid text input: ' + str)
	}
	return hex;
}

function fromHex(hex, str) {
	try {
		str = decodeURIComponent(hex.replace(/(..)/g, '%$1'));
	} catch (e) {
		str = hex;
		// console.log('invalid hex input: ' + hex)
	}
	return str;
}

function trimExtra(extra) {
	// Off-chain (beam/swarm/push-node): the whole string is already bare hex of
	// JSON — no prefix to strip. Try that first so we don't corrupt payloads
	// that were never wrapped in a tx-extra prefix.
	try {
		let payload = fromHex(extra);
		JSON.parse(payload);
		return payload;
	} catch (e) {}
	// On-chain: 66-char tx-extra prefix (kryptokrona-service shape).
	try {
		let payload = fromHex(extra.substring(66));
		JSON.parse(payload);
		return payload;
	} catch (e) {
		// On-chain: 78-char prefix (wallet-backend shape).
		return fromHex(Buffer.from(extra.substring(78)).toString());
	}
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function check_hash(hash) {
	if (typeof hash !== 'string' || hash.length !== 64) return false;
	return true;
}

const sanitize_pm_message = (msg) => {
	let sent = msg.sent;
	let addr = msg.sent ? sanitizeText(msg.conversation || msg.chat) : sanitizeText(msg.from);
	let timestamp = sanitizeText(msg.t ?? msg.timestamp);
	let key = sanitizeText(msg.k ?? msg.key);
	let message = sanitizeText(msg.msg || msg.message);
	// hugin-crypto messageHash (SHA-256) — 64 lowercase hex chars. Stays ''
	// when the message arrived from a path that doesn't carry the wire bytes
	// (legacy paths / synthetic messages); save_message tolerates the empty.
	let hash = typeof msg.hash === 'string' ? sanitizeText(msg.hash) : '';
	if (message?.length > 777 || (msg.msg === undefined && msg.message === undefined)) return [false];
	if (addr?.length > 99 || addr === undefined) return [false];
	if (typeof sent !== 'boolean') return [false];
	if (timestamp?.length > 25) return [false];
	if (key?.length > 64) return [false];
	if (hash.length > 64) return [false];

	return { message, conversation: addr, key, timestamp, sent, hash };
};

const mini_message = (data) => {
	try {
		const raw = JSON.parse(data);
		const message = {
			m: raw?.message,
			k: raw?.address,
			s: raw?.signature,
			t: raw?.timestamp,
			g: raw?.room,
			r: raw?.reply,
			n: raw?.name ?? raw?.nickname,
			hash: raw?.hash,
			tip: raw?.tip
		};
		return message;
	} catch (e) {
		consol.log('err', e);
		return false;
	}
};

const isLatin = (text) => {
	const REGEX_CHINESE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
	const isChinese = text.match(REGEX_CHINESE);
	if (isChinese) {
		return false;
	}
	const REGEX_JAPAN = /[\u3040-\u30FF\u31F0-\u31FF\uFF00-\uFFEF]/;
	const isJapanese = text.match(REGEX_JAPAN);
	if (isJapanese) {
		return false;
	}
	const REGEX_KOREA = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
	const isKorean = text.match(REGEX_KOREA);
	if (isKorean) {
		return false;
	}
	return true;
};

const containsOnlyEmojis = (text) => {
	if (!isLatin(text)) {
		return false;
	}
	const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '');
	const visibleChars = text.replace(new RegExp('[\n\rs]+|( )+', 'g'), '');
	return onlyEmojis.length === visibleChars.length;
};

// Map from raw key codes (e.g., evdev or native input) to browser keyCode
const rawToBrowserKeyCode = {
	1: 27, // Esc
	2: 49, // 1
	3: 50, // 2
	4: 51, // 3
	5: 52, // 4
	6: 53, // 5
	7: 54, // 6
	8: 55, // 7
	9: 56, // 8
	10: 57, // 9
	11: 48, // 0
	14: 8, // Backspace
	15: 9, // Tab
	16: 81, // Q
	17: 87, // W
	18: 69, // E
	19: 82, // R
	20: 84, // T
	21: 89, // Y
	22: 85, // U
	23: 73, // I
	24: 79, // O
	25: 80, // P
	28: 13, // Enter
	30: 65, // A
	31: 83, // S
	32: 68, // D
	33: 70, // F
	34: 71, // G
	35: 72, // H
	36: 74, // J
	37: 75, // K
	38: 76, // L
	44: 90, // Z
	45: 88, // X
	46: 67, // C
	47: 86, // V
	48: 66, // B
	49: 78, // N
	50: 77, // M
	57: 32, // Space
	58: 20, // Caps Lock
	59: 112, // F1
	60: 113, // F2
	61: 114, // F3
	62: 115, // F4
	63: 116, // F5
	64: 117, // F6
	65: 118, // F7
	66: 119, // F8
	67: 120, // F9
	68: 121 // F10
};

// Convert raw code to browser keyCode
function toBrowbroserKey(rawCode) {
	return rawToBrowserKeyCode[rawCode] || 0; // 0 = unknown
}

module.exports = {
	register_user_file,
	is_picked_directory,
	is_loadable_path,
	clipboard_file_name,
	isLatin,
	mini_message,
	toBrowbroserKey,
	containsOnlyEmojis,
	sanitizeText,
	sleep,
	check_hash,
	trimExtra,
	fromHex,
	randomKey,
	toHex,
	hash,
	sanitize_pm_message,
	check_if_media,
	MEDIA_TYPES,
	pow_config,
	logPow
};
