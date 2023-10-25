const en = require('int-encoder')

const expand_sdp_offer = (compressed_string, incoming = false) => {

    console.log('Expanding sdp offer..');

    let type = compressed_string.substring(0, 1)

    let split = compressed_string.split(',')

    let ice_ufrag = split[0].substring(1)

    let ice_pwd = split[1]

    let fingerprint = decode_fingerprint(split[2])

    let ips = split[3]

    let prts = split[4]

    let external_ip = ''

    let external_ports = []

    let candidates = ['', '', '', '']

    ips = ips.split('&').map(function (h) {
        return decode_ip(h.substring(1), h.substring(0, 1))
    })

    prts = prts.split('&').map(function (h) {
        return en.decode(h)
    })

    let prio = 2122260223

    let tcp_prio = 1518280447

    let i = 1
    let j = 1
    let external_port_found = false

    let current_internal = ''
    let port
    prts.forEach(function (port) {
        let ip_index = port.slice(-1)
        if (i == 1) {
            current_internal = port.substring(0, port.length - 1)
        }
        if (ips[ip_index].substring(0, 1) == '!') {
            external_ip = ips[ip_index].substring(1)
            external_ports = external_ports.concat(
                port.substring(0, port.length - 1)
            )
            external_port_found = true
            candidates[j] +=
                'a=candidate:3098175849 1 udp 1686052607 ' +
                ips[ip_index].replace('!', '') +
                ' ' +
                port.substring(0, port.length - 1) +
                ' typ srflx raddr ' +
                ips[0].replace('!', '').replace('?', '') +
                ' rport ' +
                current_internal +
                ' generation 0 network-id 3 network-cost 10\r\n'
        } else if (port.substring(0, port.length - 1) == '9') {
            candidates[j] +=
                'a=candidate:3377426864 1 tcp ' +
                tcp_prio +
                ' ' +
                ips[ip_index].replace('?', '') +
                ' ' +
                port.substring(0, port.length - 1) +
                ' typ host tcptype active generation 0 network-id 3 network-cost 10\r\n'
            tcp_prio = tcp_prio - 500
        } else {
            candidates[j] +=
                'a=candidate:1410536466 1 udp ' +
                prio +
                ' ' +
                ips[ip_index].replace('?', '') +
                ' ' +
                port.substring(0, port.length - 1) +
                ' typ host generation 0 network-id 3 network-cost 10\r\n'
            prio = parseInt(prio * 0.8)
        }


        if (i == prts.length / 3) {
            i = 0
            j += 1
            external_port_found = false
        }
        
        i += 1
     })

    let external_ip_out = ipv6(external_ip) ? 'c=IN IP6 ' + external_ip : 'c=IN IP4 ' + external_ip;

    console.log(external_ports.length / 3)
    console.log((external_ports.length / 3) * 2)

    if (!external_ports[0]) {
        external_ports[0] = '9'
    }

    let sdp =
        `v=0
o=- 5726742634414877819 3 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS
m=application ` +
        external_ports[0] +
        ` UDP/DTLS/SCTP webrtc-datachannel
` +
        external_ip_out +
        `
` +
        candidates[1] +
        `a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:active
a=mid:0
a=sctp-port:5000
a=max-message-size:262144
`

    return { type: 'offer', sdp: sdp }
}


function ipv6(ip) {
    return ip.split(':').length == 8
}



