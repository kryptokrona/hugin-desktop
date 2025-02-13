import { writable } from 'svelte/store'

export const remoteFiles = writable([])

export const localFiles = writable([])

export const upload = writable([])

export const download = writable([])

export const fileSettings = writable({
    showFiles: false,
})

export const fileViewer = writable({
    focusImage: "",
    enhanceImage: false,
    size: 0,
    hash: "",
    topic: ""
})