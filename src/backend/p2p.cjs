const { HuginP2P } = require('hugin-p2p');
const { Hugin } = require('./account.cjs');
const {
  roomMessageExists,
  getLatestRoomHashes,
  printGroup,
  getRooms,
  saveGroupMsg,
  saveFeedMessage,
  feedMessageExists,
  printFeed,
  saveRoomUser,
} = require('./database.cjs');
const {
  signMessage,
  verifySignature,
  get_new_peer_keys,
  sign_admin_message,
  sign_joined_message,
  verify_signature,
  keychain,
} = require('./crypto.cjs');
const { saveFriendRequest, getFriendRequests, removeFriendRequest } = require('./database.cjs');
const { randomKey } = require('./utils.cjs');
const fs = require('fs');
const Store = require('electron-store');
const store = new Store();

let p2p = null;
let roomCache = [];

async function getRoomName(roomKey) {
  if (typeof roomKey !== 'string' || roomKey.length === 0) return '';
  const rooms = await getRooms();
  const room = rooms.find((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    return (
      entry.key === roomKey ||
      entry.roomKey === roomKey ||
      entry.invite === roomKey
    );
  });
  if (!room) return false;
  if (typeof room.name === 'string') return room.name;
  if (typeof room.roomName === 'string') return room.roomName;
  return '';
}

function buildAdapter() {
  return {
    platform: 'desktop',

    db: {
      roomMessageExists: (hash) => roomMessageExists(hash),
      getRoomHistory: (key) => printGroup(key, 0),
      getRoomMessage: async (hash) => {
        const { getGroupReply } = require('./database.cjs');
        return getGroupReply(hash);
      },
      getLatestRoomHashes: (key) => getLatestRoomHashes(key),
      saveFeedMessage: (msg) => saveFeedMessage(msg),
      feedMessageExists: (hash) => feedMessageExists(hash),
      getFeedHistory: () => printFeed(0, true),
    },

    crypto: {
      sign: (message, signkey) => signMessage(message),
      verifySignature: async (message, address, signature) => {
        return verifySignature(message, address, signature);
      },
      getNewPeerKeys: (key) => get_new_peer_keys(key),
      signAdminMessage: (dhtKeys, adminKey) => sign_admin_message(dhtKeys, adminKey),
      verifyAdminSignature: (remoteKey, sig, adminPub) => {
        return verify_signature(remoteKey, sig, adminPub);
      },
      randomKey: () => randomKey(),
      signJoinedMessage: (dhtKeys) => sign_joined_message(dhtKeys),
    },

    pow: {
      findShare: async (job) => {
        const { findShare } = require('hugin-utils');
        return findShare(job);
      },
    },

    get identity() {
      return {
        address: Hugin.address,
        name: Hugin.nickname,
        avatar: Hugin.avatar,
        msgKey: keychain.getMsgKey(),
        rooms: roomCache,
        bannedList: store.get('bannedUsers') || [],
        blockedList: Hugin.block_list || [],
        downloadDir: Hugin.downloadDir,
        storePath: Hugin.downloadDir,
        syncImages: Hugin.syncImages,
        background: false,
        sleeping: false,
      };
    },
  };
}

const FORWARDED_EVENTS = [
  'swarm-message',
  'peer-connected',
  'peer-disconnected',
  'feed-message',
  'history-update',
  'voice-channel-status',
  'join-voice-channel',
  'answer-call',
  'got-answer',
  'new-swarm',
  'end-swarm',
  'banned',
  'beam-message',
  'beam-connected',
  'beam-disconnected',
  'beam-ended',
  'dm-file',
  'typing',
  'file-downloaded',
  'download-progress',
  'upload-progress',
  'hugin-node-connected',
  'hugin-node-disconnected',
  'node-address',
  'pool-messages',
  'friend-request-accepted',
  'error',
];

function init() {
  const adapter = buildAdapter();
  p2p = new HuginP2P(adapter, fs);
  refreshRoomCache();

  for (const event of FORWARDED_EVENTS) {
    p2p.on(event, (data) => {
      Hugin.send(event, data || {});
    });
  }

  p2p.on('friend-request', async (data) => {
    if (data?.hugin && data?.address && data?.name) {
      await refreshRoomCache();
      const roomKey = data.key || '';
      const roomName = await getRoomName(roomKey);
      if (!roomName) return;
      const request = {
        address: data.address,
        hugin: data.hugin,
        name: data.name,
        key: roomKey,
        roomName,
      };
      Hugin.send('friend-request', request);
      await saveFriendRequest({
        address: request.address,
        hugin: request.hugin,
        name: request.name,
        room: request.key,
        roomName: request.roomName,
        timestamp: Date.now(),
      });
    }
  });

  p2p.on('friend-request-accepted', async (data) => {
    if (!data?.hugin || !data?.address) return;
    try {
      const msgs = require('./messages.cjs');
      const name = data.name || 'Anon';
      msgs.save_contact(data.hugin, name, true);
      const chat = data.hugin.substring(0, 99);
      const key = await msgs.key_derivation_hash(chat);
      msgs.new_swarm({ key }, true, data.hugin);
    } catch (e) {
      console.log('Error auto-adding accepted friend:', e);
    }
  });

  p2p.on('swarm-message', (data) => {
    if (data?.message) {
      saveGroupMsg(data.message, false, true);
      saveRoomUser({
        name: data.message.name,
        address: data.message.address,
        room: data.message.room,
        avatar: '',
      });
      Hugin.send('roomMsg', data.message);
      Hugin.send('room-notification', [data.message, false]);
    }
  });

  return p2p;
}

function get() {
  return p2p;
}

module.exports = { init, get };
