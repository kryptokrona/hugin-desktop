import {browser} from "$app/environment";
import toast from "svelte-5-french-toast";
import {layoutState} from "$lib/stores/layout-state.js";
import { checkWait, sleep } from "$lib/utils/utils";
let success = new Audio('/audio/success.mp3')
import {sounds, misc} from '$lib/stores/user.js'
import { get } from 'svelte/store';
import { randomNode } from '$lib/stores/nodes.js';

if (browser) {

    window.api.receive('error_msg', async (error) => {
        console.log('Error', error)
        toast.error(`${error.message}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

    window.api.receive('node-not-ok', async () => {
        toast.error('Could not connect to node', {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })

        const currentMisc = get(misc);
        if (currentMisc.autoSelectNode) {
            const newNode = await randomNode();
            if (newNode) {
                misc.update(m => {
                    m.node = newNode;
                    return m;
                });
                window.api.switchNode(newNode);
                toast.success(`Auto-connected to ${newNode}`, {
                    position: 'top-right',
                    style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
                });
                return;
            }
        }

        layoutState.update(current => {
            return {
                ...current,
                showNodeSelector: true,
            }
        })
    })

    window.api.receive('sent_tx', async (data) => {

        toast.success(`${data.message}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })

        checkWait(data)
       
    })

    window.api.receive('error-notify-message', (data)  => { 
        toast.error(`${data}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

    window.api.receive('success-notify-message', (data, sound)  => {
        toast.success(`${data}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })

        if (get(sounds).on && sound) {
            success.volume = 0.3 // 30% volume
            success.play()
        }
            

    })

}