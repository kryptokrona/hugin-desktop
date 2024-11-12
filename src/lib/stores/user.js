import {derived, writable} from 'svelte/store'
import {get_avatar} from '$lib/utils/hugin-utils.js'

//Default values
export const user = writable({
    loggedIn: false,
    username: 'Anon',
    activeChat: false,
    huginAddress: '',
    myAddress: '',
    callerMenu: false,
    contacts: null,
    addChat: false,
    rename: false,
    transactions: [],
    block: false,
    started: false,
    downloadPath: "",
    customAvatar: false,
    idleTime: 0,
    idleLimit: 300
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
    activeHugins: [],
    historyTimeframe: 0,
    autoDeleteAfter: 0,
    settings: false,
    fileList: []
})

export const rtc_groups = writable({
    addGroup: false,
    replyTo: {reply: false},
    unread: []
})

export const misc = writable({
    syncState: 'Syncing',
    walletBlockCount: null,
    localDaemonBlockCount: null,
    networkBlockCount: null,
    balance: [0, 0],
    node: '',
    version: '',
    os: '',
    loading: false,
    syncStatus: false,
    deleteAfter: null,
    focus: false,
    welcomeAddress: "SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1",
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
    cameraId: false,
    audio: true
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
    notifications: [],
    off: []
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

export const swarm = writable({
    active: [],
    myVideo: false,
    voice_channel: [],
    call: [],
    newChannel: false,
    activeChannel: {name: ""},
    activeChannelMessages: [],
    audio: true,
    showVideoGrid: false,
    myStream: false,
    screenshare: false,
    showInfo: true,
})


export const rooms = writable({
    addRoom: false,
    replyTo: {reply: false},
    thisRoom: {key: "SEKReYU57DLLvUjNzmjVhaK7jqc8SdZZ3cyKJS5f4gWXK4NQQYChzKUUwzCGhgqUPkWQypeR94rqpgMPjXWG9ijnZKNw2LWXnZU1", chat: false},
    roomArray: [],
    blockList: [],
    activeHugins: [],
    settings: false,
    showUserInfo: false,
    banned: []
 })

export const userAvatar = derived(user, ($user) => {
    if ($user.huginAddress.length > 15) {
        return get_avatar($user.myAddress)
    }
})
