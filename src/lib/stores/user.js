import { writable, derived } from "svelte/store";
import {get_avatar} from "$lib/utils/hugin-utils.js";

//Default values
export const user = writable({
    loggedIn: false,
    username: 'Nilsjr',
    boardsArray: ['Home', 'Hugin'],
    node: '',
    activeChat: null,
    huginAddress: '',
    userAvatar: '',
    syncState: '',
    call: {},
    thisBoard: "test"
})

export const userAvatar = derived(user, $user => {
    if ($user.huginAddress.length > 15) {
        return get_avatar($user.huginAddress)
    }
})