import { sveltekit } from '@sveltejs/kit/vite'
import * as path from 'path'

/** @type {import("vite").UserConfig} */
const config = {
    plugins: [sveltekit()],
    optimizeDeps: {
        include: ['dayjs/plugin/relativeTime.js', "highlight.js", "highlight.js/lib/core"],
    },
    server: {
        fs: {
            allow: ['..'],
        },
    },
    resolve: {
        alias: {
            $routes: path.resolve('src/routes'),
        },
        preserveSymlinks: true
    },
    // root: '/',
}

export default config
