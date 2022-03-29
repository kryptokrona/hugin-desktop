import { writable } from "svelte/store";

//Default values
export const user = writable({
    loggedIn: true,
    username: 'Nilsjr',
    boardsArray: ['Home', 'Hugin'],
    node: '',
    activeContact: ''
})