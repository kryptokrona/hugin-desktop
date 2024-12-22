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
const { hash } = require('crypto')
const store = new Store()

ipcMain.on('set-avatar', (e, data) => {
  const avatar = Buffer.from(data).toString('base64')
  store.set({
    avatar: avatar
  })
  Hugin.avatar = avatar
})

ipcMain.on('save-avatar', (e, data) => {
  // let list = store.get('avatars') ?? []
  // if (list.some(a => a.address === data.address)) {
  //   const update = list.filter(a => a.address !== data.address)
  //   list = update
  // }
  // list.push({avatar: data.avatar.toString('base64'), address: data.address})
  // store.set({
  //   avatars: list
  // })
})

function get_room_avatars() {
  const list = store.get('avatars') ?? []
  const avatars = []
  // for (const a of list) {
  //   const item = {avatar: Buffer.from(a.avatar, 'base64'), address: a.address}
  //   avatars.push(item)
  // }
  return avatars
};

ipcMain.handle('get-avatar', () => {
  return get_avatar()
})

const get_avatar = () => {
  return store.get('avatar') ?? ""
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
    this.roomFiles = []
    this.avatar = ""
    }

    async init(wallet, name, node, s) {
      this.wallet = wallet
      this.walletName = name
      this.sender = s
      this.node = node
      this.downloadDir = store.get('download.dir') ?? downloadDir
      this.address = wallet.getPrimaryAddress()
      this.avatar = get_avatar()
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
      const myAvatar = this.avatar
      const [my_contacts, keys] = await loadKeys((true))
      const my_groups = await getGroups()
      const block_list = await loadBlockList()
      const deleteAfter = store.get('delete.after')
      const idle = store.get('idle.time') ?? 300
      const notifications = store.get('off.notifications') ?? []
      const banned = store.get('banned') ?? []
      const usersBanned = store.get('bannedUsers') ?? []
      const files = store.get('files') ?? []
      const avatars = get_room_avatars()

      this.sender('wallet-started', [
        this.node,
        my_groups.reverse(),
        block_list, 
        my_contacts.reverse(),
        deleteAfter,
        this.downloadDir,
        Buffer.from(myAvatar, 'base64'),
        idle,
        notifications,
        banned,
        files,
        avatars
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
      const list = this.get_files()
      list.push(file)
        store.set({
          files: list
        })
     }

     get_files() {
      return store.get('files') ?? []
     }

}

  let Hugin = new Account()


  module.exports = {Hugin}