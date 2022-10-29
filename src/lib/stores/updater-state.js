import { writable } from 'svelte/store'

//Default values
export const appUpdateState = writable({
    updateAvailable: false,
    step: 1,
    percentageDownloaded: 0,
    dataDownloaded: 0,
    downloadSize: 0,
    downloadSpeed: 0,
})
