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
let sender

function startDatabase(privKey) {
  
  loadDB(userDataDir, dbPath, privKey)
}

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
      this.downloadDir = downloadDir
      await this.load()

     }
    
    async load() {
      startDatabase(this.wallet.getPrimaryAddressPrivateKeys())
      const [my_contacts, keys] = await loadKeys((true))
      const my_groups = await getGroups()
      const block_list = await loadBlockList()
      
      this.sender('wallet-started', [this.node, my_groups, block_list, my_contacts])

      this.known_keys = keys
      this.block_list = block_list
     }

     send(channel, send) {
      
      this.sender(channel, send)
     }


}

  let Hugin = new Account()


  module.exports = {Hugin}