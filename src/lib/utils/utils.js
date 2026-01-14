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
    return formatted + '.' + cents + ' ' + ''
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
    if (!isLatin(text)) return false
    const onlyEmojis = text.replace(new RegExp('[\u0000-\u1eeff]', 'g'), '')
    const visibleChars = text.replace(new RegExp('[\n\rs]+|( )+', 'g'), '')
    return onlyEmojis.length === visibleChars.length

}

export const isLatin = (text) => {
    const REGEX_CHINESE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/;
    const isChinese = text?.match(REGEX_CHINESE);
    if(isChinese) return false
    const REGEX_JAPAN = /[\u3040-\u30FF\u31F0-\u31FF\uFF00-\uFFEF]/;
    const isJapanese = text?.match(REGEX_JAPAN);
    if(isJapanese) return false
    const REGEX_KOREA = /[\u1100-\u11FF\u3130-\u318F\uAC00-\uD7AF]/;
    const isKorean = text?.match(REGEX_KOREA);
    if(isKorean) return false
    return true
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

export const hashPadding = () => {
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString()
}

export function extractHuginLinkAndClean(text) {
  const regex = /hugin:\/\/[^\s]+\/[a-fA-F0-9]{128}/;
  const match = text.match(regex);

  if (match && match[0]) {
    const huginLink = match[0];
    const cleanedMessage = text.replace(huginLink, '').trim();
    return { huginLink, cleanedMessage };
  }

  return { huginLink: '', cleanedMessage: text };
}

