const HyperSwarm = require('hyperswarm-hugin');

const {
	sleep,
	sanitize_join_swarm_data,
	sanitize_voice_status_data,
	sanitize_file_message,
	sanitize_group_message,
	check_hash,
	toHex,
	randomKey,
	check_if_media,
	sanitize_feed_message,
	sanitize_typing_message,
	logPow,
	validate_pow_job,
	mini_message
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
	feedMessageExists
} = require('./database.cjs');
const { app, ipcMain } = require('electron');
const {
	keychain,
	get_new_peer_keys,
	naclHash,
	verify_signature,
	sign_admin_message,
	signMessage,
	sign_joined_message,
	verifySignature,
	decrpyt_beam_message
} = require('./crypto.cjs');

const LOCAL_VOICE_STATUS_OFFLINE = {
	voice: false,
	video: false,
	topic: '',
	videoMute: false,
	audioMute: false,
	screenshare: false
};

const {
	add_local_file,
	start_download,
	add_remote_file,
	send_file,
	update_remote_file
} = require('./beam.cjs');
const { Hugin } = require('./account.cjs');
const { Storage } = require('./storage.cjs');
const { createChallenge } = require('hugin-utils/challenge');
const RPC = require('bare-rpc');
const b4a = require('b4a');

const MISSING_MESSAGES = 'missing-messages';
const REQUEST_MESSAGES = 'request-messages';
const REQUEST_HISTORY = 'request-history';
const SEND_HISTORY = 'send-history';
const REQUEST_FILE = 'request-file';
const PING_SYNC = 'Ping';
const DOWNLOAD_REQUEST = 'download-request';
const REQUEST_FEED = 'request-feed';
const SEND_FEED_HISTORY = 'send-feed-history';

let started = false;

const ONE_DAY = 24 * 60 * 60 * 1000;

const EventEmitter = require('bare-events');

let localFiles = [];
let remoteFiles = [];
let active_swarms = [];
let downloading = [];
let uploading = [];
let active_voice_channel = LOCAL_VOICE_STATUS_OFFLINE;

