import { get } from 'svelte/store';
import { rooms, swarm } from '$lib/stores/user.js';

function isMap(v) {
	return (
		v instanceof Map ||
		(v != null &&
			typeof v.has === 'function' &&
			typeof v.delete === 'function' &&
			typeof v.values === 'function')
	);
}

function parseSwarm(input) {
	if (!input) return null;
	let parsed = input;
	if (typeof parsed === 'string') {
		try {
			parsed = JSON.parse(parsed);
		} catch {
			return null;
		}
	}
	if (!parsed || typeof parsed !== 'object') return null;
	const key = parsed.key || '';
	const topic = parsed.topic || '';
	if (!key && !topic) return null;
	return {
		...parsed,
		key,
		topic,
		channels: Array.isArray(parsed.channels) ? parsed.channels : [],
		connections: Array.isArray(parsed.connections) ? parsed.connections : [],
		voice_channel: isMap(parsed.voice_channel) ? parsed.voice_channel : new Map()
	};
}

function parsePeer(input) {
	if (!input || typeof input !== 'object') return null;
	return input;
}

function normalizeUsers(users) {
	if (!Array.isArray(users)) return [];
	const seen = new Set();
	const result = [];
	for (const u of users) {
		if (!u?.address || seen.has(u.address)) continue;
		seen.add(u.address);
		result.push({
			address: u.address,
			room: u.room,
			name: u.name || u.nickname || 'Anon'
		});
	}
	return result;
}

class Peers {
	swarms = $state([]);
	activeRoomKey = $state('');
	knownUsersByRoom = $state({});

	get activeSwarm() {
		if (!this.activeRoomKey) return false;
		return this.swarms.find((s) => s.key === this.activeRoomKey) || false;
	}

	get activeConnections() {
		const active = this.activeSwarm;
		return active ? active.connections || [] : [];
	}

	get activeVoiceUsers() {
		const active = this.activeSwarm;
		if (!active?.voice_channel || !isMap(active.voice_channel)) return [];
		return Array.from(active.voice_channel.values());
	}

	get activeKnownUsers() {
		const roomKey = this.activeRoomKey;
		const connected = this.activeConnections.map((u) => ({
			address: u.address,
			room: roomKey,
			name: u.name || 'Anon'
		}));
		const known = this.knownUsersByRoom[roomKey] || [];
		return normalizeUsers([...connected, ...known]);
	}

	isOnlineInRoom(address) {
		return this.activeConnections.some((c) => c.address === address);
	}

	isAddressOnline(address) {
		return this.swarms.some((s) => s.connections?.some((c) => c.address === address));
	}

	isDmOnline(chatAddress) {
		return this.swarms.some(
			(s) => s.chat === chatAddress && s.connections?.some((c) => c.address === chatAddress)
		);
	}

	onlineCount(roomKey) {
		const s = this.swarms.find((s) => s.key === roomKey);
		return s?.connections?.length || 0;
	}

	getSwarm(roomKey) {
		return this.swarms.find((s) => s.key === roomKey) || null;
	}

	setActiveRoom(roomKey) {
		this.activeRoomKey = roomKey || '';
		this._syncLegacy();
	}

	setRoomUsers(roomKey, users) {
		if (!roomKey) return;
		this.knownUsersByRoom = {
			...this.knownUsersByRoom,
			[roomKey]: normalizeUsers(users)
		};
		this._syncLegacy();
	}

	_addKnownUser(roomKey, user) {
		if (!roomKey || !user?.address) return;
		const current = this.knownUsersByRoom[roomKey] || [];
		if (current.some((u) => u.address === user.address)) return;
		this.knownUsersByRoom = {
			...this.knownUsersByRoom,
			[roomKey]: [...current, { address: user.address, room: roomKey, name: user.name || 'Anon' }]
		};
	}

	onSwarmConnected(payload) {
		const incoming = parseSwarm(payload);
		if (!incoming) return;
		const idx = this.swarms.findIndex(
			(s) =>
				(incoming.topic && s.topic === incoming.topic) || (incoming.key && s.key === incoming.key)
		);
		if (idx >= 0) {
			const current = this.swarms[idx];
			this.swarms[idx] = {
				...current,
				...incoming,
				voice_channel: isMap(current.voice_channel)
					? current.voice_channel
					: incoming.voice_channel,
				connections: current.connections?.length > 0 ? current.connections : incoming.connections
			};
		} else {
			this.swarms.push(incoming);
		}
		if (!this.activeRoomKey && incoming.key) this.activeRoomKey = incoming.key;
		this._syncLegacy();
	}

	onSwarmDisconnected(topic) {
		const current = this.swarms.find((s) => s.topic === topic);
		this.swarms = this.swarms.filter((s) => s.topic !== topic);
		if (current?.key && this.activeRoomKey === current.key) {
			this.activeRoomKey = this.swarms[0]?.key || '';
		}
		this._syncLegacy();
	}

