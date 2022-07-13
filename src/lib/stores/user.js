import { writable, derived } from "svelte/store";
import {get_avatar} from "$lib/utils/hugin-utils.js";

//Default values
export const user = writable({
    loggedIn: true,
    username: 'Anon',
    balance: [0, 0],
    boardsArray: ['Home'],
    node: '',
    activeChat: null,
    huginAddress: '',
    syncState: '',
    walletBlockCount: null,
    localDaemonBlockCount: null,
    networkBlockCount: null,
    call: {},
    thisBoard: null,
    contacts: null,
    addBoard: false,
    addChat: false,
    replyTo: {reply: false}
})

export const userAvatar = derived(user, $user => {
    if ($user.huginAddress.length > 15) {
        return get_avatar($user.huginAddress.substring(0,99))
    }
})
