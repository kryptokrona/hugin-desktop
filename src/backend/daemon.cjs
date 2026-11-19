'use strict';

// The wallet's daemon: an HTTP node (`host:port`), or an xkrd node over Hyperswarm
// (hugin-network/xkr-daemon) for the node `hyperswarm` or a private node's invite (`xkr:…`).
// Without a saved node the wallet takes a local node when one answers, else Hyperswarm.

const WB = require('kryptokrona-wallet-backend-js');
const { default: fetch } = require('electron-fetch');
const { XkrDaemonRequester } = require('hugin-network/xkr-daemon');

/** The node name that means "an xkrd node found over Hyperswarm". */
const SWARM_NODE = 'hyperswarm';
/** The local node tried first. */
const LOCAL_NODE = { node: '127.0.0.1', port: 11898 };

/** Whether `node` (the saved host or what the user typed) goes over Hyperswarm. */
function isSwarmNode(node) {
	return node === SWARM_NODE || (typeof node === 'string' && node.startsWith('xkr:'));
}

/** `{ node, port }` of what the user typed: `host:port`, `hyperswarm` or an invite. */
function parseNodeInput(text) {
	const s = String(text).trim();
	const i = s.lastIndexOf(':');
	const host = s.slice(0, i);
	// `hyperswarm:0` and `xkr:…:0` as wallet.cjs writes a saved node back
	if (isSwarmNode(s) && !isSwarmNode(host)) return { node: s, port: 0 };
	if (isSwarmNode(host)) return { node: host, port: 0 };
	return { node: host, port: parseInt(s.slice(i + 1)) };
}

/** Whether a node answers `/info` on 127.0.0.1:11898 within `ms`. */
async function localNodeAnswers(ms = 2000) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), ms);
	try {
		const res = await fetch(`http://${LOCAL_NODE.node}:${LOCAL_NODE.port}/info`, { signal: controller.signal, timeout: ms });
		return res.ok;
	} catch (e) {
		return false;
	} finally {
		clearTimeout(timer);
	}
}

/** The node to use when none is saved: the local node, else Hyperswarm. */
async function defaultNode() {
	return (await localNodeAnswers()) ? { ...LOCAL_NODE } : { node: SWARM_NODE, port: 0 };
}

let requester = null;

/**
 * A wallet-backend-js daemon for `node:port`; a Hyperswarm node closes the previous requester
 * and opens a new one (`options` go to XkrDaemonRequester, for tests).
 */
function makeDaemon(node, port, options = {}) {
	if (requester) {
		requester.close().catch(() => {});
		requester = null;
	}
	if (!isSwarmNode(node)) return new WB.Daemon(node, port);
	requester = new XkrDaemonRequester({
		network: 'mainnet',
		invite: node === SWARM_NODE ? undefined : node,
		client: 'hugin-desktop',
		...options,
	});
	return WB.Daemon.withRequester(requester);
}

/** Closes the Hyperswarm requester, if one is open. */
async function closeDaemon() {
	if (requester) await requester.close();
	requester = null;
}

module.exports = { SWARM_NODE, LOCAL_NODE, isSwarmNode, parseNodeInput, localNodeAnswers, defaultNode, makeDaemon, closeDaemon };
