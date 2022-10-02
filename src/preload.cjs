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
  sendMsg: (msg, address, offChain, grp = false) => {
    ipcRenderer.send('sendMsg', msg, address, offChain, grp )
  },
  sendBoardMsg: (msg) => {
    ipcRenderer.send('sendBoardMsg', msg)
  },

  sendGroupMessage: (msg, offchain) => {
    console.log('Send group msg', msg, offchain)
    ipcRenderer.send('sendGroupsMessage', msg, offchain)
  },

  decryptMessage: (msg) => {
    ipcRenderer.send('decrypt_message', msg)
  },
  decryptGroupMessage: (msg, key) => {
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

  upload: async (filename, path, address) => {
    ipcRenderer.send('upload', filename, path, address)
  },
  download: async (link) => {
    ipcRenderer.send('download', link)
  },
  //HANDLE NODES
  getNodes: async () => {
    ipcRenderer.send('getNodes')
  },
  switchNode: node => {
    ipcRenderer.send('switchNode', node)
  },

  shareScreen: async () => {
    ipcRenderer.invoke('shareScreen')
  },

  setCamera: async () => {
    ipcRenderer.send('setCamera')
  },

  changeSource: async (src) => {
    console.log('preload', src)
    ipcRenderer.send('change-src', src)
  },
  
  checkSources: async () => {
    ipcRenderer.send('check-srcs')
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
  removeAllListeners: (channel) => {
    console.log('want to remove', channel)
      console.log('removed')
      ipcRenderer.removeAllListeners(channel)
  }
}

contextBridge.exposeInMainWorld('api', WINDOW_API);
