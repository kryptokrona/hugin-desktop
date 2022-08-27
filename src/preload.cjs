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
  sendMsg: (msg, address, offChain) => {
    ipcRenderer.send('sendMsg', msg, address, offChain )
  },
  sendBoardMsg: (msg) => {
    ipcRenderer.send('sendBoardMsg', msg)
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
  getMyBoards: async (board) => {
    let resp = await ipcRenderer.invoke('getMyBoards')
    return resp
  },
  getConversations: async () => {
    let resp = await ipcRenderer.invoke('getConversations')
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

  answerCall: async (msg, contact, key) => {
    ipcRenderer.send('answerCall', msg, contact, key)
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
}


contextBridge.exposeInMainWorld('api', WINDOW_API);
