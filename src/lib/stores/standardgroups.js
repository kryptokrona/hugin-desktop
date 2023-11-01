import { writable } from 'svelte/store'

export const standardGroups = writable([
    { name: 'Kryptokrona',     key: '33909fb89783fb15b5c2df50ff7107c112c3b232681f77814c024c909c07e932' },
    { name: 'Hugin',           key: '20b4821b90b2ea7355cb7ed7fa60823016eedef0e3541376888f8adc55df75f8' },
    { name: 'Support',         key: '345e8da2223971f1dc9ad39f2cd8b9d875256c9041ac9d7af793be2c137670ac' },
    { name: 'Programming',     key: '613d2331b9b4305a78275fbce193c3818948980cae43e86b53e85d55e01ad0d0' },
    { name: 'Gaming',          key: 'aab2b5493d95074e03090501a1cbc34955c29d4f0bfe5eed76445b2f049031b2' },
    { name: 'Cryptocurrency',  key: 'f28311919d9516831d79bc7ca68d108ba53f8432c639445e565cd2b1ecd70510' },
    { name: 'Privacy',         key: '437f28724fc65df4bb81d0ffd938871607ae0c2ea96cdb13d374c2f76630161a' },
    { name: 'Politics',        key: '8330283b1323038a6fb60165e1ef7fabb2ec60ae5dd5c66ab0fcc41511fd99fc' },
    { name: 'Sweden',          key: '08fcbb782f8c3304a0bcd5ab946f347de0514ec983f54536a47edd9753eaad47' },
    { name: 'Norway',          key: 'c70fb6179cecf1c3438d5789b2bac13e8231a97717ac0c16f9d0039a314dfb0c' },
    { name: 'Denmark',         key: '1ca321697271265b2ce80f4dd70632682915aef8fc6bbd8be0492673e9ffda72' },
    { name: 'Finland',         key: '6e0861b7e3bcb3c83040d6003f2cd407bb249959f5c6c0959ac1de4f91f6e756' },
])
