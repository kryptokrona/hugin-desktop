import { writable } from 'svelte/store'

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
        nodelist.set(standard.nodes)
    }
    nodelist.set(result)
    } catch(e) {
        nodelist.set(standard.nodes)
    }
}

fetchNodes()
