import { writable } from "svelte/store";

//Default values
export const user = writable({
    loggedIn: false,
    username: 'Nilsjr',
    boardsArray: ['Home', 'Hugin'],
    node: '',
    activeChat: null,
    huginAddress: '',
    syncState: '',
    call: {},
    thisBoard: "test"
})
