import { writable } from 'svelte/store'

export const js_wallet = writable({
    rescan: false,
})