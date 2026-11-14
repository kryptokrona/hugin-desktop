// Upstream hyperswarm/hyperdht with the Hugin `mid` in the Noise handshake (signed with the
// topic base key, verified both ways; peers without a valid mid are refused), see
// hugin-p2p/swarm.
const { createHuginSwarm } = require('hugin-p2p/swarm');
// Swarm keys, admin signatures and the idSig check (hugin-p2p/keys), PoW for hugin-node
// (hugin-p2p/pow) and hugin-node packets (hugin-p2p/push).
const keys = require('hugin-p2p/keys');
const pow = require('hugin-p2p/pow');
const push = require('hugin-p2p/push');
// Validation and building of hugin-messages traffic (hugin-p2p/sanitize + hugin-p2p/wire),
// mapped to the shapes the renderer and the database expect.
const P2PWire = require('./p2p-wire.cjs');

const {
	sleep,
	check_hash,
	randomKey,
	check_if_media,
	logPow,
	mini_message,
	register_user_file
} = require('./utils.cjs');
const {
	saveGroupMsg,
	getChannels,
	loadRoomKeys,
	removeRoom,
	printGroup,
	groupMessageExists,
	getLatestRoomHashes,
	roomMessageExists,
	getGroupReply,
	saveMsg,
	saveFeedMessage,
	printFeed,
	feedMessageExists,
	saveRoomUser
} = require('./database.cjs');
const { app, ipcMain } = require('electron');
const { keychain, signMessage, verifySignature, decrpyt_beam_message } = require('./crypto.cjs');

const LOCAL_VOICE_STATUS_OFFLINE = {
	voice: false,
	video: false,
	topic: '',
	videoMute: false,
	audioMute: false,
	screenshare: false
};

const { Hugin } = require('./account.cjs');
const { Storage } = require('./storage.cjs');
// The nonce search runs in hugin-utils' worker processes (several cores, off the Electron main
// thread). Found shares are checked with hugin-p2p/pow `verifyShare` before they are posted.
const { createChallenge } = require('hugin-utils/challenge');
const { Crypto } = require('kryptokrona-utils');
const RPC = require('bare-rpc');
const b4a = require('b4a');
const Protomux = require('protomux');
const c = require('compact-encoding');

let started = false;

const ONE_DAY = 24 * 60 * 60 * 1000;

const EventEmitter = require('bare-events');

let localFiles = [];
let active_swarms = [];
let active_voice_channel = LOCAL_VOICE_STATUS_OFFLINE;

const challenge = createChallenge();
// CN-Turtle-Lite v2, the hash hook of hugin-p2p/pow (the same function the workers run).
const xkrCrypto = new Crypto();
const powHash = async (blobHex) => String(await xkrCrypto.cn_turtle_lite_slow_hash_v2(blobHex)).toLowerCase();

// A DM swarm admits one peer (maxPeers 1). A connection that has not proven to be the contact
// (verified idSig of the contact's address in `joined`) within this time is closed.
const DM_JOIN_TIMEOUT_MS = 30000;

const RPC_COMMANDS = Object.freeze({
	PACKET: 1
});

