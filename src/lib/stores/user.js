import { writable, derived } from "svelte/store";
import {get_avatar} from "$lib/utils/hugin-utils.js";

//Default values
export const user = writable({
    loggedIn: false,
    username: 'nilsjr!',
    boardsArray: ['Home', 'hugin-development','test', 'software-devs', 'softwaredevs'],
    node: '',
    activeChat: null,
    huginAddress: '',
    syncState: '',
    call: {},
    thisBoard: 'All',
    contacts: null,
    addBoard: false,
    addChat: false
})

export const userAvatar = derived(user, $user => {
    if ($user.huginAddress.length > 15) {
        return get_avatar($user.huginAddress.substring(0,99))
    }
})
