import {browser} from "$app/environment";
import toast from "svelte-french-toast";
import {layoutState} from "$lib/stores/layout-state.js";
import { checkWait, sleep } from "$lib/utils/utils";

if (browser) {

    window.api.receive('error_msg', async (error) => {
        console.log('Error', error)
        toast.error(`${error.message}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

    window.api.receive('node-not-ok', () => {
        toast.error('Could not connect to node', {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
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

    window.api.receive('success-notify-message', (data)  => { 
        toast.success(`${data}`, {
            position: 'top-right',
            style: 'border-radius: 5px; background: #171717; border: 1px solid #252525; color: #fff;',
        })
    })

}