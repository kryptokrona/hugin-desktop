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


function createAvatarDir() {
  if (!fs.existsSync(userDataDir + "/avatars")) {
    fs.mkdirSync(userDataDir + "/avatars")
  }
}

ipcMain.on('set-avatar', (e, [filePath, fileName, size]) => {
  
  console.log("Set avatar!", filePath, fileName)
  const newPath = userDataDir + "/" + fileName

  fs.copyFile(filePath, newPath, (err) => {
    if (err)
    console.log("errror", err)
  });

  store.set({
    avatar: { path: newPath, name: fileName, size }
  })

})

ipcMain.handle('get-profile', () => {
  return store.get('avatar')
})

ipcMain.on('change-download-dir', (e, dir) => {
    store.set({
      download: {
        dir: dir
      }
    })
  Hugin.downloadDir = dir
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
    }

    async init(wallet, name, node, s) {
      this.wallet = wallet
      this.walletName = name
      this.sender = s
      this.node = node
      this.downloadDir = store.get('download.dir') ?? downloadDir

      if (!store.get('pool.checked')) {
        //If no value is set, check from 24h back on first check.
        store.set({
          pool: {
              checked: Math.floor((Date.now() / 1000) - 84600)
          }
      })
      }

      console.log("Pool checked time:", store.get('pool.checked'))

      await this.load()

     }
    
    async load() {
      createAvatarDir()
      await loadDB(userDataDir, dbPath, this.wallet.getPrimaryAddressPrivateKeys())
      const myAvatar = store.get('avatar.path') ?? false
      const [my_contacts, keys] = await loadKeys((true))
      const my_groups = await getGroups()
      const block_list = await loadBlockList()
      const deleteAfter = store.get('delete.after')
      
      this.sender('wallet-started', [this.node, my_groups, block_list, my_contacts, deleteAfter, Hugin.downloadDir, myAvatar])

      this.known_keys = keys
      this.block_list = block_list
     }

     send(channel, send) {
      
      this.sender(channel, send)
     }


}

  let Hugin = new Account()


  module.exports = {Hugin}