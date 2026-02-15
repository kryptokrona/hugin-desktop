import {browser} from "$app/environment";
import {misc, transactionList} from "$lib/stores/user.js";

if(browser) {
    window.api.receive('node', async (node) => {
        misc.update((current) => {
            return {
                ...current,
                node: node,
            }
        })
    })


    window.api.receive('node-sync-data', (data) => {
        misc.update((current) => {
            return {
                ...current,
                walletBlockCount: data.walletBlockCount,
                networkBlockCount: data.networkBlockCount,
                localDaemonBlockCount: data.localDaemonBlockCount,
            }
        })
    })

    //Handle sync status
    window.api.receive('sync', (data) => {
        misc.update((current) => {
            return {
                ...current,
                syncState: data,
            }
        })
    })

    window.api.receive('transaction-update', (data) => {
        transactionList.update((current) => {
            return {
                ...current,
                txs: [data, ...current.txs],
            }
        })
    })
}