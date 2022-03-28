import { writable, } from 'svelte/store';

// items
const uri = 'https://raw.githubusercontent.com/kryptokrona/kryptokrona-nodes-list/master/nodes.json';

export const nodelist = writable([]);

const fetchNodes = async () => {
    const response = await fetch(uri);
    const result = await response.json();
    nodelist.set(result.nodes);
}

fetchNodes()

