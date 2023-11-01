import {derived, writable} from 'svelte/store'

export const audioSettings = writable({
    audioInput: "",
    audioOutput: "",
})

export const videoSettings = writable({
    screenshare: false,
    myVideo: false,
    loading: false,
})

export const mediaSettings = writable({
    devices: [],
    cameraId: false,
})

export const video = writable({
    play: false,
})