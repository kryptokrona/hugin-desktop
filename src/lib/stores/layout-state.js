import {writable} from 'svelte/store'

//Default values at start
export const layoutState = writable({
    hideChatList: false,
    hideGroupList: false,
    showNodeSelector: false,
    showFaucetButton: true,
    showActiveList: false,
})

export const videoGrid = writable({
    showChat: false,
    showVideoGrid: true,
})
