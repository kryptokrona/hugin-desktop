import { derived, writable } from 'svelte/store'

export const search = writable({
    term: '',
})
