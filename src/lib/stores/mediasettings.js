import {derived, writable} from 'svelte/store'

export const audioSettings = writable({
    audioInput: "",
    audioOutput: "",
})

export const videoSettings = writable({
    screenshare: false,
    myVideo: false,
    loading: false,
    active: false,
})

export const mediaSettings = writable({
    devices: [],
    cameraId: false,
    screenSources: [],
    screenId: false
})

export const video = writable({
    play: false,
})

export const voiceActivation = writable({
    enabled: false,
    sensitivity: 160,  // Default threshold (0-255)
})
