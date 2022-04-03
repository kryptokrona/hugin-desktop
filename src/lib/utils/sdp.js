
import en from 'int-encoder';

export function expand_sdp_offer (compressed_string) {

  let type = compressed_string.substring(0,1);

  let split = compressed_string.split(",");

  let ice_ufrag = split[0].substring(1);

  let ice_pwd = split[1];

  let fingerprint = decode_fingerprint(split[2]);

  let ips = split[3];

  let ports =  split[4];

  let ssrc = split[5].split('&').map(function (h) {
    return en.decode(h);
  });

  let msid = split[6];

  let external_ip = '';

  let external_ports = [];

  let candidates = ['','','',''];

  ips = ips.split('&').map(function (h) {
    return decode_ip(h.substring(1),h.substring(0,1));
  })

  ports = ports.split('&').map(function (h) {
    return en.decode(h);
  });

  console.log("Pörts:", ports);


    let prio = 2122260223;

    let tcp_prio = 1518280447;

    let i = 1;
    let j = 1;
    let external_port_found = false;

    let current_internal = '';

    for (port in ports) {
      let ip_index = ports[port].slice(-1);
      if (i == 1 ) {

        current_internal = ports[port].substring(0, ports[port].length - 1);

      }
      if (ips[ip_index].substring(0,1) == '!') {
        external_ip = ips[ip_index].substring(1);
        external_ports = external_ports.concat(ports[port].substring(0, ports[port].length - 1));
        external_port_found = true;
        candidates[j] += "a=candidate:3098175849 1 udp 1686052607 " + ips[ip_index].replace('!','') + " " + ports[port].substring(0, ports[port].length - 1) + " typ srflx raddr " + ips[0].replace('!','').replace('?','') + " rport " + current_internal + " generation 0 network-id 1 network-cost 50\r\n"
      } else if (ports[port].substring(0, ports[port].length - 1) == "9") {

        candidates[j] += "a=candidate:3377426864 1 tcp "  + tcp_prio + " " + ips[ip_index].replace('?','') + " " + ports[port].substring(0, ports[port].length - 1) +  " typ host tcptype active generation 0 network-id 1 network-cost 50\r\n"
        tcp_prio = tcp_prio - 500;

      } else {
        candidates[j] += "a=candidate:1410536466 1 udp " + prio + " " + ips[ip_index].replace('?','') + " " + ports[port].substring(0, ports[port].length - 1) + " typ host generation 0 network-id 1 network-cost 10\r\n"
        prio = parseInt(prio*0.8);
      }


    if ( i == (ports.length / 3) ) {
      i = 0;
      j += 1;
      external_port_found = false;
    }

    i += 1;

  }

  if (external_ip.length == 0) {
    external_ip = ips[0].substring(1);
  }

  console.log(candidates);
  console.log("ports:",external_ports);

  console.log((external_ports.length / 3));
  console.log(((external_ports.length / 3)*2));

if (!external_ports[0]) {
  external_ports[0] = "9";
}

let sdp = `v=0
o=- 5726742634414877819 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=msid-semantic: WMS ` + msid + `
m=audio ` + external_ports[0] + ` UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates[1] +
`a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:actpass
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:5 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:6 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
a=sendrecv
a=msid:` + msid + ` 333cfa17-df46-4ffc-bd9a-bc1c47c90485
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
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
a=ssrc:` + ssrc[0] + ` cname:c2J8K3mNIXGEi9qt
a=ssrc:` + ssrc[0] + ` msid:` + msid + ` 333cfa17-df46-4ffc-bd9a-bc1c47c90485
a=ssrc:` + ssrc[0] + ` mslabel:` + msid + `
a=ssrc:` + ssrc[0] + ` label:333cfa17-df46-4ffc-bd9a-bc1c47c90485
m=video ` + external_ports[(external_ports.length / 3)] +  ` UDP/TLS/RTP/SAVPF 102 104 106 108
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates[2] +
`a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:actpass
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:12 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:11 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07
a=extmap:9 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:5 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:6 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
${type == 'Δ' ? "a=sendrecv\r\na=msid:" + msid + " 0278bd6c-5efa-4fb7-838a-d9ba6a1d8baa" : "a=recvonly" }
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:102 H264/90000
a=rtcp-fb:102 goog-remb
a=rtcp-fb:102 transport-cc
a=rtcp-fb:102 ccm fir
a=rtcp-fb:102 nack
a=rtcp-fb:102 nack pli
a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:104 H264/90000
a=rtcp-fb:104 goog-remb
a=rtcp-fb:104 transport-cc
a=rtcp-fb:104 ccm fir
a=rtcp-fb:104 nack
a=rtcp-fb:104 nack pli
a=fmtp:104 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:106 H264/90000
a=rtcp-fb:106 goog-remb
a=rtcp-fb:106 transport-cc
a=rtcp-fb:106 ccm fir
a=rtcp-fb:106 nack
a=rtcp-fb:106 nack pli
a=fmtp:106 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
${type == "Δ" ?
"a=ssrc:" + ssrc[1] + " cname:qwjy1Thr/obQUvqd\r\n" +
"a=ssrc:" + ssrc[1] + " msid:" + msid + " 6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n" +
"a=ssrc:" + ssrc[1] + " mslabel:" + msid + "\r\n" +
"a=ssrc:" + ssrc[1] + " label:6a080e8b-c845-4716-8c42-8ca0ab567ebe\r\n" : "" }m=application ` + external_ports[((external_ports.length / 3)*2)] + ` UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 ` + external_ip +  `
` + candidates[3] +
`a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:actpass
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`

return {type: "offer", sdp: sdp};

}

 export function expand_sdp_answer (compressed_string) {

  let split = compressed_string.split(",");

  console.log("split:", split);

  let type = compressed_string.substring(0,1);

  let ice_ufrag = split[0].substring(1);

  let ice_pwd = split[1];

  let fingerprint = decode_fingerprint(split[2]);

  let ips = split[3];

  let ports =  split[4];

  let ssrc = split[5].split('&').map(function (h) {
    return en.decode(h);
  });


  if (ssrc[1] == undefined) {
    ssrc[1] = ssrc[0];
  }

  let msid = split[6];

  let candidates = '';

  let external_ip = '';

  ips = ips.split('&').map(function (h) {
    return decode_ip(h.substring(1),h.substring(0,1));
  })

  ports = ports.split('&').map(function (h) {
    return en.decode(h);
  });;

  let external_port = '';

  console.log("ips:", ips);
  console.log("ports:", ports);

  let prio = 2122260223;
  let tcp_prio = 1518280447;

  if (ports.length > 1) {

    console.log('More than 1 port!');

      for (port in ports) {
        let ip_index = ports[port].slice(-1);
        if (ips[ip_index].substring(0,1) == '!') {
          if (external_port.length == 0) {
            external_port = ports[port].substring(0, ports[port].length - 1);
          }
          external_ip = ips[ip_index].substring(1);
          candidates += "a=candidate:3098175849 1 udp 1686052607 " + ips[ip_index].replace('!','') + " " + ports[port].substring(0, ports[port].length - 1)  + " typ srflx raddr " + ips[0].replace('?','') + " rport " + ports[0].substring(0, ports[port].length - 1)  + " generation 0 network-id 1 network-cost 50\r\n"
        } else if (ports[port].substring(0, ports[port].length - 1)  == "9") {

          candidates += "a=candidate:3377426864 1 tcp "  + tcp_prio + " " + ips[ip_index].replace('?','').replace('!','') + " " + ports[port].substring(0, ports[port].length - 1)  +  " typ host tcptype active generation 0 network-id 1 network-cost 50\r\n"
          tcp_prio = tcp_prio - 500;

        } else {

          candidates += "a=candidate:1410536466 1 udp " + prio + " " + ips[ip_index].replace('?','') + " " + ports[port].substring(0, ports[port].length - 1)  + " typ host generation 0 network-id 1 network-cost 10\r\n"
          prio = parseInt(prio*0.8);
        }


      }

  } else {

    external_ip = ips[0].replace('!','').replace('?','');

    external_port = ports[0].substring(0, ports[0].length - 1) ;
    candidates = "a=candidate:1410536466 1 udp 2122260223 " + ips[0].replace('!','').replace('?','') + " " + ports[0].substring(0, ports[0].length - 1)  + " typ host generation 0 network-id 1 network-cost 10\r\n"
  }

if (!external_port) {
  external_port = "9";
}

  let sdp = `v=0
o=- 8377786102162672707 2 IN IP4 127.0.0.1
s=-
t=0 0
a=group:BUNDLE 0 1 2
a=msid-semantic: WMS ` + msid + `
m=audio ` + external_port + ` UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126
c=IN IP4 ` + external_ip + `
a=rtcp:9 IN IP4 0.0.0.0
` + candidates +
`a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:active
a=mid:0
a=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:5 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:6 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
a=sendrecv
a=msid:` + msid + ` a18f5f6a-2e4e-4012-8caa-8c28936bdb66
a=rtcp-mux
a=rtpmap:111 opus/48000/2
a=rtcp-fb:111 transport-cc
a=fmtp:111 minptime=10;useinbandfec=1
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
a=ssrc:` + ssrc[0] +  ` cname:vhWDFlNcJ4vSUvs5
m=video 9 UDP/TLS/RTP/SAVPF 102 104 106 108
c=IN IP4 0.0.0.0
a=rtcp:9 IN IP4 0.0.0.0
a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:active
a=mid:1
a=extmap:14 urn:ietf:params:rtp-hdrext:toffset
a=extmap:2 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time
a=extmap:13 urn:3gpp:video-orientation
a=extmap:3 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01
a=extmap:12 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay
a=extmap:11 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type
a=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-timing
a=extmap:8 http://tools.ietf.org/html/draft-ietf-avtext-framemarking-07
a=extmap:9 http://www.webrtc.org/experiments/rtp-hdrext/color-space
a=extmap:4 urn:ietf:params:rtp-hdrext:sdes:mid
a=extmap:5 urn:ietf:params:rtp-hdrext:sdes:rtp-stream-id
a=extmap:6 urn:ietf:params:rtp-hdrext:sdes:repaired-rtp-stream-id
${type == 'δ' ? "a=sendrecv\r\na=msid:" + msid + " 06691570-5673-40ba-a027-72001bbc6f70" : "a=inactive"}
a=rtcp-mux
a=rtcp-rsize
a=rtpmap:102 H264/90000
a=rtcp-fb:102 goog-remb
a=rtcp-fb:102 transport-cc
a=rtcp-fb:102 ccm fir
a=rtcp-fb:102 nack
a=rtcp-fb:102 nack pli
a=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f
a=rtpmap:104 H264/90000
a=rtcp-fb:104 goog-remb
a=rtcp-fb:104 transport-cc
a=rtcp-fb:104 ccm fir
a=rtcp-fb:104 nack
a=rtcp-fb:104 nack pli
a=fmtp:104 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42001f
a=rtpmap:106 H264/90000
a=rtcp-fb:106 goog-remb
a=rtcp-fb:106 transport-cc
a=rtcp-fb:106 ccm fir
a=rtcp-fb:106 nack
a=rtcp-fb:106 nack pli
a=fmtp:106 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f
a=rtpmap:108 H264/90000
a=rtcp-fb:108 goog-remb
a=rtcp-fb:108 transport-cc
a=rtcp-fb:108 ccm fir
a=rtcp-fb:108 nack
a=rtcp-fb:108 nack pli
a=fmtp:108 level-asymmetry-allowed=1;packetization-mode=0;profile-level-id=42e01f
a=ssrc:` + ssrc[1] + ` cname:0v7phLz3L82cIhVT
m=application 9 UDP/DTLS/SCTP webrtc-datachannel
c=IN IP4 0.0.0.0
b=AS:30
a=ice-ufrag:` + ice_ufrag + `
a=ice-pwd:` + ice_pwd + `
a=fingerprint:sha-256 ` + fingerprint +  `
a=setup:active
a=mid:2
a=sctp-port:5000
a=max-message-size:262144
`


  return {type: 'answer', sdp: sdp}
}

let decode_fingerprint = (fingerprint) => {
  let decoded_fingerprint = "";

  for (letter in atob(fingerprint).split('')) {

    let piece = atob(fingerprint).split('')[letter].charCodeAt(0).toString(16);
    if (piece.length == 1) {
      piece = "0" + piece;
    }
    decoded_fingerprint += piece;


  }

  decoded_fingerprint = decoded_fingerprint.toUpperCase().replace(/(.{2})/g,"$1:").slice(0,-1);


  return decoded_fingerprint;
}

let decode_ip = (ip, type) => {
  let decoded_ip = "";

  for (letter in atob(ip).split('')) {

    let piece = atob(ip).split('')[letter].charCodeAt(0).toString(16);
    if (piece.length == 1) {
      piece = "0" + piece;
    }
    decoded_ip += parseInt(piece, 16) + ".";


  }

  // decoded_fingerprint = decoded_fingerprint.toUpperCase().replace(/(.{2})/g,"$1:").slice(0,-1);


  return type+decoded_ip.slice(0,-1);
}