const POW_MAX_JOB_TIME_MS = 90000;
const POW_REQUIRED_SHARES = 1;
const challenge = createChallenge();

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
		const key = pub ? this.public : address;
		const [base_keys, dht_keys, sig] = get_new_peer_keys(key);
		const topicHash = base_keys.publicKey.toString('hex');
		this.node = new HyperSwarm(
			{
				maxPeers: 1,
				firewall(remotePublicKey) {
					console.log('remotePublicKey', remotePublicKey.toString('hex'));

					//If we are connecting to a public node. Allow connection.
					if (pub) return false;

					//We verify if the private node has the correct public key.
					if (remotePublicKey.toString('hex') !== address.slice(-64)) {
						return true;
					}
					return false;
				}
			},
			sig,
			dht_keys,
			base_keys
		);

		this.listen();
		const topic = Buffer.alloc(32).fill(topicHash);
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
		if (data.type === 'new-message' && Array.isArray(data.messages)) {
			Nodes.emit('new-message', data.messages);
			return;
		}

		if ('address' in data) {
			if (typeof data.address !== 'string') return;
			if (data.address.length !== 99) return;
			this.address = data.address;
			Hugin.send('hugin-node-address', data.address);
			return;
		}

		// Unsolicited job push (no pending request id)
		if (data.type === 'job' && data.job && !this.requests.has(data.id)) {
			logPow('job_push', { type: data.type, jobId: data.job?.job_id });
			const validation = validate_pow_job(data.job);
			if (validation.ok) {
				this.set_job(data.job);
			} else {
				logPow('job_reject', { reason: validation.reason });
			}
			return;
		}

		if (this.requests.has(data.id)) {
			const { resolve } = this.requests.get(data.id);
			if ('chunks' in data) {
				this.pending.push(data.response);
				return;
			}
			if ('done' in data) {
				resolve(this.pending);
				this.requests.delete(data.id);
				return;
			}

			if ('success' in data) {
				resolve(data);
				this.requests.delete(data.id);
				return;
			}

			// Handle job response from node
			if (data.type === 'job' || data.type === 'job_pending') {
				logPow('job_response', { id: data.id, type: data.type, jobId: data.job?.job_id });
				if (data.job) {
					const validation = validate_pow_job(data.job);
					if (validation.ok) {
						this.set_job(data.job);
					} else {
						logPow('job_reject', { reason: validation.reason });
					}
				}
				resolve(data);
				this.requests.delete(data.id);
				return;
			}

			resolve(data.response);
			this.requests.delete(data.id);
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
			const req = this.rpc.request(RPC_COMMANDS.PACKET);
			req.send(JSON.stringify(packet));
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
			const id =
				data && data.timestamp !== undefined && data.timestamp !== null
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
			const max_attempts = 3;

			const should_retry = (res) => {
				if (!res) return true;
				if (res.success === true) return false;
				return !!res.reason;
			};
			const compute_pow = async () => {
				let pow = null;
				try {
					pow = await this.challenge(message_hash);
					if (pow && pow.shares) {
						logPow('pow_register_ready', { jobId: pow.job?.job_id, shares: pow.shares.length });
					}
				} catch (e) {
					logPow('pow_error', { message: e && e.message });
				}
				return pow;
			};

			const send_register = async (payload) => {
				if (!this.connection) {
					this.reconnect();
					await sleep(5000);
				}
				return await new Promise((resolve, reject) => {
					this.requests.set(request_id, { resolve, reject });
					if (!this.send_packet(payload)) {
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
			};

			const build_register = (pow) => ({
				register: true,
				data,
				timestamp: request_id,
				id: request_id,
				hash: message_hash,
				pow: {
					version: 2,
					job: pow.job,
					shares: pow.shares,
					auth: pow.auth
				}
			});

			let last_res = { success: false, reason: 'unknown' };
			let stale_share_retries = 0;
			const max_stale_share_retries = 3;
			for (let attempt = 1; attempt <= max_attempts; attempt++) {
				let pow = await compute_pow();
				if (!pow || !pow.shares || pow.shares.length === 0) {
					logPow('pow_register_retry', { attempt, reason: 'no_shares' });
					this.currentJob = null;
					const jobResponse = await this.request_job();
					if (jobResponse && jobResponse.job) this.set_job(jobResponse.job);
					last_res = { success: false, reason: 'PoW required' };
					continue;
				}

				const auth = this.build_pow_auth(message_hash, request_id, pow.shares, String(data || ''));
				if (!auth) {
					logPow('pow_register_retry', { attempt, reason: 'pow_auth_failed' });
					await sleep(100);
					continue;
				}
				const res = await send_register(build_register({ ...pow, auth }));
				if (res && res.success === true) return res;

				last_res = res || { success: false, reason: 'unknown' };
				if (!should_retry(last_res)) break;

				const recalc = this.should_recalc_share(last_res);
				if (recalc && stale_share_retries < max_stale_share_retries) {
					stale_share_retries++;
					logPow('pow_register_recalc', {
						attempt,
						stale_share_retries,
						reason: last_res.reason,
						jobId: pow && pow.job && pow.job.job_id
					});
					attempt--;
				}

				logPow('pow_register_retry', {
					attempt,
					reason: last_res.reason,
					jobId: pow && pow.job && pow.job.job_id
				});
				this.currentJob = null;
				const jobResponse = await this.request_job();
				if (jobResponse && jobResponse.job) this.set_job(jobResponse.job);
				await sleep(recalc ? 25 : 100);
			}

			return last_res;
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
			const sent = this.send_packet({
				type: 'job_request',
				id
			});
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

	build_pow_auth(message_hash, timestamp, shares, context = '') {
		if (!Array.isArray(shares) || !shares.length) return null;
		const share = shares[0];
		const [, oneTimeKeys] = get_new_peer_keys(randomKey());
		const signer = oneTimeKeys && oneTimeKeys.get ? oneTimeKeys.get() : null;
		if (!signer || !signer.sign || !signer.publicKey) return null;
		const payload = `powsig:v2:${String(message_hash || '')}:${timestamp}:${String(share.job_id || '')}:${String(share.nonce || '').toLowerCase()}:${String(share.result || '').toLowerCase()}:${String(context || '')}`;
		const sig = signer.sign(Buffer.from(payload));
		if (!sig) return null;
		return {
			pub: Buffer.from(signer.publicKey).toString('hex'),
			sig: Buffer.from(sig).toString('hex'),
			nonce: String(share.nonce || '').toLowerCase()
		};
	}

	should_recalc_share(res) {
		if (!res || typeof res !== 'object') return false;
		const reason = typeof res.reason === 'string' ? res.reason.toLowerCase() : '';
		if (
			reason.includes('pool_reject') ||
			reason.includes('invalid_share') ||
			reason.includes('stale') ||
			reason.includes('job')
		) {
			return true;
		}
		if (!Array.isArray(res.rejects)) return false;
		return res.rejects.some((entry) => {
			if (!entry) return false;
			const txt =
				typeof entry === 'string' ? entry.toLowerCase() : JSON.stringify(entry).toLowerCase();
			return (
				txt.includes('invalid') ||
				txt.includes('stale') ||
				txt.includes('low') ||
				txt.includes('job')
			);
		});
	}

	async challenge(message_hash) {
		if (!this.connection) return null;

		const start = Date.now();
		const shares = [];

		if (!challenge.hasJob()) {
			const res = await this.request_job();
			if (res && res.job) this.set_job(res.job);
		}

		while (Date.now() - start < POW_MAX_JOB_TIME_MS && shares.length < POW_REQUIRED_SHARES) {
			if (!challenge.hasJob()) {
				await sleep(250);
				continue;
			}

			const remaining = POW_MAX_JOB_TIME_MS - (Date.now() - start);
			if (remaining <= 0) break;

			const share = await challenge.findShare(Math.min(remaining, 30000));

			if (share) {
				shares.push({
					job_id: String(share.job_id),
					nonce: share.nonce.toLowerCase(),
					result: share.result.toLowerCase()
				});
			} else {
				const res = await this.request_job();
				if (res && res.job) this.set_job(res.job);
			}
		}

		if (shares.length >= POW_REQUIRED_SHARES) {
			return { job: challenge.currentJob, shares };
		}
		return null;
	}

	async message(payload, viewtag, kind = 'dm', hash = randomKey()) {
		try {
			if (!this.connection) {
				this.reconnect();
				return { success: false, reason: 'No connection to node' };
			}

			const request_id = Date.now();
			const max_attempts = 3;

			// Keep hash stable across retries to avoid duplicates.
			const message_hash = hash;

			const baseMessage = {
				cipher: payload,
				timestamp: request_id,
				hash: message_hash,
				id: request_id,
				push: true,
				viewtag,
				kind
			};

			const should_retry = (res) => {
				if (!res) return true;
				if (res.success === true) return false;
				return !!res.reason;
			};
			const send_post = async (postData) => {
				if (!this.connection) {
					this.reconnect();
					await sleep(5000);
				}
				return await new Promise((resolve, reject) => {
					this.requests.set(request_id, { resolve, reject });
					if (!this.send_packet(postData)) {
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
			};

			const compute_pow = async () => {
				let pow = null;
				try {
					pow = await this.challenge(message_hash);
					if (pow && pow.shares) {
						logPow('pow_message_ready', { jobId: pow.job?.job_id, shares: pow.shares.length });
					}
				} catch (e) {
					logPow('pow_error', { message: e && e.message });
				}
				return pow;
			};

			const build_post = (pow) => ({
				type: 'post',
				message: {
					...baseMessage,
					pow: {
						version: 2,
						job: pow.job,
						shares: pow.shares,
						auth: pow.auth
					}
				}
			});

			let last_res = { success: false, reason: 'unknown' };
			let stale_share_retries = 0;
			const max_stale_share_retries = 3;
			for (let attempt = 1; attempt <= max_attempts; attempt++) {
				let pow = await compute_pow();
				if (!pow || !pow.shares || pow.shares.length === 0) {
					logPow('pow_message_retry', { attempt, reason: 'no_shares' });
					this.currentJob = null;
					const jobResponse = await this.request_job();
					if (jobResponse && jobResponse.job) this.set_job(jobResponse.job);
					last_res = { success: false, reason: 'PoW required' };
					continue;
				}

				const authContext = kind
					? `${kind}:${String(baseMessage.cipher || '')}`
					: String(baseMessage.cipher || '');
				const auth = this.build_pow_auth(message_hash, request_id, pow.shares, authContext);
				if (!auth) {
					logPow('pow_message_retry', { attempt, reason: 'pow_auth_failed' });
					await sleep(100);
					continue;
				}
				const res = await send_post(build_post({ ...pow, auth }));
				if (res && res.success === true) return res;

				last_res = res || { success: false, reason: 'unknown' };
				if (!should_retry(last_res)) break;

				const recalc = this.should_recalc_share(last_res);
				if (recalc && stale_share_retries < max_stale_share_retries) {
					stale_share_retries++;
					logPow('pow_message_recalc', {
						attempt,
						stale_share_retries,
						reason: last_res.reason,
						jobId: pow && pow.job && pow.job.job_id
					});
					attempt--;
				}

				logPow('pow_message_retry', {
					attempt,
					reason: last_res.reason,
					jobId: pow && pow.job && pow.job.job_id
				});
				this.currentJob = null;
				const jobResponse = await this.request_job();
				if (jobResponse && jobResponse.job) this.set_job(jobResponse.job);
				await sleep(recalc ? 25 : 100);
			}
			return last_res;
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
	const key = naclHash(data.key);
	const invite = data.key;
	const [admin] = is_room_admin(data.key);
	const [base_keys, dht_keys, sig] = get_new_peer_keys(key);
	const topicHash = base_keys.publicKey.toString('hex');
	if (active_swarms.some((a) => a.topic === topicHash)) return true;
	await Storage.load_drive(topicHash);
	const files = await Storage.load_meta(topicHash);
	const peers = beam ? 1 : 100;
	//We add sig, keys and keyPair is for custom firewall settings.
	try {
		swarm = new HyperSwarm({ maxPeers: peers }, sig, dht_keys, base_keys);
	} catch (e) {
		console.log('Error starting swarm', e);
		return false;
	}

	const startTime = Date.now().toString();

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
		chat
	});

	Hugin.send('set-channels');

	swarm.on('connection', (connection, information) => {
		try {
			new_connection(connection, topicHash, dht_keys, information, beam);
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
	const topic = Buffer.alloc(32).fill(topicHash);
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

	active.connections.forEach((chat) => {
		try {
			chat.connection.write(JSON.stringify({ type: 'disconnected' }));
		} catch (e) {}
		connection_closed(chat.connection, topic);
	});

	await active.swarm.leave(Buffer.from(topic));
	await active.swarm.destroy();

	const still_active = active_swarms.filter((a) => a.topic !== topic);
	active_swarms = still_active;
	console.log('***** Ended swarm *****');
};

const new_connection = (connection, topic, dht_keys, peer, beam) => {
	console.log('New connection incoming');
	let active = get_active_topic(topic);

	if (!active) {
		console.log('no longer active in topic');
		connection_closed(connection, topic);
		return;
	}
	console.log('*****************************************');
	console.log('***********NEW CONNECTION!***************');
	console.log('*****************************************');
	const incomingPublicKey = peer.publicKey.toString('hex');
	const duplicateByPublicKey = active.connections.find(
		(a) => a.connection !== connection && a.publicKey === incomingPublicKey
	);
	if (duplicateByPublicKey) {
		if (duplicateByPublicKey.joined && is_connection_healthy(duplicateByPublicKey.connection)) {
			try {
				connection.end();
				connection.destroy();
			} catch (e) {}
			return;
		}
		connection_closed(duplicateByPublicKey.connection, topic, true);
	}
	active.connections.push({
		connection,
		topic: topic,
		voice: false,
		name: '',
		address: '',
		video: false,
		peer,
		request: false,
		knownHashes: [],
		publicKey: incomingPublicKey
	});
	send_joined_message(topic, dht_keys, connection).catch((error) => {
		console.log('Failed to send joined message', error);
		connection_closed(connection, topic, true);
	});
	//checkIfOnline(hash)
	connection.on('data', async (data) => {
		try {
			await incoming_message(data, topic, connection, peer, beam);
		} catch (error) {
			console.log('Incoming message handler failed', error);
			connection_closed(connection, topic, true);
		}
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

async function send_voice_channel_sdp(data) {
	const active = active_swarms.find((a) => a.topic === data.topic);
	if (!active) return;
	const con = active.connections.find((a) => a.address === data.address);
	if (!con) return;
	//We switch data address because in this case, it is from, we can change this
	data.address = Hugin.address;
	try {
		con.connection.write(JSON.stringify(data));
	} catch (e) {}
}

const send_voice_channel_status = async (joined, status, update = false) => {
	let active = active_swarms.find((a) => a.key === status.key);
	if (!active) return;
	const msg = active.topic;
	const sig = await signMessage(msg, keychain.getXKRKeypair().privateSpendKey);
	const data = JSON.stringify({
		address: Hugin.address,
		avatar: Hugin.avatar,
		signature: sig,
		message: msg,
		voice: joined,
		topic: active.topic,
		name: Hugin.nickname,
		video: status.video,
		audioMute: status.audioMute,
		videoMute: status.videoMute,
		screenshare: status.screenshare
	});
	update_local_voice_channel_status({
		topic: active.topic,
		voice: joined,
		audioMute: status.audioMute,
		videoMute: status.videoMute,
		screenshare: status.screenshare,
		video: status.video
	});

	//Send voice channel status to others in the group
	send_swarm_message(data, status.key);

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
			join_voice_channel(status.key, active.topic, user.address);
		});
	}
};

const join_voice_channel = (key, topic, address) => {
	Hugin.send('join-voice-channel', { key, topic, address });
};

const admin_ban_user = async (address, key) => {
	const active = get_active(key);
	if (!active) return;
	active.connections.forEach((chat) => {
		chat.connection.write(JSON.stringify({ type: 'ban', address }));
	});
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

const check_data_message = async (data, connection, topic, peer, beam) => {
	try {
		data = JSON.parse(data);
	} catch (e) {
		if (beam) return false;
		else return 'Ban';
	}

	//Check if active in this topic
	const active = get_active_topic(topic);
	if (!active) return 'Error';

	//Check if this connection is still in our list
	let con = active.connections.find((a) => a.connection === connection);
	if (!con) return 'Error';

	//If the connections send us disconnect message, return. **todo double check closed connection
	if ('type' in data) {
		if (data.type === 'disconnected') {
			connection_closed(connection, active.topic);
			return true;
		}
	}

	if ('typing' in data) {
		const [typing, checked] = sanitize_typing_message(data);
		if (!checked) return;
		if (!con.address) return;
		Hugin.send('typing', { typing, key: active.key, address: con.address });
	}

	// If feed message
	if ('type' in data) {
		if (data.type === 'feed') {
			const message = sanitize_feed_message(data);
			if (!message) return 'Ban';
			const exists = await feedMessageExists(message.hash);
			if (exists) return;
			const verify = await verifySignature(
				message.message + message.hash,
				message.address,
				message.signature
			);
			if (!verify) return 'Ban';
			await saveFeedMessage(message);
			message.type = 'feed';
			forward_feed_message(message);
			Hugin.send('feed-message', message);
			return;
		}
	}

	if ('info' in data) {
		const fileData = sanitize_file_message(data);
		if (!fileData) return 'Ban';
		check_file_message(fileData, topic, con.address, con, beam);
		return true;
	}

	//Double check if connection is joined voice?
	if ('offer' in data) {
		//Check if this connection has voice status activated.
		if (active.connections.some((a) => a.connection === connection && a.voice === true)) {
			const [voice, video] = get_local_voice_status(topic);
			if ((!voice && !video) || !voice) {
				//We are not connected to a voice channel
				//Return true bc we do not need to check it again
				return true;
			}

			//There are too many in the voice call
			const users = active.connections.filter((a) => a.voice === true);
			if (users.length > 9) return true;

			//Joining == offer
			if (data.offer === true) {
				if ('retry' in data) {
					if (data.retry === true) {
						Hugin.send('got-expanded-voice-channel', [data.data, data.address]);
						return;
					}
				}
				answer_call(data);
			} else {
				got_answer(data);
			}
		}
		return true;
	}

	if (typeof data === 'object') {
		if ('joined' in data) {
			const joined = sanitize_join_swarm_data(data);
			if (!joined) {
				return 'Ban';
			}

			if (Hugin.banned(data.address, topic)) {
				if (active.admin) admin_ban_user(data.address, active.key);
				else ban_user(data.address, topic);
			}
			//Check admin signature
			const admin = verify_signature(
				connection.remotePublicKey,
				Buffer.from(data.signature, 'hex'),
				Buffer.from(active.key.slice(-64), 'hex')
			);

			const verified = verifySignature(
				connection.remotePublicKey.toString('hex'),
				data.address,
				data.idSig
			);

			if (!verified) {
				return 'Ban';
			}

			con.joined = true;
			con.address = joined.address;
			con.name = joined.name;
			con.voice = joined.voice;
			con.admin = admin;
			con.video = joined.video;
			con.request = true;
			close_duplicate_peer_connections(
				active,
				con.connection,
				(entry) => !!entry.address && entry.address === joined.address,
				topic
			);
			active.peers.push(peer.publicKey.toString('hex'));
			let uniq = {};
			const peers = active.peers.filter((obj) => !uniq[obj] && (uniq[obj] = true));
			active.peers = peers;
			const time = parseInt(joined.time);

			process_request(joined.messages, active.key, false);

			//If our new connection is also in voice, check who was connected first to decide who creates the offer
			const [in_voice, video] = get_local_voice_status(topic);
			if (con.voice && in_voice && parseInt(active.time) > time) {
				join_voice_channel(active.key, topic, joined.address);
			}

			//Request message history from peer connected before us.
			if (parseInt(active.time) > time && active.requests < 3) {
				request_history(joined.address, topic, active.files);
				active.requests++;
			}
			request_feed(joined.address, topic);
			console.log('=======================================');
			console.log('--USER:', con.name, 'JOINED THE ROOM--');
			console.log('=======================================');

			connection_joined(joined, topic, admin);

			return true;
		}

		if ('voice' in data) {
			const voice_status = check_peer_voice_status(data, con);
			if (!voice_status) return 'Ban';
		}
	}

	if (!con.joined) return true;

	if ('type' in data) {
		const type = typeof data.type === 'string';
		if (!type) return 'Ban';

		if (data.type === 'ban') {
			if (data.address === Hugin.address && con.admin) {
				Hugin.send('banned', active.key);
				removeRoom(active.key);
				await sleep(777);
				end_swarm(active.key);
				return;
			}
			if (con.admin) ban_user(data.address, topic);
			else return 'Error';
			return true;
		} else {
			//Dont handle requests from blocked users
			if (Hugin.blocked(con.address)) return true;
			// History requests

			if (data.type === REQUEST_FEED) {
				console.log('Got feed request');
				send_feed_history(con.address, topic);
				return true;
			}

			if (data.type === SEND_FEED_HISTORY) {
				save_feed_history(data.messages, con.address, topic);
				return true;
			}

			//Start-up history sync
			if (data.type === REQUEST_HISTORY && con.request) {
				console.log('Want to send history file info:');
				send_history(con.address, topic, active.key, active.files);
				return true;
			} else if (data.type === SEND_HISTORY && con.request) {
				// process_request(data.messages, active.key, false)
				con.request = false;
				if ('files' in data) {
					process_files(data, active, con, topic);
				}
				return true;
			}

			//Live syncing from other peers who might have connections to others not established yet by us.

			const INC_HASHES = data.hashes?.length !== undefined || 0;
			const INC_MESSAGES = data.messages?.length !== undefined || 0;
			const INC_PEERS = data.peers?.length !== undefined || 0;
			//Check if payload is too big
			if (INC_HASHES) {
				if (data.hashes?.length > 25) return 'Ban';
			}

			if (data.type === PING_SYNC && active.search && INC_HASHES) {
				if ('files' in data && !beam) {
					process_files(data, active, con, topic);
				}

				if (con.knownHashes.toString() === data.hashes.toString()) {
					con.request = false;
					return true;
				}
				if (INC_PEERS && active.peers.toString() !== data?.peers.toString()) {
					if (data.peers?.length > 100) return 'Ban';
					find_missing_peers(active, data?.peers);
				}
				const missing = await check_missed_messages(data.hashes, con.address, topic);
				con.knownHashes = data.hashes;
				if (!missing) return true;
				con.request = true;
				active.search = false;
				request_missed_messages(missing, con.address, topic);
				//Updated knownHashes from this connection
			} else if (data.type === REQUEST_MESSAGES && INC_HASHES) {
				send_missing_messages(data.hashes, con.address, topic);
			} else if (data.type === MISSING_MESSAGES && INC_MESSAGES && con.request) {
				active.search = false;
				con.request = false;
				process_request(data.messages, active.key, true);
			} else if (data.type === REQUEST_FILE) {
				const file = sanitize_file_message(data.file);
				console.log('Got request file message', file);
				if (!file) return 'Error';
				console.log('Starting beam, requesting fle');
				try {
					await Storage.start_beam(true, file.key, file, topic, active.key, beam);
				} catch (e) {
					console.log('Error starting file transfer.');
				}
			}
			return true;
		}
	}
	//Dont display messages from blocked users
	if (Hugin.blocked(con.address)) return true;

	return false;
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

	//TODO set svelte rune states?
	Hugin.send('peer-connected', connected);
}

const request_feed = (address, topic) => {
	console.log('Requsting feed..');
	const message = {
		type: REQUEST_FEED
	};
	send_peer_message(address, topic, message);
};

const send_feed_history = async (address, topic) => {
	const messages = await printFeed(0, true);
	const history = {
		type: SEND_FEED_HISTORY,
		messages
	};
	send_peer_message(address, topic, history);
};

const save_feed_history = async (messages) => {
	if (!Array.isArray(messages)) return;
	for (const data of messages) {
		const message = sanitize_feed_message(data);
		if (!message) continue;
		await saveFeedMessage(message);
	}
};

const send_feed_message = async (message, reply = '', tip) => {
	const hash = randomKey();
	const signature = await signMessage(message + hash, keychain.getXKRKeypair().privateSpendKey);
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
	forward_feed_message(payload);
	return payload;
};

const forward_feed_message = (payload) => {
	for (const swarm of active_swarms) {
		for (const peer of swarm.connections) {
			peer.connection.write(JSON.stringify(payload));
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
		hugin: Hugin.address + keychain.getMsgKey(),
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
	const message = {
		type: REQUEST_MESSAGES,
		hashes
	};
	send_peer_message(address, topic, message);
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
		const message = {
			type: MISSING_MESSAGES,
			messages
		};
		send_peer_message(address, topic, message);
	}
};

const request_history = (address, topic, files) => {
	console.log('Reqeust history from another peer');
	const message = {
		type: REQUEST_HISTORY,
		files
	};
	send_peer_message(address, topic, message);
};

const send_history = async (address, topic, key, files) => {
	const messages = await printGroup(key, 0);
	console.log('Sending:', messages.length, 'messages');
	const history = {
		type: SEND_HISTORY,
		messages,
		files
	};
	send_peer_message(address, topic, history);
};

const request_file = async (address, topic, file, room, beam = false) => {
	//request a missing file, open a hugin beam
	console.log('-----------------------------');
	console.log('*** WANT TO REQUEST FILE  ***');
	console.log('-----------------------------');
	downloading.push(file.hash);
	const verify = await verifySignature(
		file.hash + file.size.toString() + file.time.toString() + file.fileName,
		file.address,
		file.signature
	);
	if (!verify) return;
	const key = randomKey();
	try {
		await Storage.start_beam(false, key, file, topic, room, beam);
	} catch (e) {
		console.log('Error starting file transfer.');
	}
	file.key = key;
	const message = {
		file,
		type: REQUEST_FILE
	};
	await sleep(200);
	send_peer_message(address, topic, message);
};

const process_files = async (data, active, con, topic) => {
	//Check if the latest 10 files are in sync
	if (Hugin.syncImages.some((a) => a === topic)) {
		if (!Array.isArray(data.files)) return 'Ban';
		if (data.files.length > 10) return 'Ban';
		for (const file of data.files) {
			const old = Date.now() - file.time > ONE_DAY;
			if (old) continue;
			if (!check_hash(file.hash)) continue;
			if (downloading.some((a) => a === file.hash)) continue;
			if (Hugin.get_files().some((a) => a.time === file.time)) continue;
			await sleep(50);
			request_file(con.address, topic, file, active.key);
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
			const message = sanitize_group_message(m, false);
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
	const voice_data = sanitize_voice_status_data(data);
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

const send_joined_message = async (topic, dht_keys, connection) => {
	let sig = '';
	const active = get_active_topic(topic);
	if (!active) return;
	const key = active.key;
	const [isAdmin, adminkeys] = is_room_admin(active.key);
	if (isAdmin) {
		//Sign our joined message with this
		sig = sign_admin_message(dht_keys, active.key, adminkeys);
	}
	const signature = await signMessage(
		dht_keys.get().publicKey.toString('hex'),
		keychain.getXKRKeypair().privateSpendKey
	);
	const messages = await printGroup(key, 0);

	let [voice, video, audioMute, videoMute, screenshare] = get_local_voice_status(topic);
	if (video) voice = true;

	const data = JSON.stringify({
		address: Hugin.address,
		signature: sig.toString('hex'),
		avatar: Hugin.avatar,
		message: key,
		joined: true,
		topic: topic,
		name: Hugin.nickname,
		voice: voice,
		channels: [],
		video: video,
		time: active.time,
		idSig: signature,
		audioMute,
		videoMute,
		screenshare,
		messages
	});
	try {
		connection.write(data);
	} catch (e) {}
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
		return;
	}
	if (check) return;

	const active = get_active_topic(topic);
	if (active.beam) {
		decrpyt_beam_message(data.toString(), active.chat.substring(99, 163));
		return;
	}

	const message = sanitize_group_message(JSON.parse(data.toString()), false);
	console.log('Got incoming message!', message);
	if (!message) return;
	const msg = await saveGroupMsg(message, false, true);
	if (!msg) return;
	//Send new board message to frontend.
	Hugin.send('roomMsg', message);
	Hugin.send('room-notification', [message, false]);
};

const send_swarm_message = (message, key, beam = false) => {
	let active = get_active(key);
	if (beam) active = get_beam(key);
	if (!active) return;
	for (const chat of active.connections) {
		try {
			console.log('Writing to channel');
			if (!chat.joined) continue;
			chat.connection.write(message);
		} catch (e) {
			continue;
		}
	}

	console.log('Swarm msg sent!', message);
};

const get_room_state = async (key) => {
	const hashes = await getLatestRoomHashes(key);
	return Buffer.from(naclHash(toHex(hashes))).toString('hex');
};

const check_online_state = async (topic) => {
	await sleep(10000);
	let interval = setInterval(ping, 10 * 1000);
	let a = 0;
	async function ping() {
		const active = get_active_topic(topic);
		const allFiles = await Storage.load_meta(topic);
		const hashes = await getLatestRoomHashes(active.key);
		const files = allFiles.sort((a, b) => a.time - b.time).slice(-10);
		let peers = [];
		//Send peer info on the first three pings. Then every 10 times.
		if (a < 3 || a % 10 === 0) {
			peers = active.peers;
			a++;
		}
		//TODO ** change from hash list to hash state.
		// const state = await get_room_state(active.key)
		if (!active) {
			clearInterval(interval);
			return;
		} else {
			active.search = true;
			let i = 0;
			const data = { type: 'Ping', peers, files: files };
			for (const conn of active.connections) {
				if (!conn.joined) continue;
				data.hashes = hashes;
				if (i > 4) {
					if (i % 2 === 0) data.hashes = [];
				}
				try {
					conn.connection.write(JSON.stringify(data));
				} catch (e) {}
				i++;
			}
		}
	}
};

const upload_ready = async (file, topic, address) => {
	const beam_key = await add_local_file(
		file.fileName,
		file.path,
		address,
		file.size,
		file.time,
		true
	);
	const info = {
		fileName: file.fileName,
		address,
		topic,
		info: 'file',
		type: 'upload-ready',
		size: file.size,
		time: file.time,
		key: beam_key
	};
	send_peer_message(address, topic, info);
	return beam_key;
};

ipcMain.on('ban-user', (e, data) => {
	admin_ban_user(data.address, data.key);
});

ipcMain.on('update-voice-channel-status', (e, status) => {
	send_voice_channel_status(true, status, true);
});

ipcMain.on('group-download', (e, download) => {
	request_download(download);
});

ipcMain.on('group-upload', async (e, fileName, path, key, size, time, hash, room = true) => {
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
		hash + size.toString() + time.toString() + fileName,
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
	const [media, type] = check_if_media(path, size);
	if (media) {
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
	}
	share_file(upload);
	if (room) save_file_info(upload, topic, Hugin.address, time, true, Hugin.nickname);
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

const request_download = (download) => {
	const active = get_active_topic(download.key);
	const address = download.chat;
	const topic = active.topic;
	const info = {
		fileName: download.fileName,
		address: Hugin.address,
		topic: topic,
		info: 'file',
		type: 'download-request',
		size: download.size,
		time: download.time,
		key: download.key
	};
	send_peer_message(address, topic, info);
};

const send_peer_message = (address, topic, message) => {
	const active = get_active_topic(topic);
	if (!active) {
		error_message('Swarm is not active');
		return;
	}
	const conn = active.connections.find((a) => a.address === address);
	if (!conn) {
		error_message('Connection is closed');
		return;
	}
	console.log('Sending peer message');
	try {
		conn.write(JSON.stringify(message));
		return;
	} catch (e) {
		console.log('Peer is offline');
		//connection_closed(conn, topic, 'Connection not active');
	}
};

const share_file = (file) => {
	const active = get_active_topic(file.topic);
	const fileInfo = {
		fileName: file.fileName,
		address: Hugin.address,
		name: Hugin.nickname,
		topic: file.topic,
		info: 'file-shared',
		type: 'file',
		size: file.size,
		time: file.time,
		hash: file.hash,
		signature: file.signature
	};
	const info = JSON.stringify(fileInfo);
	localFiles.push(file);
	//File shared, send info to peers
	console.log('Send file info!', info);
	send_swarm_message(info, active.key);
};

const start_upload = async (file, topic) => {
	const sendFile = localFiles.find(
		(a) => a.fileName === file.fileName && file.topic === topic && a.time === file.time
	);
	if (!sendFile) {
		error_message('File not found');
		return;
	}
	return await upload_ready(sendFile, topic, file.address);
};

const save_file_info = (data, topic, address, time, sent, name) => {
	const active = get_active_topic(topic);
	let message = {
		message: data.fileName,
		address: address,
		name: name,
		timestamp: time,
		room: active.key,
		hash: data.hash,
		reply: '',
		sent: sent,
		tip: false,
		signature: ''
	};
	Hugin.roomFiles.push(message.hash);
	saveGroupMsg(message);
};

const check_file_message = async (data, topic, address, con, beam) => {
	const active = get_active_topic(topic);
	if (!active) return;
	if (data.info === 'file-shared') {
		const [media, type] = check_if_media(data.fileName, data.size, true);
		if (media && (Hugin.syncImages.some((a) => a === topic) || beam)) {
			console.log('Want to request file shared');
			//A file is shared and we have auto sync images on.
			//Request to download the file
			const file = {
				address,
				topic,
				name: data.name,
				time: data.time,
				hash: data.hash,
				size: data.size,
				fileName: data.fileName,
				signature: data.sig,
				type: data.type,
				info: data.info
			};
			request_file(address, topic, file, active.key, beam);
			return;
		} else {
			console.log('Got file incoming!', data);
			const added = await add_remote_file(
				data.fileName,
				address,
				data.size,
				topic,
				!beam,
				data.hash,
				active.key,
				con.name,
				data.time
			);
			if (!beam) save_file_info(data, topic, address, added, false, con.name);
		}
	}

	if (data.type === 'download-request') {
		const key = await start_upload(data, topic);
		console.log('Got download request, starting upload:', data);
		send_file(data.fileName, data.size, address, key, true, beam);
	}

	if (data.type === 'upload-ready') {
		if (data.info === 'file') {
			console.log('Upload ready!');
			update_remote_file(data.fileName, address, data.size, data.key, data.time);
			start_download(Hugin.downloadDir, data.fileName, address, data.key, beam);
			return;
		}
	}

	if (data.type === 'file-removed') console.log("'file removed", data); //TODO REMOVE FROM remoteFiles
};

// Small helper to centralize error notifications to the UI process.
// Avoids repeating event names and keeps call sites terse.
const error_message = (message) => {
	Hugin.send('error-notify-message', message);
};

ipcMain.on('typing', (e, data, beam = false) => {
	const send = {
		typing: data.typing
	};
	send_swarm_message(JSON.stringify(send), data.key, beam);
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

function get_sdp(data) {
	let sendMessage;
	let offer = true;
	let reconnect = false;

	if ('retry' in data) {
		if (data.retry === true) reconnect = true;
	}

	if (data.type == 'answer') {
		offer = false;
	}

	if ('renegotiate' in data.data) {
		offer = false;
	}

	sendMessage = {
		data: data.data,
		offer: offer,
		address: data.address,
		topic: data.topic,
		retry: reconnect
	};

	send_voice_channel_sdp(sendMessage);
}

module.exports = { send_feed_message, new_swarm, send_swarm_message, end_swarm, Nodes };
