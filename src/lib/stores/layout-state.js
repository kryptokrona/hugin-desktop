import { writable } from "svelte/store";

//Default values at start
export const layoutState = writable({
  hideChatList: true,
  hideGroupList: false,
  showNodeSelector: false,
})

export const videoGrid = writable({
  showChat: false,
  showVideoGrid: true,
})