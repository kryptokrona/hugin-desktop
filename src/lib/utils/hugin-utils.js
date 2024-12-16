import Identicon from 'identicon.js'
import intToRGB from 'int-to-rgb'

export function get_avatar(hash, format = 'png', big = false) {
    // Get custom color scheme based on address
    let rgb = intToRGB(hashCode(hash))
    let size = 40
    if (big) size = 200
    // Options for avatar
    let options = {
        foreground: [rgb.red, rgb.green, rgb.blue, 255], // rgba black
        background: [parseInt(rgb.red / 10), parseInt(rgb.green / 10), parseInt(rgb.blue / 10), 0], // rgba white
        margin: 0.2, // 20% margin
        size: size, // 420px square
        format: format, // use SVG instead of PNG
    }

    // create a base64 encoded SVG
    return new Identicon(hash, options).toString()
}

export const getColorFromHash = (hash) => {
    let hashValue = 0;
    for (let i = 0; i < hash.length; i++) {
      hashValue = hash.charCodeAt(i) + ((hashValue << 5) - hashValue);
    }
  
    let color = '#';
    const rgb = [];
  
    for (let i = 0; i < 3; i++) {
      const value = (hashValue >> (i * 8)) & 0xff;
      rgb.push(value);
      color += ('00' + value.toString(16)).slice(-2);
    }
  
    const brightness = (0.299 * rgb[0] + 0.587 * rgb[1] + 0.114 * rgb[2]) / 255;
    if (brightness < 0.7) {
      const brightenedRgb = rgb.map((component) => Math.min(255, Math.floor(component + (255 - component) * 0.7)));
      color = '#';
      brightenedRgb.forEach((component) => {
        color += ('00' + component.toString(16)).slice(-2);
      });
    }
  
    return color;
  };


export async function get_board_icon(board) {
    return intToRGB(hashCode(board))
}

const hashCode = (str) => {
    let hash = Math.abs(str.hash_code()) * 0.007812499538
    return Math.floor(hash)
}

String.prototype.hash_code = function () {
    let hash = 0
    if (this.length == 0) {
        return hash
    }
    for (let i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i)
        hash = (hash << 5) - hash + char
        hash = hash & hash // Convert to 32bit integer
    }
    return hash
}
