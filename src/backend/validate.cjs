'use strict';

// Small input checks shared by the main process. No Electron imports, so tests/backend can load
// this module under plain Node.
//
// - externalUrl: validates the URL scheme of a link before it is handed to the OS.
// - isHex64: the format of message and transaction hashes.
// - notificationTitle / notificationBody: plain text for system notifications.
// - isPathInside: whether a path lies inside a directory.

const path = require('path');
const { sanitizeText } = require('hugin-p2p/sanitize');

const EXTERNAL_URL_PROTOCOLS = new Set(['https:', 'http:']);
const MAX_URL_LENGTH = 4096;

/**
 * Returns the normalized href when `value` parses as an absolute http(s) URL with a host,
 * otherwise null. Every other scheme (file:, javascript:, smb:, custom handlers ...) is refused.
 */
function externalUrl(value) {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim();
	if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) return null;
	let url;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}
	if (!EXTERNAL_URL_PROTOCOLS.has(url.protocol)) return null;
	if (!url.hostname) return null;
	return url.href;
}

const HEX64 = /^[0-9a-f]{64}$/i;

function isHex64(value) {
	return typeof value === 'string' && HEX64.test(value);
}

// C0/C1 controls (except tab and newline), zero-width and bidi override characters.
const INVISIBLE = /[\u0000-\u0008\u000B-\u001F\u007F-\u009F​-‏‪-‮⁠-⁩﻿]/g;

function plainText(value, max) {
	let text = value === undefined || value === null ? '' : String(value);
	text = sanitizeText(text);
	if (typeof text !== 'string') text = '';
	text = text.replace(INVISIBLE, '');
	if (text.length > max) text = text.slice(0, max) + '…';
	return text;
}

function escapeMarkup(text) {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** Notification summary: plain text without angle brackets. */
function notificationTitle(value, max = 100) {
	return plainText(value, max).replace(/[<>]/g, '');
}

/**
 * Notification body: markup removed, then escaped where the notification server interprets
 * body markup (freedesktop servers on Linux), so the text is shown as text.
 */
function notificationBody(value, max = 300, platform = process.platform) {
	const text = plainText(value, max);
	return platform === 'linux' ? escapeMarkup(text) : text;
}

/** True when `child` resolves to `parent` itself or a path below it. */
function isPathInside(parent, child) {
	if (typeof parent !== 'string' || typeof child !== 'string') return false;
	if (parent.length === 0 || child.length === 0) return false;
	const rel = path.relative(path.resolve(parent), path.resolve(child));
	if (rel === '') return true;
	if (rel === '..' || rel.startsWith('..' + path.sep)) return false;
	return !path.isAbsolute(rel);
}

module.exports = {
	externalUrl,
	isHex64,
	notificationTitle,
	notificationBody,
	isPathInside,
	EXTERNAL_URL_PROTOCOLS
};
