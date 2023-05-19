import {derived, writable} from 'svelte/store'
import {get_avatar} from '$lib/utils/hugin-utils.js'

//Default values
export const user = writable({
    loggedIn: false,
    username: 'Anon',
    activeChat: false,
    huginAddress: '',
    callerMenu: false,
    contacts: null,
    addChat: false,
    rename: false,
    transactions: [],
    block: false,
    started: false,
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
    thisGroup: {key: "SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1", chat: false},
    groupArray: [],
    blockList: [],
    activeHugins: []
})

export const rtc_groups = writable({
    addGroup: false,
    replyTo: {reply: false},
    unread: []
})

export const misc = writable({
    syncState: '',
    walletBlockCount: null,
    localDaemonBlockCount: null,
    networkBlockCount: null,
    balance: [0, 0],
    node: '',
    version: '',
    os: '',
    loading: false,
    syncStatus: false,
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
    initiator: false,
    devices: [],
    cameraId: false
})

export const audioLevel = writable({
    call: [],
})

export const notify = writable({
    new: [],
    errors: [],
    success: [],
    unread: [],
    update: [],
})

export const transactions = writable({
    tip: false,
    send: false,
})

export const messageWallet = writable({
    optimized: false
})

export const beam = writable({
    active: []
})

export const userAvatar = derived(user, ($user) => {
    if ($user.huginAddress.length > 15) {
        return get_avatar($user.huginAddress.substring(0, 99))
    }
})

export const swarm = writable({
    active: [],
    voice_channel: [],
    call: []
})

