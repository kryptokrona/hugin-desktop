import { writable } from "svelte/store";

//Default values
export const user = writable({
    loggedIn: false,
    lang: 'en',
    theme: 'dark',
    board: 'home',
})