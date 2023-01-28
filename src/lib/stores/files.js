import { writable } from 'svelte/store'

export const remoteFiles = writable([])

export const localFiles = writable([])

export const upload = writable([])

export const download = writable([])

export const fileSettings = writable({
    showFiles: false,
})