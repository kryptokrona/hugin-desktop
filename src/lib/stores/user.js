import { writable, derived } from "svelte/store";
import {get_avatar} from "$lib/utils/hugin-utils.js";

//Default values
export const user = writable({
    loggedIn: false,
    username: 'Anon',
    activeChat: null,
    huginAddress: '',
    call: false,
    callerMenu: false,
    contacts: null,
    addChat: false,
})

export const boards = writable({
    addBoard: false,
    replyTo: {reply: false},
    thisBoard: null,
    boardsArray: ['Home'],
})

export const misc = writable({
    syncState: '',
    walletBlockCount: null,
    localDaemonBlockCount: null,
    networkBlockCount: null,
    balance: [0, 0],
    node: '',
    nodeStatus: '',
})

export const webRTC = writable({
  stream: false,
  peer: false,
  myVideo: false,
  peerVideo: false,
  myStream: false,
  peerStream: false,
  screen: false,
})

export const userAvatar = derived(user, $user => {
    if ($user.huginAddress.length > 15) {
        return get_avatar($user.huginAddress.substring(0,99))
    }
})
