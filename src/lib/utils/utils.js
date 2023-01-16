import { user } from '$lib/stores/user.js'

export function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1)
}

export function numberWithCommas(numbers) {
    return numbers.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function prettyNumbers(amount) {
    /* Get the amount we need to divide atomic units by. 2 decimal places = 100 */
    const divisor = Math.pow(10, 5)
    const dollars = amount >= 0 ? Math.floor(amount / divisor) : Math.ceil(amount / divisor)
    /* Make sure 1 is displaced as 01 */
    const cents = Math.abs(amount % divisor)
        .toString()
        .padStart(5, '0')
    /* Makes our numbers thousand separated. https://stackoverflow.com/a/2901298/8737306 */
    const formatted = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return formatted + '.' + cents + ' ' + 'XKR'
}

export const openURL = (link) => {
    window.api.send('openLink', link)
}

export const calcTime = (ms) => {
    const s = ('0' + Math.floor((ms / 1000) % 60)).substr(-2)
    const m = ('0' + Math.floor((ms / (60 * 1000)) % 60)).substr(-2)
    const h = Math.floor(ms / (60 * 60 * 1000))
    return h + ':' + m + ':' + s
}

export const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

export const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

//Checks for messages that only coinatins emojis.
export const containsOnlyEmojis = (text) => {
    const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '')
    const visibleChars = text.replace(new RegExp('[\n\rs]+|( )+', 'g'), '')
    return onlyEmojis.length === visibleChars.length
}

export const checkWait = async (data) => {
    
    if (data.name === "Optimizing" && data.optimized) {

        user.update((a) => {
            return {
                ...a,
                wait: true,
            }
        })

        //Wait 3 minutes
        await sleep(180 * 1000)

        user.update((a) => {
            return {
                ...a,
                wait: false,
            }
        })
    }

}
