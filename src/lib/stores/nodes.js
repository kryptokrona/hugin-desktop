import { writable, get } from 'svelte/store'

// items
const uri = 'https://raw.githubusercontent.com/kryptokrona/kryptokrona-public-nodes/main/nodes.json'

export const nodelist = writable([])
const standard = {
    "nodes": [
    {	
            "name": "KTH Node SSL",
            "url": "kth.kryptokrona.se",
            "port": 20176,
            "ssl": true,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.0",
            "proxy_url": "kthssl"
        },
    {
            "name": "TechyNode SSL",
            "url": "techypool.ddns.net/node",
            "port": 443,
            "ssl": true,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.1",
            "proxy_url": "TechyNode"
        },
    {
            "name": "KaffeNod SSL",
            "url": "kaffenod.xyz",
            "port": 443,
            "ssl": true,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.1",
            "proxy_url": "KaffeNodSSL"
        },
    {	
            "name": "KTH Node 2 SSL",
            "url": "kthnode2.vm-app.cloud.cbh.kth.se",
            "port": 443,
            "ssl": true,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.0",
            "proxy_url": "kthssl"
        },
    {
            "name": "KaffeNod",
            "url": "kaffenod.xyz",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.1",
            "proxy_url": "KaffeNod"
        },
        {
            "name": "Blocksum",
            "url": "blocksum.org",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.00",
            "proxy_url": "blocksum"
        },
        {
            "name": "XKR.la SSL",
            "url": "node.xkr.la",
            "port": 443,
            "ssl": true,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.00",
            "proxy_url": "XKRla"
        },
        {
            "name": "WoWoXu.Com SSL",
            "url": "node.wowoxu.com",
            "port": 443,
            "ssl": true,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.00",
            "proxy_url": "WoWoXu"
        },
        {
            "name": "Privacy Mine",
            "url": "privacymine.net",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.0",
            "fee": "0.00",
            "proxy_url": "privacymine"
        },
        {
            "name": "Privacy Mine SSL",
            "url": "privacymine.net",
            "port": 21898,
            "ssl": true,
            "cache": false,
            "version": "1.1.0",
            "fee": "0.00",
            "proxy_url": "privacymine"
        },
        {
            "name": "TechyNode",
            "url": "techypool.ddns.net",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.1",
            "proxy_url": "TechyNode"
        },
        {
            "name": "XKR Dutch Pool",
            "url": "kryptokrona.kalf.org",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.1",
            "proxy_url": "DutchPool"
        },
        {
            "name": "Wasa",
            "url": "wasa.kryptokrona.se",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.0",
            "proxy_url": "wasa"
        },
        {
            "name": "Tohelo's Node",
            "url": "xkr-tohelo101.duckdns.org",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.0",
            "proxy_url": "tohelo"
        },
        {
            "name": "XKR.network",
            "url": "node.xkr.network",
            "port": 80,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.0",
            "proxy_url": "xkrnetwork"
        },
        {
            "name": "XKR.network SSL",
            "url": "node.xkr.network",
            "port": 443,
            "ssl": true,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.0",
            "proxy_url": "xkrnetwork"
        },
    {
            "name": "Kryptokrona.no",
            "url": "node.kryptokrona.no",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.0",
            "proxy_url": "kryptokronano"
        },
    {
            "name": "KTH Node",
            "url": "130.237.83.246",
            "port": 20046,
            "ssl": false,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.0",
            "proxy_url": "kth"
        },
    {	
            "name": "KTH Node 2",
            "url": "kth.kryptokrona.se",
            "port": 20166,
            "ssl": false,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.0",
            "proxy_url": "kth2"
        },
        {
            "name": "Spider Pig",
            "url": "spider-pig.hopto.org",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.0",
            "proxy_url": "spider-pig"
        },  
        {
            "name": "Northern Lights",
            "url": "209.38.232.36",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.3",
            "fee": "0.0",
            "proxy_url": "northern-lights"
        }
    ],
    "apis": [
        {
            "url": "https://techypool.ddns.net",
            "name": "TechyPool API",
            "description": "The official TechyPool Hugin API"
        },
        {
            "url": "http://130.237.83.249:2592",
            "name": "KTH Hugin API",
            "description": "Hugin API hosted at KTH"
        }
      ],
    "hugin": [
    ]
}

const fetchNodes = async () => {
    try {
    const response = await fetch(uri)
    const result = await response.json()
    if (result.nodes.length === 0) {
        nodelist.set(standard)
        return
    }
    nodelist.set(result)
    } catch(e) {
        nodelist.set(standard)
    }
}

export async function getBestApi() {
    let apis = get(nodelist).apis
    apis = apis.sort((a, b) => 0.5 - Math.random())

    for(const api of apis) {
        console.log("this_api", api)
        const apiURL = `${api.url}/api/v1/posts-encrypted-group`
        try {
            const resp = await fetch(apiURL, {
                method: 'GET',
            }, 1000);
           if (resp.ok) {
            return apiURL;
           }
        } catch (e) {
            continue
          console.log(e);
        }
    }
    
    return false
  }

  export const getBestNode = async (ssl=true) => {

    let recommended_node = undefined;
    let ssl_nodes =[];
    if (ssl) {
        ssl_nodes = get(nodelist).nodes.filter(node => {return node.ssl});
    } else {
        ssl_nodes =  get(nodelist).nodes.filter(node => {return !node.ssl});
    }
  
    ssl_nodes = ssl_nodes.sort((a, b) => 0.5 - Math.random());

  
    let i = 0;
  
    while (i < ssl_nodes.length) {
  
  
      let this_node = ssl_nodes[i];
  
      let nodeURL = `${this_node.ssl ? 'https://' : 'http://'}${this_node.url}:${this_node.port}/info`;
      try {
        const resp = await fetch(nodeURL, {
          method: 'GET',
        }, 2000);
  
      if (resp.ok) {
  
        recommended_node = `${this_node.url}:${this_node.port}`;
        console.log("resp ok!", recommended_node)
        return recommended_node;
      }
    } catch (e) {
      console.log(e);
    }
    i++;
    }
    
    return false
  
    }

fetchNodes()
