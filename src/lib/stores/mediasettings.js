import {derived, writable} from 'svelte/store'

export const audioSettings = writable({
    audioInput: "",
    audioOutput: "",
})

export const videoSettings = writable({
    cameraId: false,
    screenshare: false,
    myVideo: false,
    loading: false,
})

export const mediaSettings = writable({
    devices: [],
})