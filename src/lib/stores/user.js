import { writable, derived } from "svelte/store";
import {get_avatar} from "$lib/utils/hugin-utils.js";

//Default values
export const user = writable({
    loggedIn: false,
    username: 'Anon',
    activeChat: null,
    huginAddress: '',
    callerMenu: false,
    contacts: null,
    addChat: false,
    rename: false,
    transactions: []
})

export const boards = writable({
    addBoard: false,
    replyTo: {reply: false},
    thisBoard: null,
    boardsArray: ['Home'],
    newBoards: [],
})

export const groups = writable({
    addGroup: false,
    replyTo: {reply: false},
    thisGroup: {name: "Private groups", chat: "verysecretkeyinchat", key: "verysecretkeyinchat", msg: "Click the add icon"},
    groupArray: [],
})

export const rtc_groups = writable({
    addGroup: false,
    replyTo: {reply: false},
})

export const misc = writable({
    syncState: '',
    walletBlockCount: null,
    localDaemonBlockCount: null,
    networkBlockCount: null,
    balance: [0, 0],
    node: '',
})

export const webRTC = writable({
  stream: false,
  peer: false,
  myVideo: false,
  peerVideo: false,
  myStream: false,
  peerStream: false,
  screen: false,
  call: [],
  connected: false,
  videoSources: [],
  incoming: [],
  groupCall: false,
  invited: false,
  initiator: false
})

export const notify = writable({
    new: [],
    errors: [],
    success: [],
    unread: [],
})


export const transactions = writable({
   tip: false,
   send: false,
})

export const userAvatar = derived(user, $user => {
    if ($user.huginAddress.length > 15) {
        return get_avatar($user.huginAddress.substring(0,99))
    }
})