	onPeerConnected(payload) {
		const peer = parsePeer(payload);
		console.log('peer', peer);
		if (!peer) return;
		const idx = this.swarms.findIndex(
			(s) => (peer.topic && s.topic === peer.topic) || (peer.key && s.key === peer.key)
		);
		if (idx < 0) return;
		const swm = this.swarms[idx];
		if (swm.connections.some((c) => c.address === peer.address)) return;

		const nextPeer = {
			address: peer.address,
			name: peer.name || 'Anon',
			topic: peer.topic || swm.topic,
			key: peer.key || swm.key,
			time: peer.time || Date.now(),
			voice: !!peer.voice,
			avatar: peer.avatar || '',
			audioMute: !!peer.audioMute,
			videoMute: !!peer.videoMute,
			screenshare: !!peer.screenshare
		};

		console.log('Peer push', nextPeer);
		this.swarms[idx] = { ...swm, connections: [...swm.connections, nextPeer] };
		this._addKnownUser(peer.key || swm.key, nextPeer);
		if (peer.key && !this.activeRoomKey) this.activeRoomKey = peer.key;
		this._syncLegacy();
	}

	onPeerDisconnected(payload) {
		const peer = parsePeer(payload);
		if (!peer) return;
		const idx = this.swarms.findIndex(
			(s) =>
				(peer.topic && s.topic === peer.topic) ||
				(peer.key && s.key === peer.key) ||
				(peer.address && s.connections?.some((c) => c.address === peer.address))
		);
		if (idx < 0) return;
		const swm = this.swarms[idx];
		const newConnections = swm.connections.filter((c) => c.address !== peer.address);
		let newVc = swm.voice_channel;
		if (isMap(swm.voice_channel) && peer.address && swm.voice_channel.has(peer.address)) {
			newVc = new Map(swm.voice_channel);
			newVc.delete(peer.address);
		}
		this.swarms[idx] = { ...swm, connections: newConnections, voice_channel: newVc };
		this._syncLegacy();
	}

	onVoiceStatus(payload) {
		const peer = parsePeer(payload);
		if (!peer) return;
		const idx = this.swarms.findIndex(
			(s) => (peer.topic && s.topic === peer.topic) || (peer.key && s.key === peer.key)
		);
		if (idx < 0) return;
		const swm = this.swarms[idx];
		const vc = new Map(swm.voice_channel || new Map());
		if (peer.voice) {
			vc.set(peer.address, { ...peer, key: peer.key || swm.key, topic: peer.topic || swm.topic });
		} else {
			vc.delete(peer.address);
		}
		this.swarms[idx] = { ...swm, voice_channel: vc };
		this._syncLegacy();
	}

	leaveVoice(address) {
		this.swarms = this.swarms.map((swm) => {
			if (isMap(swm.voice_channel) && swm.voice_channel.has(address)) {
				const vc = new Map(swm.voice_channel);
				vc.delete(address);
				return { ...swm, voice_channel: vc };
			}
			return swm;
		});
		this._syncLegacy();
	}

	onChannelCreated(channel) {
		if (!channel?.key) return;
		const swm = this.swarms.find((s) => s.key === channel.key);
		if (!swm) return;
		if (swm.channels.some((c) => c.name === channel.name)) return;
		swm.channels = [channel, ...swm.channels];
		this._syncLegacy();
	}

	initFromLegacyStores() {
		const currentSwarm = get(swarm);
		const currentRooms = get(rooms);
		if (Array.isArray(currentSwarm?.active) && currentSwarm.active.length > 0) {
			this.swarms = currentSwarm.active.map((e) => parseSwarm(e)).filter(Boolean);
		}
		if (currentRooms?.thisRoom?.key) {
			this.activeRoomKey = currentRooms.thisRoom.key;
		} else if (currentSwarm?.activeSwarm?.key) {
			this.activeRoomKey = currentSwarm.activeSwarm.key;
		}
		if (Array.isArray(currentRooms?.activeHugins) && this.activeRoomKey) {
			this.knownUsersByRoom = {
				...this.knownUsersByRoom,
				[this.activeRoomKey]: normalizeUsers(currentRooms.activeHugins)
			};
		}
		this._syncLegacy();
	}

	_syncLegacy() {
		const prev = get(swarm);
		const active = this.activeSwarm;
		let voiceChannel = prev.voice_channel || new Map();
		if (isMap(active?.voice_channel)) {
			voiceChannel = active.voice_channel;
		}
		swarm.set({
			...prev,
			active: this.swarms,
			activeSwarm: active,
			voice_channel: voiceChannel
		});
		const prevRooms = get(rooms);
		rooms.set({
			...prevRooms,
			activeHugins: this.activeKnownUsers
		});
	}
}

export const peers = new Peers();
