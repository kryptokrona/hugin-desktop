// preload.cjs
const { contextBridge, ipcRenderer } = require('electron')

const WINDOW_API = {
    //GENERAL API CALLS
    send: (channel, data) => {
        ipcRenderer.send(channel, data)
    },
    sendSync: (channel, data) => {
        ipcRenderer.sendSync(channel, data)
    },
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args))
    },
    addChat: (hugin, name, first) => {
        ipcRenderer.send('add-chat', hugin, name, first)
    },
    // HANDLE MESSAGES
    sendMsg: (msg, address, offChain, grp = false, beam) => {
        ipcRenderer.send('send-msg', msg, address, offChain, grp, beam)
    },
    sendGroupMessage: (msg, offchain, swarm) => {
        ipcRenderer.send('send-group-message', msg, offchain, swarm)
    },
    sendRoomMessage: (msg) => {
        ipcRenderer.send('send-room-message', msg)
    },
    decryptMessage: (msg) => {
        ipcRenderer.send('decrypt_message', msg)
    },
    decryptGroupMessage: (msg, key) => {
        console.log('key', key)
        ipcRenderer.send('decrypt_rtc_group_message', msg, key)
    },
    deleteMessage: async(hash) => {
        ipcRenderer.send('delete-message', hash)
    },
    deleteMessageAfter: async(days) => {
        ipcRenderer.send('delete-messages-after', days)
    },
    getMessages: async () => {
        return await ipcRenderer.invoke('get-messages')
    },
    getGroupReply: async (hash) => {
        return await ipcRenderer.invoke('get-group-reply', hash)
    },
    getConversations: async () => {
        return await ipcRenderer.invoke('get-conversations')
    },
    getGroups: async () => {
        return await ipcRenderer.invoke('get-groups')
    },
    getRooms: async () => {
        return await ipcRenderer.invoke('get-rooms')
    },
    printRoom: async (room, page) => {
        return await ipcRenderer.invoke('print-group', room, page)
    },
    printGroup: async (grp, page) => {
        return await ipcRenderer.invoke('print-group', grp, page)
    },
    printConversation: async (chat) => {
        return await ipcRenderer.invoke('print-conversation', chat)
    },
    //HANDLE CALLS
    gotMedia: async (video, audio) => {
        ipcRenderer.send('got-media')
    },
    getPrivateKeys: async (data) => {
        return await ipcRenderer.invoke('get-private-keys')
    },
    getPublicKey: async (data) => {
        return await ipcRenderer.invoke('get-public-key')
    },
    getMnemonic: async (data) => {
        return await ipcRenderer.invoke('get-mnemonic')
    },
    createInvite: async () => {
        return await ipcRenderer.invoke('get-room-invite')
    },

    //HANDLE CALLS
    startCall: async (contact, calltype) => {
        ipcRenderer.send('start-call', contact, calltype)
    },

    answerCall: async (msg, contact, key, offchain) => {
        ipcRenderer.send('answer-call', msg, contact, key, offchain)
    },

    endCall: async (peer, stream, contact) => {
        ipcRenderer.send('end-call', peer, stream, contact)
    },

    expandSdp: async (data, address) => {
        ipcRenderer.send('expand-sdp', data, address)
    },

    upload: async (filename, path, address, size, time) => {
        ipcRenderer.send('upload', filename, path, address, size, time)
    },

    download: async (file, from) => {
        ipcRenderer.send('download', file, from)
    },

    removeLocalFile: async (fileName, chat, time) => {
        ipcRenderer.send('remove-local-file', fileName, chat, time)
    },

    createBeam: async (key, chat, send, offchain) => {
        ipcRenderer.send('beam', key, chat, send, offchain)
    },

    loadFile: async (path, size) => {
        return await ipcRenderer.invoke('load-file', path, size)
    },
    
    loadStoredFile: async (hash, topic) => {
        return await ipcRenderer.invoke('load-stored-file', hash, topic)
    },
    //HANDLE NODES
    getNodes: async () => {
        ipcRenderer.send('get-nodes')
    },
    switchNode: (node) => {
        ipcRenderer.send('switch-node', node)
    },

    shareScreen: async (start, conference) => {
        ipcRenderer.send('share-screen', false, conference)
    },

    setCamera: async () => {
        ipcRenderer.send('setCamera')
    },

    changeSource: async (src, conference, add) => {
        console.log('preload', src)
        ipcRenderer.send('change-src', src, conference, add)
    },

    changeAudioSource: async (src, conference, input) => {
        console.log('preload audio', src)
        ipcRenderer.send('change-audio-src', src, conference, input)
    },

    checkSources: async () => {
        ipcRenderer.send('check-srcs')
    },

    createRoom: async (type) => {
        ipcRenderer.send('create-room', type)
    },
    //HANDLE FINANCE
    getBalance: async () => {
        return await ipcRenderer.invoke('get-balance')
    },

    //HANDLE ADDRESS
    getAddress: async () => {
        await ipcRenderer.invoke('get-address')
    },

    //HANDLE FINANCE
    getHeight: async () => {
        return await ipcRenderer.invoke('get-height')
    },

    getTransactions: async (data) => {
        return await ipcRenderer.invoke('get-transactions', data)
    },

    sendTransaction: async (tx) => {
        return await ipcRenderer.invoke('send-tx', tx)
    },

    addGroup: async (grp) => {
        ipcRenderer.send('add-group', grp)
    },

    addRoom: async (rm, adm) => {
        ipcRenderer.send('add-room', rm, adm)
    },

    removeGroup: async (grp) => {
        ipcRenderer.send('remove-group', grp)
    },

    removeRoom: async (rm) => {
        ipcRenderer.send('remove-room', rm)
    },

    createGroup: async () => {
        return await ipcRenderer.invoke('create-group')
    },
    
    fetchGroupHistory: async (settings) => {
        ipcRenderer.send('fetch-group-history', settings)
    },

    removeContact: async (contact) => {
        ipcRenderer.send('remove-contact', contact)
    },
    
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel)
    },
    
    verifyPass: async (pass) => {
        return await ipcRenderer.invoke('verify-pass', pass)
    },

    exitVoiceChannel: async () => {
        ipcRenderer.send('exit-voice-channel')
    },

    updateVoiceChannelStatus: async (status) => {
        ipcRenderer.send('update-voice-channel-status', status)
    },

     errorMessage: async (errorMessage) => {
        ipcRenderer.send('error-notify-message-main', errorMessage)
    },

    successMessage: async (channel, successMessage) => {
        ipcRenderer.send('success-notify-message-main', channel, successMessage)
    },

    groupUpload: async (filename, path, topic, fileSize, time, hash, profile) => {
        ipcRenderer.send('group-upload', filename, path, topic, fileSize, time, hash, profile)
    },

    changeDowndloadDir: async (path) => {
        ipcRenderer.send('change-download-dir', path)
    },

    getProfile: async () => {
        return await ipcRenderer.invoke('get-profile')
    },

    openFolder: () => {
        ipcRenderer.send('open-download-folder')
    },
    changeIdleTime: (time) => {
        ipcRenderer.send('change-idle-time', time)
    },
    getDirectoryPath: async () => {
        return await ipcRenderer.invoke('select-directory')
    }
}

contextBridge.exposeInMainWorld('api', WINDOW_API)