process.on('uncaughtException', (err) => {
	console.log('Caught an unhandled exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
	console.log('Unhandled Rejection at:', promise, 'reason:', reason);
});

class NodeConnection extends EventEmitter {
	constructor() {
		super();
		this.node = null;
		this.connection = null;
		this.rpc = null;
		this.requests = new Map();
		this.discovery = null;
		this.pending = [];
		this.public = 'xkr96c0f8a36e951b399681d447922f6c54c28c6ef3cad1c65d3568008151337';
		this.topic = '';
		this.address = null;
		this.currentJob = null;
	}

	async connect(address, pub) {
		//If we choose the public option. We connect to the first responding node.
		//in the public network.
		const node = { address, pub };
		const key = keys.nodeSwarmKey(node);
		const { swarm, topic } = createHuginSwarm({
			key,
			keyPair: keys.newPeerKeys(key).keyPair,
			maxPeers: 1,
			firewall(remotePublicKey) {
				console.log('remotePublicKey', remotePublicKey.toString('hex'));
				//Any node on the public network; a private node only with the public key in the
				//last 64 characters of its address.
				return !keys.isAllowedNodePeer(remotePublicKey, node);
			}
		});
		this.node = swarm;

		this.listen();
		// Buffer.alloc(32).fill(hex(base public key)), derived by hugin-p2p/swarm.
		this.topic = topic;
		this.discovery = this.node.join(topic, { server: false, client: true });
	}

	async listen() {
		this.node.on('connection', (conn, info) => {
			if (this.connection) {
				try {
					conn.end();
					conn.destroy();
				} catch (e) {}
				return;
			}
			this.node_connection(conn);
		});

		process.once('SIGINT', function () {
			this.node.on('close', function () {
				process.exit();
			});
			this.node.destroy();
			setTimeout(() => process.exit(), 2000);
		});
	}
	async node_connection(conn) {
		this.connection = conn;
		this.rpc = new RPC(conn, (req) => {
			const data = this.parse(b4a.toString(req.data));
			if (data) this.handle_node_packet(data);
			req.reply(JSON.stringify({ ok: true, data: null, error: null }));
		});
		this.emit('connected');
		Hugin.send('hugin-node-connection', true);
		conn.on('error', (error) => {
			if (error?.code === 'ETIMEDOUT') {
				console.log('Node connection timed out, reconnecting');
			} else {
				console.log('Got error connection signal', error);
			}
			conn.end();
			conn.destroy();
			this.connection = null;
			this.reconnect();
		});

		conn.on('data', () => {});
	}

	handle_node_packet(data) {
		console.log('Data from node', data);
		const packet = push.parseNodePacket(data);
		if (packet.kind === 'invalid') return;

		if (packet.kind === 'messages') {
			Nodes.emit('new-message', packet.messages);
			return;
		}

		if (packet.kind === 'address') {
			this.address = packet.address;
			Hugin.send('hugin-node-address', packet.address);
			return;
		}
		// An address that is not 99 characters is ignored.
		if (packet.kind === 'ignored' && packet.reason === 'address') return;

		const pending = this.requests.get(data.id);

		// Unsolicited job push (no pending request id)
		if (packet.kind === 'job' && !pending) {
			logPow('job_push', { type: data.type, jobId: data.job?.job_id });
			this.accept_job(packet);
			return;
		}

		if (!pending) return;
		const { resolve } = pending;

		if (packet.kind === 'chunk') {
			this.pending.push(packet.response);
			return;
		}

		if (packet.kind === 'done') {
			resolve(this.pending);
		} else if (packet.kind === 'result') {
			resolve(data);
		} else if (packet.kind === 'job' || packet.kind === 'job_pending') {
			// Job response from node
			logPow('job_response', { id: data.id, type: data.type, jobId: data.job?.job_id });
			if (packet.kind === 'job') this.accept_job(packet);
			resolve(data);
		} else {
			resolve(data.response);
		}
		this.requests.delete(data.id);
	}

	// A job is used only if it passes hugin-p2p/pow `validatePowJob` (parseNodePacket ran it).
	accept_job(packet) {
		if (packet.valid) {
			this.set_job(packet.job);
		} else {
			logPow('job_reject', { reason: packet.reason });
		}
	}

	async change(address, pub) {
		Hugin.send('hugin-node-connection', false);

		if (this.connection !== null) {
			try {
				this.connection.end();
				this.connection.destroy();
			} catch (e) {}
			this.connection = null;
		}
		this.rpc = null;
		this.requests = new Map();
		this.pending = [];

		if (this.discovery) {
			try {
				await this.discovery.destroy();
			} catch (e) {}
			this.discovery = null;
		}
		if (this.node) {
			try {
				if (this.topic) {
					await this.node.leave(Buffer.from(this.topic));
				}
			} catch (e) {}
			try {
				await this.node.destroy();
			} catch (e) {}
		}
		this.node = null;
		this.address = null;
		this.topic = '';

		console.log('Connecting to node...');

		this.connect(address, pub);
	}

	async reconnect() {
		let i = 0;
		while (this.connection === null) {
			if (i % 20 === 0) {
				console.log(`Reconnecting to node... (attempt ${i})`);
			}
			if (this.discovery) {
				this.discovery.refresh({ client: true, server: false });
			}
			await sleep(10000);
			i++;
		}
		return;
	}

	send_packet(packet) {
		if (!this.rpc) return false;
		try {
			// encodePacket refuses bodies above 9000 bytes (hugin-node bans the sender of one).
			const body = push.encodePacket(packet);
			const req = this.rpc.request(RPC_COMMANDS.PACKET);
			req.send(body);
			req.reply().catch(() => {});
			return true;
		} catch (e) {
			return false;
		}
	}

	sync(data) {
		if (!this.connection) return [];
		return new Promise((resolve, reject) => {
			// If the node response is dropped (stream parsing), don't hang the background sync loop forever.
			this.pending = [];
			// push.syncRequest sets id = timestamp; anything else gets one here.
			const id =
				data.id !== undefined && data.id !== null
					? data.id
					: data.timestamp !== undefined && data.timestamp !== null
						? data.timestamp
						: Date.now();
			data.id = id;
			this.requests.set(id, { resolve, reject });
			if (!this.send_packet(data)) {
				this.requests.delete(id);
				resolve([]);
			}
			setTimeout(() => {
				if (!this.requests.has(id)) return;
				this.requests.delete(id);
				resolve([]);
			}, 2000);
		});
	}

	parse(d) {
		try {
			return JSON.parse(d);
		} catch (e) {
			return false;
		}
	}

	async register(data) {
		try {
			if (this.connection === null) {
				await this.reconnect();
				await sleep(5000);
			}
			if (!this.connection) return { success: false, reason: 'No connection' };

			const request_id = Date.now();
			const message_hash = randomKey();
			return await this.post_with_pow('register', {
				message_hash,
				request_id,
				context: pow.registerAuthContext(data),
				build: (powField) =>
					push.registerPacket({ data, timestamp: request_id, hash: message_hash, pow: powField })
			});
		} catch (e) {
			logPow('pow_register_error', { message: e && e.message });
			return { success: false, reason: 'register_exception' };
		}
	}

	set_job(job) {
		if (!job || !job.job_id) return;
		if (this.currentJob && this.currentJob.job_id === job.job_id) return;
		this.currentJob = job;
		challenge.setJob(job);
		logPow('job_set', { jobId: job.job_id });
	}

	// Request a challenge job template from the node.
	async request_job() {
		if (!this.connection) return null;
		return new Promise((resolve, reject) => {
			const id = randomKey();
			this.requests.set(id, { resolve, reject });
			const sent = this.send_packet(push.jobRequest(id));
			if (!sent) {
				this.requests.delete(id);
				resolve(null);
				return;
			}
			logPow('job_request', { id });
			// Timeout after 10s
			setTimeout(() => {
				if (this.requests.has(id)) {
					this.requests.delete(id);
					logPow('job_request_timeout', { id });
					resolve(null);
				}
			}, 10000);
		});
	}

	// Sends a post/registration and waits up to 60 s for the node's answer.
	async send_request(request_id, packet) {
		if (!this.connection) {
			this.reconnect();
			await sleep(5000);
		}
		return await new Promise((resolve, reject) => {
			this.requests.set(request_id, { resolve, reject });
			if (!this.send_packet(packet)) {
				this.requests.delete(request_id);
				resolve({ success: false, reason: 'write_failed' });
				return;
			}
			setTimeout(() => {
				if (!this.requests.has(request_id)) return;
				this.requests.delete(request_id);
				resolve({ success: false, reason: 'timeout' });
			}, 60000);
		});
	}

	// Posts a packet that carries proof of work: up to three attempts, plus up to three more when
	// the node refused the share itself (a new share is searched for). Which answers are worth
	// another attempt, which need a new share and how long to wait (1 s after `cooldown` or
	// `rate_limit`) is hugin-p2p/pow's policy. `build(powField)` returns the packet.
	async post_with_pow(label, { message_hash, request_id, context, build }) {
		const max_attempts = 3;
		const max_stale_share_retries = 3;
		let last_res = { success: false, reason: 'unknown' };
		let stale_share_retries = 0;
		for (let attempt = 1; attempt <= max_attempts; attempt++) {
			let found = null;
			try {
				found = await this.challenge(message_hash);
				if (found && found.shares) {
					logPow(`pow_${label}_ready`, { jobId: found.job?.job_id, shares: found.shares.length });
				}
			} catch (e) {
				logPow('pow_error', { message: e && e.message });
			}
			if (!found || !found.shares || found.shares.length === 0) {
				logPow(`pow_${label}_retry`, { attempt, reason: 'no_shares' });
				this.currentJob = null;
				const jobResponse = await this.request_job();
				if (jobResponse && jobResponse.job) this.set_job(jobResponse.job);
				last_res = { success: false, reason: 'PoW required' };
				continue;
			}

			// powsig:v2 auth over shares[0], signed with a one-time ed25519 key.
			const auth = pow.buildPowAuth({
				hash: message_hash,
				timestamp: request_id,
				shares: found.shares,
				context
			});
			if (!auth) {
				logPow(`pow_${label}_retry`, { attempt, reason: 'pow_auth_failed' });
				await sleep(100);
				continue;
			}

			let packet;
			try {
				packet = build(pow.powField({ job: found.job, shares: found.shares, auth }));
				push.encodePacket(packet);
			} catch (e) {
				logPow(`pow_${label}_error`, { message: e && e.message });
				return { success: false, reason: e && e.field === 'size' ? 'packet_too_large' : 'invalid_packet' };
			}

			const res = await this.send_request(request_id, packet);
			if (res && res.success === true) return res;

			last_res = res || { success: false, reason: 'unknown' };
			if (!pow.shouldRetry(last_res)) break;

			const recalc = pow.shouldRecalcShare(last_res);
			if (recalc && stale_share_retries < max_stale_share_retries) {
				stale_share_retries++;
				logPow(`pow_${label}_recalc`, {
					attempt,
					stale_share_retries,
					reason: last_res.reason,
					jobId: found.job && found.job.job_id
				});
				attempt--;
			}

			logPow(`pow_${label}_retry`, {
				attempt,
				reason: last_res.reason,
				jobId: found.job && found.job.job_id
			});
			this.currentJob = null;
			const jobResponse = await this.request_job();
			if (jobResponse && jobResponse.job) this.set_job(jobResponse.job);
			await sleep(pow.retryDelayMs(last_res));
		}
		return last_res;
	}

	// Finds one share for the current job. The search runs in hugin-utils' worker processes; a
	// share they report is checked with hugin-p2p/pow `verifyShare` (CN-Turtle-Lite v2 of the
	// blob with the nonce must equal the result and meet the target) before it is used.
	async challenge(message_hash) {
		if (!this.connection) return null;

		const start = Date.now();
		const shares = [];
		let miningJob = null;

		const freshJob = await this.request_job();
		if (freshJob && freshJob.job) this.set_job(freshJob.job);

		while (Date.now() - start < pow.POW_MAX_JOB_TIME_MS && shares.length < pow.POW_REQUIRED_SHARES) {
			if (!challenge.hasJob()) {
				await sleep(250);
				continue;
			}

			const remaining = pow.POW_MAX_JOB_TIME_MS - (Date.now() - start);
			if (remaining <= 0) break;

			const jobSnapshot = { ...challenge.currentJob };
			const share = pow.normalizeShare(await challenge.findShare(Math.min(remaining, 30000)));

			if (share && (await this.share_verifies(jobSnapshot, share))) {
				miningJob = jobSnapshot;
				shares.push(share);
			} else {
				const res = await this.request_job();
				if (res && res.job) this.set_job(res.job);
			}
		}

		if (shares.length >= pow.POW_REQUIRED_SHARES && miningJob) {
			return { job: miningJob, shares };
		}
		return null;
	}

	async share_verifies(job, share) {
		try {
			if (await pow.verifyShare(job, share.nonce, share.result, powHash)) return true;
			logPow('share_rejected', { jobId: job.job_id, nonce: share.nonce });
			return false;
		} catch (e) {
			// The hash itself failed in this process: keep the share as found by the workers
			// (the node checks it anyway) instead of blocking every post.
			logPow('share_check_error', { message: e && e.message });
			return true;
		}
	}

	async message(payload, viewtag, kind = 'dm', hash = randomKey()) {
		try {
			if (!this.connection) {
				this.reconnect();
				return { success: false, reason: 'No connection to node' };
			}

			const request_id = Date.now();
			// Keep hash stable across retries to avoid duplicates.
			const message_hash = hash;
			const post = { cipher: payload, hash: message_hash, viewtag, kind, timestamp: request_id };
			try {
				// Checked before any PoW is spent (hex cipher of at most 9000 characters, hash, kind).
				push.postMessage(post);
			} catch (e) {
				logPow('pow_message_error', { message: e && e.message });
				return { success: false, reason: 'invalid_message' };
			}

			return await this.post_with_pow('message', {
				message_hash,
				request_id,
				context: pow.postAuthContext(kind, payload),
				build: (powField) => push.postPacket({ ...post, pow: powField })
			});
		} catch (e) {
			logPow('pow_message_error', { message: e && e.message });
			return { success: false, reason: 'message_exception' };
		}
	}
}
const Nodes = new NodeConnection();

const create_swarm = async (data, beam, chat) => {
	let discovery;
	let swarm;
	//SHA-512 of the hex bytes: rooms hash the invite, DMs the key derivation hash.
	const key = beam ? keys.dmSwarmKey(data.key) : keys.roomSwarmKey(data.key);
	const invite = data.key;
	const [admin] = is_room_admin(data.key);
	//A fresh DHT key pair for this swarm and the topic of the key.
	const peerKeys = keys.newPeerKeys(key);
	const topicHash = b4a.toString(peerKeys.basePublicKey, 'hex');
	if (active_swarms.some((a) => a.topic === topicHash)) return true;
	await Storage.load_drive(topicHash);
	const files = await Storage.load_meta(topicHash);
	const peers = beam ? 1 : 100;
	//A DM swarm has one slot (maxPeers 1) and admits only the contact. Everyone who knows the
	//key derivation hash (the contact's devices and our own other devices) passes the Hugin
	//`mid` check, and the DHT key of a peer is random per swarm, so the firewall cannot tell the
	//contact from anyone else before connecting. The identity is checked when `joined` arrives
	//(verified idSig of the contact's address); a peer that fails it is refused here from then
	//on, see check_joined.
	const contact = beam ? String(chat).substring(0, 99) : null;
	const refused = new Set();
	const firewall = beam
		? (remotePublicKey) => refused.has(b4a.toString(remotePublicKey, 'hex'))
		: undefined;
	//The swarm uses the dht key pair; hugin-p2p/swarm sends its mid (signed with the topic base
	//key) in every handshake and refuses peers whose mid does not verify.
	let topic;
	try {
		({ swarm, topic } = createHuginSwarm({ key, keyPair: peerKeys.keyPair, maxPeers: peers, firewall }));
	} catch (e) {
		console.log('Error starting swarm', e);
		return false;
	}

	const startTime = Date.now().toString();

	//The topic is public so lets use the pubkey from the new base keypair

	active_swarms.push({
		key: invite,
		topic: topicHash,
		connections: [],
		call: [],
		time: startTime,
		invite: data.key,
		swarm,
		discovery,
		admin,
		requests: 0,
		search: true,
		request: false,
		peers: [],
		files,
		beam,
		chat,
		contact,
		refused
	});

	if (beam && !Hugin.syncImages.some(a => a === topicHash)) {
		Hugin.syncImages = [...Hugin.syncImages, topicHash];
		const Store = require('electron-store');
		const store = new Store();
		store.set({ syncImages: Hugin.syncImages });
	}

	Hugin.send(
		'swarm-connected',
		JSON.stringify({
			topic: topicHash,
			key: invite,
			channels: [],
			voice_channel: new Map(),
			connections: [],
			time: startTime,
			admin,
			beam,
			chat: beam ? chat.substring(0, 99) : ''
		})
	);


	Hugin.send('set-channels');

	swarm.on('connection', (connection, information) => {
		try {
			new_connection(connection, topicHash, peerKeys.keyPair, information, beam);
		} catch (error) {
			console.log('Failed to initialize swarm connection', error);
			connection_closed(connection, topicHash, true);
		}
	});

	process.once('SIGINT', function () {
		swarm.on('close', function () {
			process.exit();
		});
		swarm.destroy();
		setTimeout(() => process.exit(), 2000);
	});
	// topic = Buffer.alloc(32).fill(topicHash), derived by hugin-p2p/swarm.
	discovery = swarm.join(topic, { server: true, client: true });
	await discovery.flushed();
	check_online_state(topicHash);
};

const end_swarm = async (key, beam = false) => {
	let active = get_active(key);
	if (beam) active = get_beam(key);
	if (!active) return;
	const topic = active.topic;
	Hugin.send('swarm-disconnected', topic);
	const [in_voice] = get_local_voice_status(topic);
	if (in_voice) {
		update_local_voice_channel_status(LOCAL_VOICE_STATUS_OFFLINE);
	}

	//Through the hugin-messages channel (a raw write on the stream is not read by peers), with a
	//short pause so the message can leave before the connections close.
	const connections = active.connections.slice();
	if (connections.length) {
		const bye = P2PWire.disconnectedOut();
		for (const chat of connections) chat.write(bye);
		await sleep(200);
	}
	connections.forEach((chat) => connection_closed(chat.connection, topic));

	await active.swarm.leave(Buffer.from(topic));
	await active.swarm.destroy();

	const still_active = active_swarms.filter((a) => a.topic !== topic);
	active_swarms = still_active;
	console.log('***** Ended swarm *****');
};

const new_connection = (connection, topic, keyPair, peer, beam) => {
	console.log('New connection incoming');
	let active = get_active_topic(topic);

	if (!active) {
		console.log('no longer active in topic');
		connection_closed(connection, topic);
		return;
	}

	if (beam) {
	console.log('*****************************************');
	console.log('***********NEW BEAM CONNECTION!**********');
	console.log('*****************************************');
	} else {
	console.log('*****************************************');
	console.log('***********NEW CONNECTION!***************');
	console.log('*****************************************');
	}

	const connEntry = {
		connection,
		topic: topic,
		voice: false,
		name: '',
		address: '',
		video: false,
		peer,
		request: false,
		knownHashes: [],
		publicKey: connection.remotePublicKey.toString('hex'),
		driveKey: null,
		msgType: null,
		//Set once `joined` passed the idSig check (and, in a DM swarm, is the contact).
		identityVerified: false,
		joining: null,
		joinTimer: null,
		//Everything goes through the hugin-messages channel; objects are encoded with the 2 MiB guard.
		write(data) {
			if (!this.msgType) return;
			try {
				const str = typeof data === 'string' ? data : P2PWire.encode(data);
				this.msgType.send(str);
			} catch (e) {
				console.log('Could not send to peer', e && e.message);
			}
		}
	};

	active.connections.push(connEntry);

	if (beam) {
		connEntry.joinTimer = setTimeout(() => {
			if (connEntry.identityVerified) return;
			console.log('DM peer did not identify as the contact in time, closing');
			connection_closed(connection, topic);
		}, DM_JOIN_TIMEOUT_MS);
	}

	const mux = Protomux.from(connection);
	const channel = mux.createChannel({ protocol: 'hugin-messages' });
	const msgType = channel.addMessage({
		encoding: c.string,
		onmessage: async (data) => {
			try {
				await incoming_message(data, topic, connection, peer, beam);
			} catch (error) {
				console.log('Incoming message handler failed', error);
				connection_closed(connection, topic, true);
			}
		}
	});
	channel.open();
	connEntry.msgType = msgType;
	Storage.replicate(connection, topic);

	send_joined_message(topic, keyPair, connection).catch((error) => {
		console.log('Failed to send joined message', error);
		connection_closed(connection, topic, true);
	});

	connection.on('close', () => {
		console.log('Got close signal');
		connection_closed(connection, topic);
	});

	connection.on('error', (error) => {
		if (error.code === 'ETIMEDOUT') {
			console.log('Connection timed out, closing peer connection');
		} else {
			console.log('Got error connection signal', error);
		}
		connection_closed(connection, topic, true);
	});
};

const connection_closed = (conn, topic, error = false) => {
	console.log('Closing connection...');
	const active = get_active_topic(topic);
	if (!active) return;
	try {
		conn.end();
		conn.destroy();
	} catch (e) {
		console.log('failed close connection');
	}
	const user = active.connections.find((a) => a.connection === conn);
	if (!user) return;
	if (user.joinTimer) clearTimeout(user.joinTimer);
	Hugin.send('close-voice-channel-with-peer', user.address);
	Hugin.send('peer-disconnected', { address: user.address, topic });
	const connection = active.connections.find((a) => a.connection === conn);
	const removedPeer = active.peers.filter((a) => a !== connection?.publicKey);
	active.peers = removedPeer;
	const still_active = active.connections.filter((a) => a.connection !== conn);
	console.log('Connection closed');
	console.log('Still active:', still_active.length);
	active.connections = still_active;
};

//`to` is the peer the SDP is for; the message carries our own address as the sender.
async function send_voice_channel_sdp({ to, data, offer, topic, retry }) {
	const active = active_swarms.find((a) => a.topic === topic);
	if (!active) return;
	const con = active.connections.find((a) => a.address === to);
	if (!con) return;
	let message;
	try {
		message = P2PWire.sdpOut({ data, offer, address: Hugin.address, topic, retry });
	} catch (e) {
		console.log('SDP not sent:', e.message);
		return;
	}
	con.write(message);
}

const send_voice_channel_status = async (joined, status, update = false) => {
	let active = active_swarms.find((a) => a.key === status.key);
	if (!active) return;
	const sig = await signMessage(
		P2PWire.voiceSigningPayload(active.topic),
		keychain.getXKRKeypair().privateSpendKey
	);
	let data = null;
	try {
		data = P2PWire.voiceStatusOut({
			address: Hugin.address,
			avatar: Hugin.avatar,
			signature: sig,
			voice: joined,
			topic: active.topic,
			name: Hugin.nickname,
			video: status.video,
			audioMute: status.audioMute,
			videoMute: status.videoMute,
			screenshare: status.screenshare
		});
	} catch (e) {
		console.log('Voice status not sent:', e.message);
	}
	update_local_voice_channel_status({
		topic: active.topic,
		voice: joined,
		audioMute: status.audioMute,
		videoMute: status.videoMute,
		screenshare: status.screenshare,
		video: status.video
	});

	//Send voice channel status to others in the group
	if (data) send_swarm_message(data, status.key);

	if (update) return;
	//If we joined the voice channel, make a call to those already announced their joined_voice_status
	if (joined) {
		//If no others active in the voice channel, return
		if (!active.connections.some((a) => a.voice === true)) return;
		//Check whos active and call them individually
		let active_voice = active.connections.filter((a) => a.voice === true && a.address);
		active_voice.forEach(async function (user) {
			await sleep(100);
			//Call to VoiceChannel.svelte
			join_voice_channel(status.key, active.topic, user);
		});
	}
};

const join_voice_channel = (key, topic, user) => {
	Hugin.send('join-voice-channel', { 
		key, 
		topic, 
		address: user.address, 
		name: user.name,
		audioMute: user.audioMute,
		videoMute: user.videoMute,
		screenshare: user.screenshare,
		video: user.video 
	});
};

const admin_ban_user = async (address, key) => {
	const active = get_active(key);
	if (!active) return;
	try {
		const message = P2PWire.banOut(address);
		//Through the hugin-messages channel (a raw write on the stream is not read by peers).
		active.connections.forEach((chat) => chat.write(message));
	} catch (e) {
		console.log('Ban not sent:', e.message);
	}
	await sleep(200);
	ban_user(address, active.topic);
};

const ban_user = async (address, topic) => {
	const active = get_active_topic(topic);
	if (!active) return;
	Hugin.ban(address, topic);
	const conn = active.connections.find((a) => a.address === address);
	if (conn) return;
	conn.peer.ban(true);
	await sleep(200);
	connection_closed(conn.connection, topic);
};

const new_swarm = async (data, beam = false, chat = false) => {
	return await create_swarm(data, beam, chat);
};

const update_local_voice_channel_status = (data) => {
	const updated = data;
	active_voice_channel = updated;
	return true;
};

const get_active_topic = (topic) => {
	const active = active_swarms.find((a) => a.topic === topic);
	if (!active) return false;
	return active;
};

//Validates (hugin-p2p `wire.decode`) and dispatches one message from a peer. Returns 'Ban' (ban
//the peer in this swarm and close the connection), 'Error' (close it) or anything else
//(handled or ignored). Whether a malformed message is a reason to ban comes from the library.
const check_data_message = async (data, connection, topic, peer, beam) => {
	const decoded = P2PWire.decode(data, { dm: beam });

	//Check if active in this topic
	const active = get_active_topic(topic);
	if (!active) return 'Error';

	//Check if this connection is still in our list
	const con = active.connections.find((a) => a.connection === connection);
	if (!con) return 'Error';

	//Unknown types, newer wire versions, oversized frames.
	if (decoded.type === 'ignored') return true;

	if (decoded.type === 'invalid') {
		//A JSON value that is not an object (null, a number, an array).
		if (decoded.reason === 'not_object') return 'Error';
		//Typed messages are only looked at once the peer has joined.
		if (decoded.kind && !P2PWire.PRE_JOIN_KINDS.includes(decoded.kind) && !con.joined) return true;
		if (beam && !con.identityVerified && decoded.kind !== 'joined') return true;
		return decoded.ban ? 'Ban' : true;
	}

	const kind = decoded.type;
	const value = decoded.value;

	//In a DM swarm nothing but `joined` and `disconnected` is accepted before the peer has proven
	//to be the contact. A DM payload that arrives while that check runs waits for its result.
	if (beam && !con.identityVerified && kind !== 'joined' && kind !== 'disconnected') {
		if (kind !== 'dm' || !con.joining) return true;
		await con.joining.catch(() => {});
		if (!con.identityVerified) return true;
	}

	switch (kind) {
		case 'disconnected':
			connection_closed(connection, active.topic);
			return true;
		case 'feed':
			return await check_feed_message(value);
		case 'typing':
			if (con.address) {
				Hugin.send('typing', { typing: value.typing, key: active.key, address: con.address });
			}
			return true;
		case 'file': {
			const fileData = P2PWire.fileMessageIn(value);
			if (!fileData) return 'Ban';
			check_file_message(fileData, topic, con.address, con, beam);
			return true;
		}
		case 'sdp':
			check_sdp(value, active, connection, topic);
			return true;
		case 'joined':
			con.joining = check_joined(value, active, con, connection, topic, peer, beam);
			return await con.joining;
		case 'voice':
			return check_peer_voice_status(value, con) ? true : 'Ban';
	}

	if (!con.joined) return true;

	//A DM payload (hugin-crypto encodeExtra hex) from the contact.
	if (kind === 'dm') {
		decrpyt_beam_message(value);
		return true;
	}

	if (kind === 'ban') return await check_ban(value, active, con, topic);

	//Dont handle requests or messages from blocked users
	if (Hugin.blocked(con.address)) return true;

	switch (kind) {
		case 'request-feed':
			console.log('Got feed request');
			send_feed_history(con.address, topic);
			return true;
		case 'send-feed-history':
			save_feed_history(value.messages);
			return true;
		//Start-up history sync
		case 'request-history':
			if (con.request) {
				console.log('Want to send history file info:');
				send_history(con.address, topic, active.key, active.files);
			}
			return true;
		case 'send-history':
			if (con.request) {
				// process_request(value.messages, active.key, false)
				con.request = false;
				process_files(value, active, con, topic);
			}
			return true;
		//Live syncing from other peers who might have connections to others not established yet by us.
		case 'ping':
			return await check_ping(value, active, con, topic, beam);
		case 'request-messages':
			send_missing_messages(value.hashes, con.address, topic);
			return true;
		case 'missing-messages':
			if (con.request) {
				active.search = false;
				con.request = false;
				process_request(value.messages, active.key, true);
			}
			return true;
		case 'room-message':
			await save_room_message(value);
			return true;
	}
	return true;
};

//`joined`: admin flag, awaited idSig check, and in a DM swarm the contact check.
const check_joined = async (value, active, con, connection, topic, peer, beam) => {
	const joined = P2PWire.joinedIn(value);
	if (!joined) return 'Ban';

	if (Hugin.banned(joined.address, topic)) {
		if (active.admin) admin_ban_user(joined.address, active.key);
		else ban_user(joined.address, topic);
	}
	//Admin flag: the room's admin key (end of the invite) signed this connection's DHT key.
	const admin = keys.verifyAdmin(connection.remotePublicKey, value.signature, active.key);

	//idSig: the sender's XKR spend key signed this connection's DHT key. Awaited, so a peer is
	//admitted only with a verified address.
	const verified = await keys.verifyIdSig(
		{ dhtPublicKey: connection.remotePublicKey, address: value.address, idSig: value.idSig },
		verifySignature
	);
	if (!verified) return 'Ban';

	if (beam && value.address !== active.contact) {
		//A verified Hugin user who is not the contact (for example our own other device): this
		//DM swarm refuses its DHT key from now on (firewall), so the one slot stays free.
		console.log('DM swarm: peer is not the contact, refusing it');
		active.refused.add(con.publicKey);
		return 'Ban';
	}

	con.identityVerified = true;
	if (con.joinTimer) {
		clearTimeout(con.joinTimer);
		con.joinTimer = null;
	}
	con.joined = true;
	con.address = joined.address;
	con.name = joined.name;
	con.voice = joined.voice;
	con.admin = admin;
	con.video = joined.video;
	con.request = true;
	active.peers.push(peer.publicKey.toString('hex'));
	let uniq = {};
	const peers = active.peers.filter((obj) => !uniq[obj] && (uniq[obj] = true));
	active.peers = peers;
	const time = parseInt(joined.time);

	//Room history in `joined` (DM peers send none).
	if (!beam) process_request(joined.messages, active.key, false);

	//If our new connection is also in voice, check who was connected first to decide who creates the offer
	const [in_voice, video] = get_local_voice_status(topic);
	if (con.voice && in_voice && parseInt(active.time) > time) {
		join_voice_channel(active.key, topic, joined.address);
	}

	if (!beam) {
		//Request message history from peer connected before us.
		if (parseInt(active.time) > time && active.requests < 3) {
			request_history(joined.address, topic, active.files);
			active.requests++;
		}
		request_feed(joined.address, topic);
	}

	if (joined.driveKey) {
		con.driveKey = joined.driveKey;
		Storage.add_peer_drive(topic, joined.driveKey, active.key, beam);
	}
	console.log('=======================================');
	console.log('--USER:', con.name, 'JOINED THE ROOM--');
	console.log('=======================================');

	connection_joined(joined, topic, admin);

	return true;
};

const check_feed_message = async (value) => {
	const message = P2PWire.feedMessageIn(value);
	if (!message) return 'Ban';
	const exists = await feedMessageExists(message.hash);
	if (exists) return true;
	//The signature covers the text as it was sent (message + hash).
	const verify = await verifySignature(
		P2PWire.feedSigningPayload(value.message, value.hash),
		value.address,
		value.signature
	);
	if (!verify) return 'Ban';
	await saveFeedMessage(message);
	message.type = 'feed';
	//Forward it as it was signed, so the next peer can verify it too.
	try {
		forward_feed_message(P2PWire.feedOut(value));
	} catch (e) {
		console.log('Feed message not forwarded:', e.message);
	}
	Hugin.send('feed-message', message);
	return true;
};

const check_sdp = (value, active, connection, topic) => {
	//Check if this connection has voice status activated.
	if (!active.connections.some((a) => a.connection === connection && a.voice === true)) return;
	const [voice] = get_local_voice_status(topic);
	//We are not connected to a voice channel
	if (!voice) return;

	//There are too many in the voice call
	const users = active.connections.filter((a) => a.voice === true);
	if (users.length > 9) return;

	//Joining == offer
	if (value.offer === true) {
		if (value.retry === true) {
			Hugin.send('got-expanded-voice-channel', [value.data, value.address]);
			return;
		}
		answer_call(value);
	} else {
		got_answer(value);
	}
};

const check_ban = async (value, active, con, topic) => {
	if (value.address === Hugin.address && con.admin) {
		Hugin.send('banned', active.key);
		removeRoom(active.key);
		await sleep(777);
		end_swarm(active.key);
		return true;
	}
	if (con.admin) ban_user(value.address, topic);
	else return 'Error';
	return true;
};

const check_ping = async (value, active, con, topic, beam) => {
	//A Ping without hashes, or while we are already fetching missing messages, is not used.
	if (!active.search || value.hashes === null) return true;
	if (!beam) {
		process_files(value, active, con, topic);
	}

	if (con.knownHashes.toString() === value.hashes.toString()) {
		con.request = false;
		return true;
	}
	if (active.peers.toString() !== value.peers.toString()) {
		find_missing_peers(active, value.peers);
	}
	const missing = await check_missed_messages(value.hashes, con.address, topic);
	//Updated knownHashes from this connection
	con.knownHashes = value.hashes;
	if (!missing) return true;
	con.request = true;
	active.search = false;
	request_missed_messages(missing, con.address, topic);
	return true;
};

const save_room_message = async (value) => {
	const message = P2PWire.roomMessageIn(value);
	if (!message) return;
	const msg = await saveGroupMsg(message, false, true);
	if (!msg) return;
	//Send new board message to frontend.
	Hugin.send('roomMsg', message);
	Hugin.send('room-notification', [message, false]);
};

function connection_joined(joined, topic, admin) {
	const connected = {
		topic,
		admin,
		joined: true,
		time: joined.time,
		address: joined.address,
		name: joined.name,
		voice: joined.voice,
		video: joined.video,
		avatar: joined.avatar,
		audioMute: joined.audioMute,
		videoMute: joined.videoMute,
		screenshare: joined.screenshare
	};

	saveRoomUser({
		name: joined.name,
		address: joined.address,
		room: topic,
		avatar: joined.avatar,
	});

	//TODO set svelte rune states?
	Hugin.send('peer-connected', connected);
}

const request_feed = (address, topic) => {
	console.log('Requsting feed..');
	send_peer_message(address, topic, P2PWire.requestFeedOut());
};

const send_feed_history = async (address, topic) => {
	const messages = await printFeed(0, true);
	send_peer_message(address, topic, P2PWire.sendFeedHistoryOut(messages));
};

const save_feed_history = async (messages) => {
	if (!Array.isArray(messages)) return;
	for (const data of messages) {
		const message = P2PWire.feedMessageIn(data);
		if (!message) continue;
		await saveFeedMessage(message);
	}
};

const send_feed_message = async (message, reply = '', tip) => {
	const hash = randomKey();
	const signature = await signMessage(
		P2PWire.feedSigningPayload(message, hash),
		keychain.getXKRKeypair().privateSpendKey
	);
	const payload = {
		type: 'feed',
		message,
		nickname: Hugin.nickname,
		address: Hugin.address,
		reply,
		tip,
		hash,
		timestamp: Date.now(),
		signature
	};
	try {
		forward_feed_message(P2PWire.feedOut(payload));
	} catch (e) {
		console.log('Feed message not sent:', e.message);
	}
	return payload;
};

//`payload` is an encoded feed message; it goes to every connection of every swarm.
const forward_feed_message = (payload) => {
	for (const swarm of active_swarms) {
		for (const peer of swarm.connections) {
			peer.write(payload);
		}
	}
};

const find_missing_peers = async (active, peers) => {
	for (const peer of peers) {
		if (typeof peer !== 'string' || peer?.length !== 64) continue;
		if (!active.peers.some((a) => a === peer)) {
			active.swarm.joinPeer(Buffer.from(peer, 'hex'));
			await sleep(100);
		}
	}
};

const send_friend_request = (address, key) => {
	const active = get_active(key);
	if (!active) return;

	const message = {
		hugin: Hugin.address,
		type: 'friend'
	};
	send_peer_message(address, active.topic, message);
};

const got_friend_request = (con, address, message) => {
	if ((!'hugin') in message) return;
	if (typeof message.hugin !== 'string') return;
	if (message.hugin.length > 200) return;
	if (message.hugin.substring(99) !== address) return;

	const request = {
		name: con.name,
		hugin: message.hugin,
		address: address
	};

	Hugin.send('friend-request', request);
};

const check_missed_messages = async (hashes) => {
	console.log('Checking for missing messages');
	const missing = [];
	for (const hash of hashes) {
		if (!check_hash(hash)) continue;
		if (await roomMessageExists(hash)) continue;
		missing.push(hash);
	}

	if (missing.length > 0) {
		console.log('Requesting:', missing.length, ' missed messages');
		return missing;
	}
	console.log('Current state synced.');
	return false;
};

const request_missed_messages = (hashes, address, topic) => {
	send_peer_message(address, topic, P2PWire.requestMessagesOut(hashes));
};

const send_missing_messages = async (hashes, address, topic) => {
	const files = Hugin.get_files();
	const messages = [];
	for (const hash of hashes) {
		if (!check_hash(hash)) continue;
		if (Hugin.roomFiles.some((a) => a === hash)) continue;
		if (files.some((a) => a.hash === hash)) continue;
		const found = await getGroupReply(hash);
		if (found) messages.push(found);
	}
	if (messages.length > 0) {
		send_peer_message(address, topic, P2PWire.missingMessagesOut(messages));
	}
};

const request_history = (address, topic, files) => {
	console.log('Reqeust history from another peer');
	send_peer_message(address, topic, P2PWire.requestHistoryOut(files));
};

const send_history = async (address, topic, key, files) => {
	const messages = await printGroup(key, 0);
	console.log('Sending:', messages.length, 'messages');
	send_peer_message(address, topic, P2PWire.sendHistoryOut({ messages, files }));
};


const process_files = async (data, active, con, topic) => {
	if (!Array.isArray(data.files)) return 'Ban';
	if (data.files.length > 10) return 'Ban';
	const syncEnabled = Hugin.syncImages.some((a) => a === topic);
	for (const file of data.files) {
		const old = Date.now() - file.time > ONE_DAY;
		if (old) continue;
		if (!check_hash(file.hash)) continue;
		if (Hugin.get_files().some((a) => a.time === file.time)) continue;
		await sleep(50);
		if (syncEnabled && con.driveKey) {
			await Storage.save_from_peer(topic, file, con.driveKey, active.key);
			continue;
		}
		if (!con.driveKey) continue;
		const fromAddr = file.address || con.address;
		const remoteFile = {
			fileName: file.fileName,
			address: fromAddr,
			size: file.size,
			topic,
			key: topic,
			chat: fromAddr,
			hash: file.hash,
			name: file.name || con.name,
			time: file.time,
			driveKey: con.driveKey
		};
		Hugin.send('group-remote-file-added', { chat: active.key, remoteFiles: [remoteFile] });
		if (!(await roomMessageExists(file.hash))) {
			save_file_info(file, topic, fromAddr, file.time, false, con.name);
		}
	}
};

const process_request = async (messages, key, live = false) => {
	let i = 0;
	const missing = [];
	try {
		for (const m of messages) {
			if (m?.address === Hugin.address) continue;
			if (!check_hash(m?.hash)) continue;
			if (await roomMessageExists(m.hash)) continue;
			const message = P2PWire.roomMessageIn(m);
			if (!message) continue;
			await saveGroupMsg(message, false, true);
			if (live) missing.push(message);
			Hugin.send('room-notification', [message, false]);
			i++;
		}
		//Only send update trigger if new messages has been processed.
		if (i !== 0) Hugin.send('history-update', { key, missing });
	} catch (e) {
		console.log('error processing history', e);
	}
};

const check_peer_voice_status = (data, con) => {
	const voice_data = P2PWire.voiceStatusIn(data);
	if (!voice_data) return false;
	const updated = update_voice_channel_status(voice_data, con);
	if (!updated) return false;
	return true;
};

const update_voice_channel_status = (data, con) => {
	if (data.address !== con.address) return false;
	//Set voice status
	con.voice = data.voice;
	con.video = data.video;
	//Send status to front-end
	Hugin.send('voice-channel-status', data);
	if (data.voice === true) {
		Hugin.send('user-joined-voice-channel', data);
	}
	return true;
};

const answer_call = (offer) => {
	Hugin.send('answer-voice-channel', offer);
};

const got_answer = (answer) => {
	Hugin.send('got-answer-voice-channel', answer);
};

const get_local_voice_status = (topic) => {
	const c = active_voice_channel;
	if (c.topic !== topic) return [false, false, false, false, false];
	return [c.voice, c.video, c.audioMute, c.videoMute, c.screenshare];
};

const get_my_channels = async (key) => {
	const c = await getChannels();
	let uniq = {};
	const channels_messages = c.filter((a) => a.room === key);
	const channels = channels_messages.filter(
		(obj) => !uniq[obj.channel] && (uniq[obj.channel] = true)
	);
	return channels.map((a) => {
		if (a.channel === 'Chat room') return a.channel;
	});
};

const send_joined_message = async (topic, keyPair, connection) => {
	const active = get_active_topic(topic);
	if (!active) return;
	const con = active.connections.find((a) => a.connection === connection);
	if (!con) return;
	const key = active.key;
	const [isAdmin] = is_room_admin(active.key);
	//Admin flag: our DHT public key signed with the room's admin key.
	const signature = isAdmin ? b4a.toString(keys.signAdmin(isAdmin.priv, keyPair.publicKey), 'hex') : '';
	//idSig: our DHT public key (hex) signed with the XKR spend key.
	const idSig = await keys.signIdSig(keyPair.publicKey, (message) =>
		signMessage(message, keychain.getXKRKeypair().privateSpendKey)
	);
	//Room history for rooms; DM swarms send none.
	const messages = active.beam ? [] : await printGroup(key, 0);

	let [voice, video, audioMute, videoMute, screenshare] = get_local_voice_status(topic);

	const data = P2PWire.joinedOut({
		address: Hugin.address,
		signature,
		avatar: Hugin.avatar,
		topic: topic,
		name: Hugin.nickname,
		voice,
		video,
		time: active.time,
		idSig,
		audioMute,
		videoMute,
		screenshare,
		messages,
		driveKey: Storage.get_drive_key(topic)
	});
	con.write(data);
};

const incoming_message = async (data, topic, connection, peer, beam) => {
	const check = await check_data_message(data, connection, topic, peer, beam);
	if (check === 'Ban') {
		peer.ban(true);
		connection_closed(connection, topic);
		return;
	}
	if (check === 'Error') {
		connection_closed(connection, topic);
	}
};

const send_swarm_message = (message, key, beam = false) => {
	let active = get_active(key);
	if (beam) active = get_beam(key);
	if (!active) return;
	for (const chat of active.connections) {
		if (!chat.joined) continue;
		chat.write(message);
	}

	console.log('Swarm msg sent!', message);
};

const check_online_state = async (topic) => {
	await sleep(10000);
	let interval = setInterval(ping, 10 * 1000);
	let a = 0;
	async function ping() {
		const active = get_active_topic(topic);
		if (!active) {
			clearInterval(interval);
			return;
		}
		const allFiles = await Storage.load_meta(topic);
		const hashes = await getLatestRoomHashes(active.key);
		let peers = [];
		//Send peer info on the first three pings. Then every 10 times.
		if (a < 3 || a % 10 === 0) {
			peers = active.peers;
			a++;
		}
		//TODO ** change from hash list to hash state.
		active.search = true;
		//Through the hugin-messages channel (a raw write on the stream is not read by peers).
		//Connections after the fifth get the hashes only every other time.
		let full;
		let light;
		try {
			full = P2PWire.pingOut({ peers, files: allFiles, hashes });
			light = P2PWire.pingOut({ peers, files: allFiles, hashes: [] });
		} catch (e) {
			console.log('Ping not sent:', e.message);
			return;
		}
		let i = 0;
		for (const conn of active.connections) {
			if (!conn.joined) continue;
			conn.write(i > 4 && i % 2 === 0 ? light : full);
			i++;
		}
	}
};


ipcMain.on('ban-user', (e, data) => {
	admin_ban_user(data.address, data.key);
});

ipcMain.on('update-voice-channel-status', (e, status) => {
	send_voice_channel_status(true, status, true);
});

ipcMain.on('group-download', (e, download) => {
	if (!download.driveKey) return;
	// For rooms: download.key is the topic; for DMs: download.topic is set directly
	const active = download.topic
		? get_active_topic(download.topic)
		: get_active_topic(download.key);
	if (!active) return;
	const isDm = !!active.beam;
	Storage.save_from_peer(active.topic, download, download.driveKey, active.key, isDm);
});

ipcMain.handle('save-to-downloads', async (e, { hash, fileName, topic }) => {
	const result = await Storage.save_to_downloads(hash, fileName, topic);
	if (!result.success) {
		error_message(result.error || 'Failed to save file');
	}
	return result;
});

ipcMain.on('group-upload', async (e, fileName, path, key, size, time, hash, room = true) => {
	register_user_file(path);
	let active = get_active(key);
	if (!room) {
		active = get_beam(key);
		saveMsg(fileName, active.chat.substring(0, 99), true, time);
	}
	if (!active) {
		console.log('Upload failed, room or beam is not active');
		return;
	}
	const topic = active.topic;
	const signature = await signMessage(
		P2PWire.fileSigningPayload({ hash, size, time, fileName }),
		keychain.getXKRKeypair().privateSpendKey
	);
	const upload = {
		fileName,
		path,
		topic,
		size,
		time,
		hash,
		room,
		signature,
		name: Hugin.nickname
	};
	console.log('Upload this file to group', upload);
	Hugin.send('uploading', { fileName, chat: Hugin.address, size, time, group: !!room });
	await Storage.save(
		topic,
		Hugin.address,
		Hugin.nickname,
		hash,
		size,
		time,
		fileName,
		path,
		signature,
		'file-shared',
		'file'
	);
	Hugin.send('upload-file-progress', { fileName, chat: Hugin.address, time, progress: 100 });
	share_file(upload);
	if (room) {
		Hugin.file_info({ fileName, time, size, path: 'storage', hash, topic });
		save_file_info(upload, topic, Hugin.address, time, true, Hugin.nickname);
	}
});

const get_active = (key) => {
	return active_swarms.find((a) => a.key === key);
};

const is_connection_healthy = (connection) => {
	if (!connection) return false;
	if (connection.destroyed) return false;
	if (connection.writable === false) return false;
	return true;
};

const close_duplicate_peer_connections = (active, keepConnection, predicate, topic) => {
	if (!active) return;
	const duplicates = active.connections.filter(
		(entry) => entry.connection !== keepConnection && predicate(entry)
	);
	for (const duplicate of duplicates) {
		connection_closed(duplicate.connection, topic, true);
	}
};

const get_beam = (address) => {
	for (const a of active_swarms) {
		if (!a.beam) continue;
		const addr = a.chat.substring(0, 99);
		if (addr === address) return a;
	}
};

const is_room_admin = (invite) => {
	const adminkeys = loadRoomKeys();
	const isAdmin = adminkeys.find((a) => a.invite === invite);
	if (!isAdmin) return [false, {}];
	return [isAdmin, adminkeys];
};


const send_peer_message = (address, topic, message) => {
	const active = get_active_topic(topic);
	if (!active) {
		error_message('Swarm is not active');
		return;
	}
	const con = active.connections.find((a) => a.address === address);
	if (!con) {
		error_message('Connection is closed');
		return;
	}
	console.log('Sending peer message');
	con.write(message);
};

const share_file = (file) => {
	const active = get_active_topic(file.topic);
	if (!active) {
		error_message('Room not connected');
		return;
	}
	//Without driveKey: receivers use the one from our `joined`.
	let info;
	try {
		info = P2PWire.fileSharedOut({
			fileName: file.fileName,
			address: Hugin.address,
			name: Hugin.nickname,
			topic: file.topic,
			size: file.size,
			time: file.time,
			hash: file.hash,
			signature: file.signature
		});
	} catch (e) {
		console.log('File info not sent:', e.message);
		return;
	}
	localFiles.push(file);
	//File shared, send info to peers
	console.log('Send file info!', info);
	send_swarm_message(info, active.key);
};


const save_file_info = (data, topic, address, time, sent, name) => {
	const active = get_active_topic(topic);
	let message = {
		message: data.fileName,
		address: address,
		name: name,
		timestamp: time,
		time: time,
		room: active.key,
		hash: data.hash,
		reply: '',
		sent: sent,
		tip: false,
		signature: ''
	};
	Hugin.roomFiles.push(message.hash);
	saveGroupMsg(message);
	Hugin.send('roomMsg', message);
};

const check_file_message = async (data, topic, address, con, beam) => {
	const active = get_active_topic(topic);
	if (!active) return;
	if (data.info === 'file-shared') {
		const autoSync = con.driveKey && (Hugin.syncImages.some((a) => a === topic) || beam);

		if (autoSync) {
			// Watcher in storage.cjs handles download; done() will create the message after
			return;
		}

		// Non-auto-sync: show a download button in the chat.
		// For rooms: send group-remote-file-added FIRST so $remoteFiles is populated
		// before the roomMsg arrives, ensuring isFile() attaches the remote file and
		// GroupMessage renders DownloadFile (not plain text).
		const remoteFile = {
			fileName: data.fileName,
			address,
			size: data.size,
			topic,
			key: beam ? address : topic,
			chat: address,
			hash: data.hash,
			name: con.name,
			time: data.time,
			driveKey: con.driveKey
		};
		if (beam) {
			Hugin.send('remote-file-added', { chat: address, remoteFiles: [remoteFile] });
		} else {
			Hugin.send('group-remote-file-added', { chat: active.key, remoteFiles: [remoteFile] });
			save_file_info(data, topic, address, data.time, false, con.name);
		}
	}

	if (data.type === 'file-removed') console.log('file removed', data);
};

// Small helper to centralize error notifications to the UI process.
// Avoids repeating event names and keeps call sites terse.
const error_message = (message) => {
	Hugin.send('error-notify-message', message);
};

ipcMain.on('typing', (e, data, beam = false) => {
	let message;
	try {
		message = P2PWire.typingOut(data.typing);
	} catch (e) {
		return;
	}
	send_swarm_message(message, data.key, beam);
});

ipcMain.on('join-voice', async (e, data) => {
	send_voice_channel_status(true, data, false);
});

ipcMain.on('exit-voice-channel', async (e, key) => {
	console.log('Exit voice');

	// Find by key if provided, otherwise fall back to the active voice channel topic
	let active = key ? active_swarms.find((a) => a.key === key) : null;
	if (!active && active_voice_channel.topic) {
		active = active_swarms.find((a) => a.topic === active_voice_channel.topic);
	}
	if (!active) return;
	const [in_voice] = get_local_voice_status(active.topic);
	if (!in_voice) return;

	//We should only be active in one channel. Close all connections
	Hugin.send('leave-active-voice-channel');
	Hugin.send('leave-voice-channel');
	send_voice_channel_status(false, {
		key: active.key,
		video: false,
		videoMute: false,
		audioMute: false,
		screenshare: false
	});
});

ipcMain.on('get-sdp-voice-channel', async (e, data) => {
	get_sdp(data);
});

ipcMain.on('new-channel', async (e, data) => {
	console.log('New channel!', data);
	Hugin.send('channel-created', data);
});

ipcMain.on('expand-voice-channel-sdp', async (e, expand) => {
	//This roundtrip is not needed when we do not expand sdps anymore
	let [data, address] = expand;
	let expanded_data = [data, address];
	Hugin.send('got-expanded-voice-channel', expanded_data);
});

//SDP from the renderer to the peer at `data.address`: an answer or a renegotiation is not an
//offer, `retry: true` asks the peer to expand it.
function get_sdp(data) {
	const { offer, retry } = P2PWire.sdpFlags(data);
	send_voice_channel_sdp({ to: data.address, data: data.data, offer, topic: data.topic, retry });
}

function get_topic_key_map() {
	const map = {};
	for (const s of active_swarms) {
		if (s.topic && s.key) {
			map[s.topic] = { key: s.key, beam: !!s.beam, chat: s.chat || null };
		}
	}
	return map;
}

module.exports = { send_feed_message, new_swarm, send_swarm_message, end_swarm, Nodes, get_topic_key_map };
