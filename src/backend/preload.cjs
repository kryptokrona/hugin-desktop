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
        ipcRenderer.send('addChat', hugin, name, first)
    },
    // HANDLE MESSAGES
    sendMsg: (msg, address, offChain, grp = false, beam) => {
        ipcRenderer.send('sendMsg', msg, address, offChain, grp, beam)
    },
    sendBoardMsg: (msg) => {
        ipcRenderer.send('sendBoardMsg', msg)
    },

    sendGroupMessage: (msg, offchain, swarm) => {
        console.log('Send group msg', msg, offchain, swarm)
        ipcRenderer.send('sendGroupsMessage', msg, offchain, swarm)
    },

    decryptMessage: (msg) => {
        ipcRenderer.send('decrypt_message', msg)
    },
    decryptGroupMessage: (msg, key) => {
        console.log('key', key)
        ipcRenderer.send('decrypt_rtc_group_message', msg, key)
    },
    

    getMessages: async (data) => {
        const res = await ipcRenderer.invoke('getMessages')
        return res
    },
    getBoardMsgs: async (data) => {
        let resp = await ipcRenderer.invoke('getBoardMsgs')
        return resp.boardMessages
    },
    printBoard: async (board) => {
        let resp = await ipcRenderer.invoke('printBoard', board)
        return resp
    },
    getReply: async (hash) => {
        let resp = await ipcRenderer.invoke('getReply', hash)
        return resp
    },
    getGroupReply: async (hash) => {
        let resp = await ipcRenderer.invoke('getGroupReply', hash)
        return resp
    },
    getMyBoards: async (board) => {
        let resp = await ipcRenderer.invoke('getMyBoards')
        return resp
    },
    getAllBoards: async () => {
        let resp = await ipcRenderer.invoke('getAllBoards')
        return resp
    },
    getConversations: async () => {
        let resp = await ipcRenderer.invoke('getConversations')
        return resp
    },
    getGroups: async () => {
        let resp = await ipcRenderer.invoke('getGroups')
        return resp
    },
    printGroup: async (grp) => {
        let resp = await ipcRenderer.invoke('printGroup', grp)
        return resp
    },

    printConversation: async (chat) => {
        let resp = await ipcRenderer.invoke('printConversation', chat)
        return resp
    },
    //HANDLE CALLS
    gotMedia: async (video, audio) => {
        ipcRenderer.send('got-media')
    },

    getPrivateKeys: async (data) => {
        let resp = await ipcRenderer.invoke('getPrivateKeys')
        return resp
    },

    getMnemonic: async (data) => {
        let resp = await ipcRenderer.invoke('getMnemonic')
        return resp
    },

    //HANDLE CALLS
    startCall: async (contact, calltype) => {
        ipcRenderer.send('startCall', contact, calltype)
    },

    answerCall: async (msg, contact, key, offchain) => {
        ipcRenderer.send('answerCall', msg, contact, key, offchain)
    },

    endCall: async (peer, stream, contact) => {
        ipcRenderer.send('endCall', peer, stream, contact)
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

    loadFile: async (path) => {
        return await ipcRenderer.invoke('load-file', path)
    },

    //HANDLE NODES
    getNodes: async () => {
        ipcRenderer.send('getNodes')
    },
    switchNode: (node) => {
        ipcRenderer.send('switchNode', node)
    },

    shareScreen: async (start, conference) => {
        ipcRenderer.send('shareScreen', false, conference)
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
        return await ipcRenderer.invoke('getBalance')
    },

    //HANDLE ADDRESS
    getAddress: async () => {
        await ipcRenderer.invoke('getAddress')
    },

    //HANDLE FINANCE
    getHeight: async () => {
        return await ipcRenderer.invoke('getHeight')
    },

    getTransactions: async (data) => {
        return await ipcRenderer.invoke('getTransactions', data)
    },

    sendTransaction: async (tx) => {
        ipcRenderer.send('sendTx', tx)
    },

    addBoard: async (board) => {
        ipcRenderer.send('addBoard', board)
    },

    removeBoard: async (board) => {
        ipcRenderer.send('removeBoard', board)
    },

    addGroup: async (grp) => {
        ipcRenderer.send('addGroup', grp)
    },

    removeGroup: async (grp) => {
        ipcRenderer.send('removeGroup', grp)
    },

    createGroup: async () => {
        return await ipcRenderer.invoke('createGroup')
    },
    
    fetchGroupHistory: async (settings) => {
        ipcRenderer.send('fetchGroupHistory', settings)
    },

    removeContact: async (contact) => {
        ipcRenderer.send('removeContact', contact)
    },
    
    removeAllListeners: (channel) => {
        ipcRenderer.removeAllListeners(channel)
    },
     //HANDLE ADDRESS
     checkPass: async (pass, hash) => {
        await ipcRenderer.invoke('check-pass', pass, hash)
    },

    exitVoiceChannel: async () => {
        ipcRenderer.send('exit-voice-channel')
    },

     errorMessage: async (errorMessage) => {
        ipcRenderer.send('error-notify-message-main', errorMessage)
    },

    successMessage: async (channel, successMessage) => {
        ipcRenderer.send('success-notify-message-main', channel, successMessage)
    },
}

contextBridge.exposeInMainWorld('api', WINDOW_API)
