const en = require('int-encoder')
const settings = {incoming: {ipv6: false}};

const expand_sdp_offer = (compressed_string, incoming = false) => {

    console.log('Expanding sdp offer..');

    let type = compressed_string.substring(0, 1)

    let split = compressed_string.split(',')

    let ice_ufrag = split[0].substring(1)

    let ice_pwd = split[1]

    let fingerprint = decode_fingerprint(split[2])

    let ips = split[3]

    let prts = split[4]

    let ssrc = split[5].split('&').map(function (h) {
        return en.decode(h)
    })

    let msid = split[6]

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
        if (ips[ip_index].length > 20 && incoming) {

            settings.incoming = {ipv6: true};

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

    if (external_ip.length == 0) {
        external_id = ips[0].substring(1)
    }

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
a=group:BUNDLE audio video data
a=msid-semantic: WMS ` +
        msid +
        `
m=audio ` +
        external_ports[0] +
        ` UDP/TLS/RTP/SAVPF 111 103 104 9 102 0 8 106 105 13 110 112 113 126
c=IN IP4 ` +
        external_ip +
        `
a=rtcp:9 IN IP4 0.0.0.0
` +
        candidates[1] +
        `a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=ice-options:trickle renomination
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:actpass
a=mid:audio
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
a=rtpmap:102 ILBC/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:106 CN/32000
a=rtpmap:105 CN/16000
a=rtpmap:13 CN/8000
a=rtpmap:110 telephone-event/48000
a=rtpmap:112 telephone-event/32000
a=rtpmap:113 telephone-event/16000
a=rtpmap:126 telephone-event/8000
a=ssrc:` +
        ssrc[0] +
        ` cname:c2J8K3mNIXGEi9qt
a=ssrc:` +
        ssrc[0] +
        ` msid:` +
        msid +
        ` 333cfa17-df46-4ffc-bd9a-bc1c47c90485
a=ssrc:` +
        ssrc[0] +
        ` mslabel:` +
        msid +
        `
a=ssrc:` +
        ssrc[0] +
        ` label:333cfa17-df46-4ffc-bd9a-bc1c47c90485
m=video ` +
        external_ports[external_ports.length / 3] +
        ` UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127
c=IN IP4 ` +
        external_ip +
        `
a=rtcp:9 IN IP4 0.0.0.0
` +
        candidates[2] +
        `a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=ice-options:trickle renomination
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:actpass
a=mid:video
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07
a=extmap:9 http://www.webrtc.org/experiments/rtp-hdrext/color-space
${
    type == 'Δ'
        ? 'a=sendrecv'
        : 'a=inactive'
}
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=rtpmap:97 rtx/90000
a=fmtp:97 apt=96
a=rtpmap:98 VP9/90000
a=rtcp-fb:98 goog-remb
a=rtcp-fb:98 transport-cc
a=rtcp-fb:98 ccm fir
a=rtcp-fb:98 nack
a=rtcp-fb:98 nack pli
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 red/90000
a=rtpmap:101 rtx/90000
a=fmtp:101 apt=100
a=rtpmap:127 ulpfec/90000
${
    type == 'Δ'
        ? 'a=ssrc-group:FID ' +
          ssrc[1] +
          ' ' +
          ssrc[2] +
          '\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' cname:qwjy1Thr/obQUvqd\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' msid:' +
          msid +
          ' 6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' mslabel:' +
          msid +
          '\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' label:6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' cname:qwjy1Thr/obQUvqd\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' msid:' +
          msid +
          ' 6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' mslabel:' +
          msid +
          '\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' label:6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n'
        : ''
}m=application ` +
        external_ports[(external_ports.length / 3) * 2] +
        ` UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 ` +
        external_ip +
        `
` +
        candidates[3] +
        `a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=ice-options:trickle renomination
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:actpass
a=mid:data
a=sctp-port:5000
a=max-message-size:262144
`

    return { type: 'offer', sdp: sdp }
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

    let ssrc = split[5].split('&').map(function (h) {
        return en.decode(h)
    })

    if (ssrc[1] == undefined) {
        ssrc[1] = ssrc[0]
    }

    let msid = split[6]

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

    if (!external_port) {
        external_port = '9'
    }

    let sdp =
        `v=0
o=- 8377786102162672707 3 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE audio video data
a=msid-semantic: WMS ` +
        msid +
        `
m=audio ` +
        external_port +
        ` UDP/TLS/RTP/SAVPF 111 103 104 9 102 0 8 106 105 13 110 112 113 126
c=IN IP4 ` +
        external_ip +
        `
a=rtcp:9 IN IP4 0.0.0.0
` +
        candidates +
        `a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=ice-options:trickle renomination
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:active
a=mid:audio
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=sendrecv
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
a=rtpmap:102 ILBC/8000
a=rtpmap:0 PCMU/8000
a=rtpmap:8 PCMA/8000
a=rtpmap:106 CN/32000
a=rtpmap:105 CN/16000
a=rtpmap:13 CN/8000
a=rtpmap:110 telephone-event/48000
a=rtpmap:112 telephone-event/32000
a=rtpmap:113 telephone-event/16000
a=rtpmap:126 telephone-event/8000
a=ssrc:` +
        ssrc[0] +
        ` cname:c2J8K3mNIXGEi9qt
a=ssrc:` +
        ssrc[0] +
        ` msid:` +
        msid +
        ` 333cfa17-df46-4ffc-bd9a-bc1c47c90485
a=ssrc:` +
        ssrc[0] +
        ` mslabel:` +
        msid +
        `
a=ssrc:` +
        ssrc[0] +
        ` label:333cfa17-df46-4ffc-bd9a-bc1c47c90485
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=ice-options:trickle renomination
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:active
a=mid:video
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07
a=extmap:9 http://www.webrtc.org/experiments/rtp-hdrext/color-space
${
    type == 'δ'
        ? 'a=sendrecv'
        : 'a=recvonly'
}
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:96 VP8/90000
a=rtcp-fb:96 goog-remb
a=rtcp-fb:96 transport-cc
a=rtcp-fb:96 ccm fir
a=rtcp-fb:96 nack
a=rtcp-fb:96 nack pli
a=rtpmap:97 rtx/90000
a=fmtp:97 apt=96
a=rtpmap:98 VP9/90000
a=rtcp-fb:98 goog-remb
a=rtcp-fb:98 transport-cc
a=rtcp-fb:98 ccm fir
a=rtcp-fb:98 nack
a=rtcp-fb:98 nack pli
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 red/90000
a=rtpmap:101 rtx/90000
a=fmtp:101 apt=100
a=rtpmap:127 ulpfec/90000
${
    type == 'δ'
        ? 'a=ssrc-group:FID ' +
          ssrc[1] +
          ' ' +
          ssrc[2] +
          '\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' cname:qwjy1Thr/obQUvqd\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' msid:' +
          msid +
          ' 6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' mslabel:' +
          msid +
          '\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' label:6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' cname:qwjy1Thr/obQUvqd\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' msid:' +
          msid +
          ' 6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' mslabel:' +
          msid +
          '\r\n' +
          'a=ssrc:' +
          ssrc[2] +
          ' label:6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n'
        : ''
}m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
b=AS:30
a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=ice-options:trickle renomination
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:active
a=mid:data
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
    let ipv6 = false

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

            if (ip.length > 20 && answr) {
                ipv6 = true
            }

            if (settings.incoming.ipv6 && answr && ip.length < 20 && ipv6) {
              return
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
            console.log('msid', msid)
        }
    })

    //Reset incoming ipv6 settings
    settings.incoming = {ipv6: false};

    return (
        ice_ufrag +
        ',' +
        ice_pwd +
        ',' +
        fingerprint +
        ',' +
        ips.join('&') +
        ',' +
        prts.join('&') +
        ',' +
        ssrcs.join('&') +
        ',' +
        msid
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
