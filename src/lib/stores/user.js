import { writable } from "svelte/store";

//Default values
export const user = writable({
    loggedIn: true,
    boardsArray: ['Home', 'Hugin'],
    node: '',
})