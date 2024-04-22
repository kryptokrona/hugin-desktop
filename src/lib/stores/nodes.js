import { writable, get } from 'svelte/store'

// items
const uri = 'https://raw.githubusercontent.com/kryptokrona/kryptokrona-public-nodes/main/nodes.json'

export const nodelist = writable([])
const standard = {
    "nodes": [
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
            "url": "techy.ddns.net",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.1",
            "proxy_url": "TechyNode"
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
            "name": "Tifo",
            "url": "Tifo.info",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.00",
            "proxy_url": "tifo"
        },
        {
            "name": "DutchPool",
            "url": "kryptokrona.kalf.org",
            "port": 11898,
            "ssl": false,
            "cache": false,
            "version": "1.1.1",
            "fee": "0.1",
            "proxy_url": "DutchPool"
        }
    ],
    "apis": [
        {
            "url": "https://n1.vxo.nu",
            "name": "Växjö #1 Hugin API",
            "description": "Växjö #1 Hugin API hosted by Marcus Cvjeticanin"
        },
        {
            "url": "https://n2.vxo.nu",
            "name": "Växjö #2 Hugin API",
            "description": "Växjö #2 Hugin API hosted by Marcus Cvjeticanin"
        },
        {
            "url": "https://hugin-api.novastack.org",
            "name": "Novastack Hugin API",
            "description": "High Performance Hugin API Powered by Novastack Hosting"
        }
      ],
    "hugin": [
      {
          "name": "Växjö #1",
          "url": "n1.vxo.nu",
          "port": 443,
          "ssl": true,
          "tor": true
      },
      {
          "name": "Växjö #2",
          "url": "n2.vxo.nu",
          "port": 443,
          "ssl": true,
          "tor": true
      }
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
