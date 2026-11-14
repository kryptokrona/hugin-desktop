'use strict';

// src/backend/validate.cjs under plain Node: `node --test tests/backend/*.test.cjs`.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const V = require('../../src/backend/validate.cjs');

test('externalUrl accepts http and https links', () => {
	assert.equal(V.externalUrl('https://example.com/a?b=1#c'), 'https://example.com/a?b=1#c');
	assert.equal(V.externalUrl('http://example.com'), 'http://example.com/');
	assert.equal(V.externalUrl('  https://example.com/x  '), 'https://example.com/x');
	assert.equal(V.externalUrl('HTTPS://EXAMPLE.COM/'), 'https://example.com/');
});

test('externalUrl refuses every other scheme and malformed input', () => {
	for (const url of [
		'file:///tmp/a.txt',
		'file://host/share/a.txt',
		'FILE:///C:/a.txt',
		'javascript:void(0)',
		'smb://host/share',
		'mailto:a@example.com',
		'ftp://example.com/x',
		'data:text/html,hi',
		'vbscript:x',
		'ms-settings:',
		'//example.com',
		'example.com',
		'https://',
		'',
		'   ',
		'https://' + 'a'.repeat(5000) + '.com'
	]) {
		assert.equal(V.externalUrl(url), null, url);
	}
	for (const value of [undefined, null, 42, {}, ['https://example.com']]) {
		assert.equal(V.externalUrl(value), null);
	}
});

test('isHex64', () => {
	assert.equal(V.isHex64('ab'.repeat(32)), true);
	assert.equal(V.isHex64('AB'.repeat(32)), true);
	assert.equal(V.isHex64('ab'.repeat(31)), false);
	assert.equal(V.isHex64('ab'.repeat(33)), false);
	assert.equal(V.isHex64('not a hash'), false);
	assert.equal(V.isHex64('g'.repeat(64)), false);
	assert.equal(V.isHex64('ab'.repeat(32) + '\n'), false);
	assert.equal(V.isHex64(undefined), false);
	assert.equal(V.isHex64(123), false);
});

test('notificationBody removes markup and escapes on linux', () => {
	const input = '<b>x</b> <a href="https://example.com">y</a> <img src="https://example.com/p.png">';
	const linux = V.notificationBody(input, 300, 'linux');
	assert.equal(linux.includes('<'), false);
	assert.equal(linux.includes('>'), false);
	assert.equal(linux.includes('img'), false);
	assert.equal(linux.trim(), 'x y');
	// Entities decode to text and are then escaped again.
	assert.equal(V.notificationBody('&lt;b&gt;hi&lt;/b&gt; & co', 300, 'linux'), '&lt;b&gt;hi&lt;/b&gt; &amp; co');
	assert.equal(V.notificationBody('&lt;b&gt;hi&lt;/b&gt;', 300, 'win32'), '<b>hi</b>');
	assert.equal(V.notificationBody('a\u202Eb\u0007c', 300, 'win32'), 'abc');
	assert.equal(V.notificationBody('x'.repeat(400), 10, 'win32'), 'x'.repeat(10) + '…');
	assert.equal(V.notificationBody(undefined, 300, 'linux'), '');
});

test('notificationTitle is plain text without angle brackets', () => {
	assert.equal(V.notificationTitle('<b>nils</b>'), 'nils');
	assert.equal(V.notificationTitle('&lt;i&gt;nils'), 'inils');
	assert.equal(V.notificationTitle(null), '');
});

test('isPathInside', () => {
	const root = path.resolve('/tmp/hugin-root');
	assert.equal(V.isPathInside(root, path.join(root, 'a.png')), true);
	assert.equal(V.isPathInside(root, path.join(root, 'sub', 'a.png')), true);
	assert.equal(V.isPathInside(root, path.join(root, '..foo')), true);
	assert.equal(V.isPathInside(root, root), true);
	assert.equal(V.isPathInside(root, path.join(root, '..', 'x')), false);
	assert.equal(V.isPathInside(root, path.resolve('/var/a.txt')), false);
	assert.equal(V.isPathInside(root, root + '-other/x'), false);
	assert.equal(V.isPathInside(root, ''), false);
	assert.equal(V.isPathInside('', root), false);
});
