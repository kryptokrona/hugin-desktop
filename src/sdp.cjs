const en = require('int-encoder')

const expand_sdp_offer = (compressed_string) => {
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

    console.log('Pörts:', prts)

    let prio = 2122260223

    let tcp_prio = 1518280447

    let i = 1
    let j = 1
    let external_port_found = false

    let current_internal = ''
    let port
    prts.forEach(function (port) {
        console.log('checking in offer port', port)
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
                ' generation 0 network-id 1 network-cost 50\r\n'
        } else if (port.substring(0, port.length - 1) == '9') {
            candidates[j] +=
                'a=candidate:3377426864 1 tcp ' +
                tcp_prio +
                ' ' +
                ips[ip_index].replace('?', '') +
                ' ' +
                port.substring(0, port.length - 1) +
                ' typ host tcptype active generation 0 network-id 1 network-cost 50\r\n'
            tcp_prio = tcp_prio - 500
        } else {
            candidates[j] +=
                'a=candidate:1410536466 1 udp ' +
                prio +
                ' ' +
                ips[ip_index].replace('?', '') +
                ' ' +
                port.substring(0, port.length - 1) +
                ' typ host generation 0 network-id 1 network-cost 10\r\n'
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

    console.log('candidates', candidates)
    console.log('ports:', external_ports)

    console.log(external_ports.length / 3)
    console.log((external_ports.length / 3) * 2)

    if (!external_ports[0]) {
        external_ports[0] = '9'
    }

    let sdp =
        `v=0
o=- 5726742634414877819 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=extmap-allow-mixed
a=msid-semantic: WMS ` +
        msid +
        `
m=audio ` +
        external_ports[0] +
        ` UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 126
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
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=sendrecv
a=msid:` +
        msid +
        ` 333cfa17-df46-4ffc-bd9a-bc1c47c90485
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:63 red/48000/2
a=fmtp:63 111/111
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
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
        ` UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127 121 125 107 108 109 124 120 123 119 35 36 41 42 114 115 116 117 118
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
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:actpass
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
${
    type == 'Δ'
        ? 'a=sendrecv\r\na=msid:' +
          msid +
          ' 0278bd6c-5efa-4fb7-838a-d9ba6a1d8baa'
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
a=fmtp:98 profile-id=0
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 VP9/90000
a=rtcp-fb:100 goog-remb
a=rtcp-fb:100 transport-cc
a=rtcp-fb:100 ccm fir
a=rtcp-fb:100 nack
a=rtcp-fb:100 nack pli
a=fmtp:100 profile-id=2
a=rtpmap:101 rtx/90000
a=fmtp:101 apt=100
a=rtpmap:127 H264/90000
a=rtcp-fb:127 goog-remb
a=rtcp-fb:127 transport-cc
a=rtcp-fb:127 ccm fir
a=rtcp-fb:127 nack
a=rtcp-fb:127 nack pli
a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:121 rtx/90000
a=fmtp:121 apt=127
a=rtpmap:125 H264/90000
a=rtcp-fb:125 goog-remb
a=rtcp-fb:125 transport-cc
a=rtcp-fb:125 ccm fir
a=rtcp-fb:125 nack
a=rtcp-fb:125 nack pli
a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:107 rtx/90000
a=fmtp:107 apt=125
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:109 rtx/90000
a=fmtp:109 apt=108
a=rtpmap:124 H264/90000
a=rtcp-fb:124 goog-remb
a=rtcp-fb:124 transport-cc
a=rtcp-fb:124 ccm fir
a=rtcp-fb:124 nack
a=rtcp-fb:124 nack pli
a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
a=rtpmap:120 rtx/90000
a=fmtp:120 apt=124
a=rtpmap:123 H264/90000
a=rtcp-fb:123 goog-remb
a=rtcp-fb:123 transport-cc
a=rtcp-fb:123 ccm fir
a=rtcp-fb:123 nack
a=rtcp-fb:123 nack pli
a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f
a=rtpmap:119 rtx/90000
a=fmtp:119 apt=123
a=rtpmap:35 H264/90000
a=rtcp-fb:35 goog-remb
a=rtcp-fb:35 transport-cc
a=rtcp-fb:35 ccm fir
a=rtcp-fb:35 nack
a=rtcp-fb:35 nack pli
a=fmtp:35 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f
a=rtpmap:36 rtx/90000
a=fmtp:36 apt=35
a=rtpmap:41 AV1/90000
a=rtcp-fb:41 goog-remb
a=rtcp-fb:41 transport-cc
a=rtcp-fb:41 ccm fir
a=rtcp-fb:41 nack
a=rtcp-fb:41 nack pli
a=rtpmap:42 rtx/90000
a=fmtp:42 apt=41
a=rtpmap:114 H264/90000
a=rtcp-fb:114 goog-remb
a=rtcp-fb:114 transport-cc
a=rtcp-fb:114 ccm fir
a=rtcp-fb:114 nack
a=rtcp-fb:114 nack pli
a=fmtp:114 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f
a=rtpmap:115 rtx/90000
a=fmtp:115 apt=114
a=rtpmap:116 red/90000
a=rtpmap:117 rtx/90000
a=fmtp:117 apt=116
a=rtpmap:118 ulpfec/90000
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
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:actpass
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`

    console.log('ice', ice_ufrag)
    console.log('ice', ice_pwd)
    console.log('fingerprint', fingerprint)
    console.log('SRCS', ssrc)
    console.log('MSID', msid)
    console.log('candidates', candidates)
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
                    ' generation 0 network-id 1 network-cost 50\r\n'
            } else if (port.substring(0, port.length - 1) == '9') {
                candidates +=
                    'a=candidate:3377426864 1 tcp ' +
                    tcp_prio +
                    ' ' +
                    ips[ip_index].replace('?', '').replace('!', '') +
                    ' ' +
                    port.substring(0, port.length - 1) +
                    ' typ host tcptype active generation 0 network-id 1 network-cost 50\r\n'
                tcp_prio = tcp_prio - 500
            } else {
                candidates +=
                    'a=candidate:1410536466 1 udp ' +
                    prio +
                    ' ' +
                    ips[ip_index].replace('?', '') +
                    ' ' +
                    port.substring(0, port.length - 1) +
                    ' typ host generation 0 network-id 1 network-cost 10\r\n'
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
            ' typ host generation 0 network-id 1 network-cost 10\r\n'
    }

    if (!external_port) {
        external_port = '9'
    }

    let sdp =
        `v=0
o=- 8377786102162672707 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=extmap-allow-mixed
a=msid-semantic: WMS ` +
        msid +
        `
m=audio ` +
        external_port +
        ` UDP/TLS/RTP/SAVPF 111 63 103 104 9 0 8 106 105 13 110 112 113 126
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
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:active
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=sendrecv
a=msid:` +
        msid +
        ` a18f5f6a-2e4e-4012-8caa-8c28936bdb66
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
a=rtpmap:63 red/48000/2
a=fmtp:63 111/111
a=rtpmap:103 ISAC/16000
a=rtpmap:104 ISAC/32000
a=rtpmap:9 G722/8000
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
        ` cname:vhWDFlNcJ4vSUvs5
m=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 127 121 125 107 108 109 124 120 123 119 35 36 41 42 114 115 116 117 118
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:` +
        ice_ufrag +
        `
a=ice-pwd:` +
        ice_pwd +
        `
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:active
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:5 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:10 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:11 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
${
    type == 'δ'
        ? 'a=sendrecv\r\na=msid:' +
          msid +
          ' 06691570-5673-40ba-a027-72001bbc6f70'
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
a=fmtp:98 profile-id=0
a=rtpmap:99 rtx/90000
a=fmtp:99 apt=98
a=rtpmap:100 VP9/90000
a=rtcp-fb:100 goog-remb
a=rtcp-fb:100 transport-cc
a=rtcp-fb:100 ccm fir
a=rtcp-fb:100 nack
a=rtcp-fb:100 nack pli
a=fmtp:100 profile-id=2
a=rtpmap:101 rtx/90000
a=fmtp:101 apt=100
a=rtpmap:127 H264/90000
a=rtcp-fb:127 goog-remb
a=rtcp-fb:127 transport-cc
a=rtcp-fb:127 ccm fir
a=rtcp-fb:127 nack
a=rtcp-fb:127 nack pli
a=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:121 rtx/90000
a=fmtp:121 apt=127
a=rtpmap:125 H264/90000
a=rtcp-fb:125 goog-remb
a=rtcp-fb:125 transport-cc
a=rtcp-fb:125 ccm fir
a=rtcp-fb:125 nack
a=rtcp-fb:125 nack pli
a=fmtp:125 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:107 rtx/90000
a=fmtp:107 apt=125
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:109 rtx/90000
a=fmtp:109 apt=108
a=rtpmap:124 H264/90000
a=rtcp-fb:124 goog-remb
a=rtcp-fb:124 transport-cc
a=rtcp-fb:124 ccm fir
a=rtcp-fb:124 nack
a=rtcp-fb:124 nack pli
a=fmtp:124 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
a=rtpmap:120 rtx/90000
a=fmtp:120 apt=124
a=rtpmap:123 H264/90000
a=rtcp-fb:123 goog-remb
a=rtcp-fb:123 transport-cc
a=rtcp-fb:123 ccm fir
a=rtcp-fb:123 nack
a=rtcp-fb:123 nack pli
a=fmtp:123 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=4d001f
a=rtpmap:119 rtx/90000
a=fmtp:119 apt=123
a=rtpmap:35 H264/90000
a=rtcp-fb:35 goog-remb
a=rtcp-fb:35 transport-cc
a=rtcp-fb:35 ccm fir
a=rtcp-fb:35 nack
a=rtcp-fb:35 nack pli
a=fmtp:35 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=4d001f
a=rtpmap:36 rtx/90000
a=fmtp:36 apt=35
a=rtpmap:41 AV1/90000
a=rtcp-fb:41 goog-remb
a=rtcp-fb:41 transport-cc
a=rtcp-fb:41 ccm fir
a=rtcp-fb:41 nack
a=rtcp-fb:41 nack pli
a=rtpmap:42 rtx/90000
a=fmtp:42 apt=41
a=rtpmap:114 H264/90000
a=rtcp-fb:114 goog-remb
a=rtcp-fb:114 transport-cc
a=rtcp-fb:114 ccm fir
a=rtcp-fb:114 nack
a=rtcp-fb:114 nack pli
a=fmtp:114 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f
a=rtpmap:115 rtx/90000
a=fmtp:115 apt=114
a=rtpmap:116 red/90000
a=rtpmap:117 rtx/90000
a=fmtp:117 apt=116
a=rtpmap:118 ulpfec/90000
${
    type == 'δ'
        ? 'a=ssrc-group:FID ' +
          ssrc[1] +
          ' ' +
          ssrc[2] +
          '\r\n' +
          'a=ssrc:' +
          ssrc[1] +
          ' cname:0v7phLz3L82cIhVT' +
          '\r\n' +
          `a=ssrc:` +
          ssrc[2] +
          ' cname:0v7phLz3L82cIhVT' +
          '\r\n'
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
a=fingerprint:sha-256 ` +
        fingerprint +
        `
a=setup:active
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`

    console.log('ice', ice_ufrag)
    console.log('ice', ice_pwd)
    console.log('fingerprint', fingerprint)
    console.log('SRCS', ssrc)
    console.log('MSID', msid)
    console.log('candidates', candidates)

    return { type: 'answer', sdp: sdp }
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
    console.log('almost', decoded_fingerprint)

    decoded_fingerprint = decoded_fingerprint
        .toUpperCase()
        .replace(/(.{2})/g, '$1:')
        .slice(0, -1)

    console.log('There', decoded_fingerprint)

    return decoded_fingerprint
}

let decode_ip = (ip, type) => {
    let decoded_ip = ''

    let letters = atob(ip).split('')
    letters.forEach(function (letter) {
        if (letter.length > 1) return
        let piece = letter.charCodeAt(0).toString(16)

        if (piece.length === 1) {
            piece = '0' + piece
        }

        decoded_ip += parseInt(piece, 16) + '.'
    })

    console.log('decoded ip', decoded_ip)

    return type + decoded_ip.slice(0, -1)
}

module.exports = {expand_sdp_answer, expand_sdp_offer}
