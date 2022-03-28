// preload.cjs
const { contextBridge, ipcRenderer } = require('electron')

const WINDOW_API = {
  send: (channel, data) => {
    ipcRenderer.send(channel, data)
  },
  sendSync: (channel, data) => {
    ipcRenderer.sendSync(channel, data)
  },
  receive: (channel, func) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args))
  },
  sendMsg: msg => {
    ipcRenderer.send('sendMsg', msg)
  },

  //HANDLE NODES
  getNodes: async () => {
    ipcRenderer.send('getNodes')
  },
  switchNode: node => (
      ipcRenderer.send('switchNode', node)
  )
}


contextBridge.exposeInMainWorld('api', WINDOW_API);