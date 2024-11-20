const { app, ipcMain } = require('electron')
const userDataDir = app.getPath('userData')
const downloadDir = app.getPath('downloads')
const { JSONFile, Low } = require('@commonify/lowdb')
const { join } = require('path')
const file = join(userDataDir, 'misc.db')
const adapter = new JSONFile(file)
const db = new Low(adapter)
const dbPath = userDataDir + '/SQLmessages.db'
const { getGroups, loadBlockList, loadKeys, loadDB } = require('./database.cjs')
const fs = require('fs')

const Store = require('electron-store')
const store = new Store()

ipcMain.on('set-avatar', (e, data) => {

  ///TODO set base64 avatar here
  store.set({
    avatar: ""
  })

})

ipcMain.handle('get-profile', () => {
  return get_avatar()
})

const get_avatar = () => {
  return store.get('avatar')
}

ipcMain.on('change-download-dir', (e, dir) => {
    store.set({
      download: {
        dir: dir
      }
    })
  Hugin.downloadDir = dir
})


ipcMain.on('change-idle-time', (e, time) => {
  store.set({
    idle: {
      time: time
    }
  })
})

//Set banned list for UI things.
ipcMain.on('room-banned', (e, key) => {
 let list = store.get('banned') ?? []
 list.push(key)
  store.set({
    banned: list
  })
})

ipcMain.on('group-notifications', (e, list) => { 
  store.set({
    off: {
      notifications: list
    }
  })
})

ipcMain.on('set-nickname', (e, name) => { 
  Hugin.nickname = name
})

class Account {
    constructor () {
      
    this.known_keys = []
    this.block_list = []
    this.walletName = []
    this.node = {}
    this.wallet = {}
    this.sender = null
    this.downloadDir = ""
    this.nickname = ""
    this.address = ""
    }

    async init(wallet, name, node, s) {
      this.wallet = wallet
      this.walletName = name
      this.sender = s
      this.node = node
      this.downloadDir = store.get('download.dir') ?? downloadDir
      this.address = wallet.getPrimaryAddress()
      if (!store.get('pool.checked')) {
        //If no value is set, check from 24h back on first check.
        store.set({
          pool: {
              checked: Math.floor((Date.now() / 1000) - 84600)
          }
      })
      }

      await this.load()

     }
    
  async load() {
      await loadDB(userDataDir, dbPath, this.wallet.getPrimaryAddressPrivateKeys())
      const myAvatar = get_avatar()
      const [my_contacts, keys] = await loadKeys((true))
      const my_groups = await getGroups()
      const block_list = await loadBlockList()
      const deleteAfter = store.get('delete.after')
      const idle = store.get('idle.time') ?? 300
      const notifications = store.get('off.notifications') ?? []
      const banned = store.get('banned') ?? []
      const usersBanned = store.get('bannedUsers') ?? []
      const files = store.get('files') ?? []

      console.log("files", files)

      this.sender('wallet-started', [
        this.node,
        my_groups.reverse(),
        block_list, 
        my_contacts.reverse(),
        deleteAfter,
        Hugin.downloadDir,
        myAvatar,
        idle,
        notifications,
        banned,
        files
      ])

      this.known_keys = keys
      this.block_list = block_list
     }

     send(channel, send) {
      
      this.sender(channel, send)
     }

     ban(address, topic) {
      if (this.banned(address, topic)) return
      list.push({address, topic})
        store.set({
          bannedUsers: list
        })
     }

     banned(address, topic) {
      const banned = store.get('bannedUsers') ?? []
      return banned.some(a => a.address === address && a.topic === topic)
     }

     blocked(address) {
      return this.block_list.some(a => a.address === address)
     }

     save_file(file) {
      const list = store.get('files') ?? []
      list.push(file)
        store.set({
          files: list
        })
     }

}

  let Hugin = new Account()


  module.exports = {Hugin}