const expand_sdp_answer = (compressed_string) => {
    let split = compressed_string.split(',')

    console.log('split:', split)

    let type = compressed_string.substring(0, 1)
    
    let ice_ufrag = split[0].substring(1)

    let ice_pwd = split[1]

    let fingerprint = decode_fingerprint(split[2])

    let ips = split[3]

    let prts = split[4]

    let candidates = ''

    let external_ip = ''

    ips = ips.split('&').map(function (h) {
        return decode_ip(h.substring(1), h.substring(0, 1))
    })

    prts = prts.split('&').map(function (h) {
        return en.decode(h)
    })

    let external_port = ''

    console.log('ips:', ips)
    console.log('ports:', prts)

    let prio = 2122260223
    let tcp_prio = 1518280447

    if (prts.length > 1) {
        console.log('More than 1 port!')
        let port
        prts.forEach(function (port) {
            console.log('checking in answer port', port)
            let ip_index = port.slice(-1)
            if (ips[ip_index].substring(0, 1) == '!') {
                if (external_port.length == 0) {
                    external_port = port.substring(0, port.length - 1)
                }
                external_ip = ips[ip_index].substring(1)
                candidates +=
                    'a=candidate:3098175849 1 udp 1686052607 ' +
                    ips[ip_index].replace('!', '') +
                    ' ' +
                    port.substring(0, port.length - 1) +
                    ' typ srflx raddr ' +
                    ips[0].replace('?', '') +
                    ' rport ' +
                    port.substring(0, port.length - 1) +
                    ' generation 0 network-id 3 network-cost 10\r\n'
            } else if (port.substring(0, port.length - 1) == '9') {
                candidates +=
                    'a=candidate:3377426864 1 tcp ' +
                    tcp_prio +
                    ' ' +
                    ips[ip_index].replace('?', '').replace('!', '') +
                    ' ' +
                    port.substring(0, port.length - 1) +
                    ' typ host tcptype active generation 0 network-id 3 network-cost 10\r\n'
                tcp_prio = tcp_prio - 500
            } else {
                candidates +=
                    'a=candidate:1410536466 1 udp ' +
                    prio +
                    ' ' +
                    ips[ip_index].replace('?', '') +
                    ' ' +
                    port.substring(0, port.length - 1) +
                    ' typ host generation 0 network-id 3 network-cost 10\r\n'
                prio = parseInt(prio * 0.8)
            }
        })
    } else {
        external_ip = ips[0].replace('!', '').replace('?', '')

        external_port = prts[0].substring(0, prts[0].length - 1)
        candidates =
            'a=candidate:1410536466 1 udp 2122260223 ' +
            ips[0].replace('!', '').replace('?', '') +
            ' ' +
            prts[0].substring(0, prts[0].length - 1) +
            ' typ host generation 0 network-id 3 network-cost 10\r\n'
    }

   let ip_out = ipv6(external_ip) ? 'c=IN IP6 ' + external_ip : 'c=IN IP4 ' + external_ip;

    if (!external_port) {
        external_port = '9'
    }

let sdp =
`v=0
o=- 5726742634414877819 3 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0
a=msid-semantic: WMS
m=application ` +
    external_port +
    ` UDP/DTLS/SCTP webrtc-datachannel
` +
    ip_out +
    `
` +
    candidates +
    `a=ice-ufrag:` +
    ice_ufrag +
    `
a=ice-pwd:` +
    ice_pwd +
    `
a=fingerprint:sha-256 ` +
    fingerprint +
    `
a=setup:passive
a=mid:0
a=sctp-port:5000
a=max-message-size:262144
`

    return { type: 'answer', sdp: sdp }
}


const parse_sdp = (sdp, answr = false) => {
    let ice_ufrag = ''
    let ice_pwd = ''
    let fingerprint = ''
    let ips = []
    let prts = []
    let ssrcs = []
    let msid = ''
    let ip
    let port

    let lines = sdp.sdp.split('\n').map((l) => l.trim()) // split and remove trailing CR
    lines.forEach(function (line) {
        if (line.includes('a=fingerprint:') && fingerprint == '') {

            let parts = line.substr(14).split(' ')
            let hex = line
                .substr(22)
                .split(':')
                .map(function (h) {
                    return parseInt(h, 16)
                })

            fingerprint = btoa(String.fromCharCode.apply(String, hex))

        } else if (line.includes('a=ice-ufrag:') && ice_ufrag == '') {
            ice_ufrag = line.substr(12)
        } else if (line.includes('a=ice-pwd:') && ice_pwd == '') {
            ice_pwd = line.substr(10)
        } else if (line.includes('a=candidate:')) {
            let candidate = line.substr(12).split(' ')

            ip = candidate[4]
            port = candidate[5]
            type = candidate[7]

            if (type == 'srflx') {
                ip = '!' + ip
            } else {
                ip = '?' + ip
            }


            if (!ips.includes(ip)) {
                ips = ips.concat(ip)
            }

            let indexedport = port + ips.indexOf(ip).toString()

            prts = prts.concat(en.encode(parseInt(indexedport)))
        } else if (line.includes('a=ssrc:')) {
            let ssrc = en.encode(line.substr(7).split(' ')[0])

            if (!ssrcs.includes(ssrc)) {
                ssrcs = ssrcs.concat(ssrc)
            }
        } else if (line.includes('a=msid-semantic:')) {
            msid = line.substr(16).split(' ')[2]
        }
    })

    return (
        ice_ufrag +
        ',' +
        ice_pwd +
        ',' +
        fingerprint +
        ',' +
        ips.join('&') +
        ',' +
        prts.join('&')
    )
}

let decode_fingerprint = (fingerprint) => {
    console.log('fingerprint', fingerprint)
    let decoded_fingerprint = ''
    let piece
    let letters = atob(fingerprint).split('')
    for (letter in letters) {
        try {
            let piece = letters[letter].charCodeAt(0).toString(16)
            console.log('del', piece)
            if (piece.length == 1) {
                piece = '0' + piece
            }
            decoded_fingerprint += piece
        } catch (err) {
            console.log('error', piece)
            console.log('error', letter)
        }
    }

    decoded_fingerprint = decoded_fingerprint
        .toUpperCase()
        .replace(/(.{2})/g, '$1:')
        .slice(0, -1)


    return decoded_fingerprint
}

let decode_ip = (ip, type) => {

    return type + ip;
}

module.exports = {expand_sdp_answer, expand_sdp_offer, parse_sdp}
